'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Loader2,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Truck,
} from 'lucide-react'
import { useApp } from '@/app/providers'
import {
  captureSupplierOrderAB,
  createDeliveryNote,
  createGoodsReceipt,
  createSupplierOrder,
  getSupplierOrder,
  linkSupplierDeliveryNoteToOrder,
  replaceSupplierOrderItems,
  syncSupplierOrderBucketFromProject,
} from '@/lib/supabase/services'
import { supabase } from '@/lib/supabase/client'
import {
  SUPPLIER_WORKFLOW_QUEUE_META,
  type SupplierWorkflowQueue,
} from '@/lib/orders/workflowQueue'
import { useOrderWorkflow, type OrderWorkflowRow } from './useOrderWorkflow'

type QueueStyle = {
  chipClass: string
  rowClass: string
  icon: React.ComponentType<{ className?: string }>
}

interface EditableOrderItem {
  localId: string
  invoiceItemId?: string
  articleId?: string
  description: string
  modelNumber: string
  manufacturer: string
  quantity: string
  unit: string
  expectedDeliveryDate: string
  notes: string
}

interface GoodsReceiptDraftItem {
  projectItemId: string
  description: string
  unit: string
  remainingQuantity: number
  receiveQuantity: string
}

const QUEUE_STYLES: Record<SupplierWorkflowQueue, QueueStyle> = {
  lieferant_fehlt: {
    chipClass: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
    rowClass: 'bg-fuchsia-50/30',
    icon: AlertTriangle,
  },
  brennt: {
    chipClass: 'border-red-200 bg-red-50 text-red-700',
    rowClass: 'bg-red-50/40',
    icon: AlertTriangle,
  },
  zu_bestellen: {
    chipClass: 'border-amber-200 bg-amber-50 text-amber-700',
    rowClass: 'bg-amber-50/30',
    icon: ClipboardCheck,
  },
  ab_fehlt: {
    chipClass: 'border-orange-200 bg-orange-50 text-orange-700',
    rowClass: 'bg-orange-50/30',
    icon: FileCheck2,
  },
  lieferschein_da: {
    chipClass: 'border-blue-200 bg-blue-50 text-blue-700',
    rowClass: 'bg-blue-50/30',
    icon: Truck,
  },
  wareneingang_offen: {
    chipClass: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    rowClass: 'bg-indigo-50/30',
    icon: PackageCheck,
  },
  montagebereit: {
    chipClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rowClass: 'bg-emerald-50/30',
    icon: CheckCircle2,
  },
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function formatDate(value?: string): string {
  if (!value) {
    return '—'
  }

  const normalized = value.includes('T') ? value.slice(0, 10) : value
  const parsed = new Date(`${normalized}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString('de-DE')
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function renderStep(label: string, done: boolean) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
        done
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-50 text-slate-500'
      }`}
    >
      {label}
    </span>
  )
}

function createEmptyEditableItem(): EditableOrderItem {
  return {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    description: '',
    modelNumber: '',
    manufacturer: '',
    quantity: '1',
    unit: 'Stk',
    expectedDeliveryDate: '',
    notes: '',
  }
}

function mapRowItemsToEditableItems(row: OrderWorkflowRow): EditableOrderItem[] {
  if (row.orderItems.length > 0) {
    return row.orderItems.map((item, index) => ({
      localId: `${item.id}-${index}`,
      invoiceItemId: item.invoiceItemId,
      articleId: item.articleId,
      description: item.description,
      modelNumber: item.modelNumber || '',
      manufacturer: item.manufacturer || '',
      quantity: String(item.quantity),
      unit: item.unit || 'Stk',
      expectedDeliveryDate: item.expectedDeliveryDate || '',
      notes: item.notes || '',
    }))
  }

  const source = row.kind === 'missing_supplier' ? row.unresolvedItems : row.projectItems
  return source.map((item, index) => ({
    localId: `${item.id}-${index}`,
    invoiceItemId: item.id,
    articleId: item.articleId,
    description: item.description,
    modelNumber: item.modelNumber || '',
    manufacturer: item.manufacturer || '',
    quantity: String(item.quantity),
    unit: item.unit || 'Stk',
    expectedDeliveryDate: '',
    notes: '',
  }))
}

async function uploadSupplierOrderDocument(
  supplierOrderId: string,
  kind: 'ab' | 'supplier_delivery_note',
  file: File,
): Promise<{ storagePath: string; fileName: string; mimeType: string | null }> {
  const formData = new FormData()
  formData.set('kind', kind)
  formData.set('file', file)

  const response = await fetch(`/api/supplier-orders/${supplierOrderId}/documents`, {
    method: 'POST',
    body: formData,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload?.success === false || !payload?.data?.storagePath) {
    throw new Error(payload?.error || 'Dokument konnte nicht hochgeladen werden.')
  }

  return {
    storagePath: String(payload.data.storagePath),
    fileName: String(payload.data.fileName || file.name || 'Dokument'),
    mimeType: payload.data.mimeType ? String(payload.data.mimeType) : null,
  }
}

export default function OrdersClient() {
  const { projects, refreshProjects } = useApp()
  const {
    rows,
    visibleRows,
    queueCounts,
    suppliers,
    activeQueue,
    setActiveQueue,
    search,
    setSearch,
    loading,
    error,
    refresh,
  } = useOrderWorkflow()

  const projectLookup = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])

  const [busyKey, setBusyKey] = useState<string | null>(null)

  const [editorRow, setEditorRow] = useState<OrderWorkflowRow | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorOrderId, setEditorOrderId] = useState<string | null>(null)
  const [editorProjectId, setEditorProjectId] = useState('')
  const [editorSupplierId, setEditorSupplierId] = useState('')
  const [editorItems, setEditorItems] = useState<EditableOrderItem[]>([])
  const [editorError, setEditorError] = useState<string | null>(null)

  const [abRow, setAbRow] = useState<OrderWorkflowRow | null>(null)
  const [abNumber, setAbNumber] = useState('')
  const [abConfirmedDate, setAbConfirmedDate] = useState('')
  const [abDeviation, setAbDeviation] = useState('')
  const [abNotes, setAbNotes] = useState('')
  const [abFile, setAbFile] = useState<File | null>(null)
  const [abError, setAbError] = useState<string | null>(null)

  const [deliveryRow, setDeliveryRow] = useState<OrderWorkflowRow | null>(null)
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState('')
  const [deliveryNoteDate, setDeliveryNoteDate] = useState('')
  const [deliveryNoteNotes, setDeliveryNoteNotes] = useState('')
  const [deliveryNoteFile, setDeliveryNoteFile] = useState<File | null>(null)
  const [deliveryError, setDeliveryError] = useState<string | null>(null)

  const [goodsReceiptRow, setGoodsReceiptRow] = useState<OrderWorkflowRow | null>(null)
  const [goodsReceiptItems, setGoodsReceiptItems] = useState<GoodsReceiptDraftItem[]>([])
  const [goodsReceiptError, setGoodsReceiptError] = useState<string | null>(null)

  const queueOrder = Object.keys(SUPPLIER_WORKFLOW_QUEUE_META) as SupplierWorkflowQueue[]

  const runAndRefresh = async (fn: () => Promise<void>) => {
    await fn()
    await Promise.all([refresh(), refreshProjects(true, true)])
  }

  const ensureOrderBucket = async (row: OrderWorkflowRow): Promise<string | null> => {
    if (row.orderId) {
      return row.orderId
    }

    if (row.kind !== 'supplier' || !row.supplierId) {
      return null
    }

    const result = await syncSupplierOrderBucketFromProject({
      projectId: row.projectId,
      supplierId: row.supplierId,
      createdByType: 'user',
      installationReferenceDate: row.installationDate,
    })

    if (!result.ok) {
      alert(result.message || 'Bestell-Bucket konnte nicht erstellt werden.')
      return null
    }

    return result.data.id
  }

  const openEditor = async (row?: OrderWorkflowRow) => {
    setEditorError(null)
    setEditorRow(row || null)

    if (!row) {
      setEditorOrderId(null)
      setEditorProjectId('')
      setEditorSupplierId('')
      setEditorItems([createEmptyEditableItem()])
      setEditorOpen(true)
      return
    }

    setEditorProjectId(row.projectId)
    setEditorSupplierId(row.supplierId || '')

    if (row.orderId) {
      const result = await getSupplierOrder(row.orderId)
      if (!result.ok) {
        setEditorError(result.message || 'Bestellung konnte nicht geladen werden.')
        return
      }

      setEditorOrderId(result.data.id)
      setEditorItems(mapRowItemsToEditableItems({ ...row, orderItems: result.data.items || [] }))
      setEditorOpen(true)
      return
    }

    setEditorOrderId(null)
    const initialItems = mapRowItemsToEditableItems(row)
    setEditorItems(initialItems.length > 0 ? initialItems : [createEmptyEditableItem()])
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditorError(null)
    setEditorRow(null)
  }

  const loadItemsFromProjectSupplier = async () => {
    if (!editorProjectId || !editorSupplierId) {
      setEditorError('Bitte Auftrag und Lieferant auswählen.')
      return
    }

    const { data, error: invoiceError } = await supabase
      .from('invoice_items')
      .select(
        `
        id,
        article_id,
        description,
        model_number,
        manufacturer,
        quantity,
        unit,
        articles (supplier_id)
      `,
      )
      .eq('project_id', editorProjectId)

    if (invoiceError) {
      setEditorError(invoiceError.message)
      return
    }

    const filtered = (data || []).filter((entry) => {
      const relation = entry.articles as { supplier_id: string | null } | { supplier_id: string | null }[] | null
      const supplierId = Array.isArray(relation) ? relation[0]?.supplier_id : relation?.supplier_id
      return supplierId === editorSupplierId
    })

    if (filtered.length === 0) {
      setEditorError('Keine Positionen mit diesem Lieferanten im Auftrag gefunden.')
      return
    }

    const mapped: EditableOrderItem[] = filtered.map((item, index) => ({
      localId: `${item.id}-${index}`,
      invoiceItemId: item.id,
      articleId: item.article_id || undefined,
      description: item.description || '',
      modelNumber: item.model_number || '',
      manufacturer: item.manufacturer || '',
      quantity: String(Math.max(1, toNumber(item.quantity))),
      unit: item.unit || 'Stk',
      expectedDeliveryDate: '',
      notes: '',
    }))

    setEditorItems(mapped)
    setEditorError(null)
  }

  const saveEditor = async () => {
    const normalizedProjectId = editorProjectId.trim()
    const normalizedSupplierId = editorSupplierId.trim()

    if (!normalizedProjectId || !normalizedSupplierId) {
      setEditorError('Auftrag und Lieferant sind erforderlich.')
      return
    }

    const cleanedItems = editorItems
      .map((item, index) => ({
        ...item,
        positionNumber: index + 1,
        quantityValue: Math.max(0, toNumber(item.quantity)),
      }))
      .filter((item) => item.description.trim().length > 0 && item.quantityValue > 0)

    if (cleanedItems.length === 0) {
      setEditorError('Mindestens eine Position mit Menge > 0 ist erforderlich.')
      return
    }

    const payloadItems = cleanedItems.map((item) => ({
      invoiceItemId: item.invoiceItemId,
      articleId: item.articleId,
      positionNumber: item.positionNumber,
      description: item.description.trim(),
      modelNumber: item.modelNumber.trim() || undefined,
      manufacturer: item.manufacturer.trim() || undefined,
      quantity: item.quantityValue,
      unit: item.unit.trim() || 'Stk',
      expectedDeliveryDate: item.expectedDeliveryDate || undefined,
      notes: item.notes.trim() || undefined,
    }))

    const busyId = `editor-save`
    setBusyKey(busyId)
    setEditorError(null)

    try {
      await runAndRefresh(async () => {
        if (editorOrderId) {
          const updateResult = await replaceSupplierOrderItems(editorOrderId, payloadItems)
          if (!updateResult.ok) {
            throw new Error(updateResult.message || 'Bestellung konnte nicht gespeichert werden.')
          }
          return
        }

        const existingRow = rows.find(
          (row) =>
            row.kind === 'supplier' &&
            row.projectId === normalizedProjectId &&
            row.supplierId === normalizedSupplierId &&
            row.orderId,
        )

        if (existingRow?.orderId) {
          const existingOrderResult = await getSupplierOrder(existingRow.orderId)
          if (!existingOrderResult.ok) {
            throw new Error(existingOrderResult.message || 'Bestehende Bestellung konnte nicht geladen werden.')
          }

          const mergedItems = [...(existingOrderResult.data.items || []), ...payloadItems].map((item, index) => ({
            ...item,
            positionNumber: index + 1,
          }))

          const mergedResult = await replaceSupplierOrderItems(existingRow.orderId, mergedItems)
          if (!mergedResult.ok) {
            throw new Error(mergedResult.message || 'Bestellung konnte nicht gespeichert werden.')
          }
          return
        }

        const createResult = await createSupplierOrder({
          projectId: normalizedProjectId,
          supplierId: normalizedSupplierId,
          status: 'draft',
          createdByType: 'user',
          installationReferenceDate: projectLookup.get(normalizedProjectId)?.installationDate,
          items: payloadItems,
        })

        if (!createResult.ok) {
          throw new Error(createResult.message || 'Bestellung konnte nicht erstellt werden.')
        }
      })

      closeEditor()
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : 'Bestellung konnte nicht gespeichert werden.'
      setEditorError(message)
    } finally {
      setBusyKey(null)
    }
  }

  const handleSendOrder = async (row: OrderWorkflowRow) => {
    const busyId = `send:${row.key}`
    setBusyKey(busyId)

    try {
      let recipient = (row.supplierOrderEmail || '').trim()
      if (!recipient) {
        const manual = window.prompt('Empfänger-E-Mail für Bestellung', '')
        recipient = (manual || '').trim()
      }

      if (!recipient) {
        return
      }

      if (!window.confirm(`Darf ich an ${recipient} senden?`)) {
        return
      }

      await runAndRefresh(async () => {
        const orderId = await ensureOrderBucket(row)
        if (!orderId) {
          throw new Error('Bestellung konnte nicht vorbereitet werden.')
        }

        const stableIdempotencyKey = `manual-${orderId}-${recipient.toLowerCase()}-${row.sentAt || 'initial'}`
        const response = await fetch(`/api/supplier-orders/${orderId}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toEmail: recipient,
            idempotencyKey: stableIdempotencyKey,
          }),
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.error || 'Bestellung konnte nicht versendet werden.')
        }
      })
    } catch (sendError) {
      const message =
        sendError instanceof Error ? sendError.message : 'Bestellung konnte nicht versendet werden.'
      alert(message)
    } finally {
      setBusyKey(null)
    }
  }

  const openAbDialog = (row: OrderWorkflowRow) => {
    if (!row.orderId) {
      return
    }

    setAbRow(row)
    setAbNumber(row.abNumber || '')
    setAbConfirmedDate(row.abConfirmedDeliveryDate || '')
    setAbDeviation('')
    setAbNotes('')
    setAbFile(null)
    setAbError(null)
  }

  const closeAbDialog = () => {
    setAbRow(null)
    setAbError(null)
  }

  const submitAbDialog = async () => {
    if (!abRow?.orderId) {
      return
    }

    if (!abNumber.trim()) {
      setAbError('AB-Nummer ist erforderlich.')
      return
    }

    const busyId = `ab:${abRow.key}`
    setBusyKey(busyId)
    setAbError(null)

    try {
      const deviations = abDeviation.trim()
        ? [{ field: 'general', note: abDeviation.trim() }]
        : []

      await runAndRefresh(async () => {
        const captureResult = await captureSupplierOrderAB(abRow.orderId!, {
          abNumber: abNumber.trim(),
          confirmedDeliveryDate: abConfirmedDate || undefined,
          deviations,
          notes: abNotes.trim() || undefined,
        })

        if (!captureResult.ok) {
          throw new Error(captureResult.message || 'AB konnte nicht gespeichert werden.')
        }

        if (abFile) {
          await uploadSupplierOrderDocument(abRow.orderId!, 'ab', abFile)
        }
      })

      closeAbDialog()
    } catch (captureError) {
      const message =
        captureError instanceof Error ? captureError.message : 'AB konnte nicht gespeichert werden.'
      setAbError(message)
    } finally {
      setBusyKey(null)
    }
  }

  const openDeliveryNoteDialog = (row: OrderWorkflowRow) => {
    if (!row.orderId || row.kind !== 'supplier') {
      return
    }

    setDeliveryRow(row)
    setDeliveryNoteNumber('')
    setDeliveryNoteDate(new Date().toISOString().slice(0, 10))
    setDeliveryNoteNotes('')
    setDeliveryNoteFile(null)
    setDeliveryError(null)
  }

  const closeDeliveryNoteDialog = () => {
    setDeliveryRow(null)
    setDeliveryError(null)
  }

  const submitDeliveryNoteDialog = async () => {
    if (!deliveryRow?.orderId || deliveryRow.kind !== 'supplier') {
      return
    }

    if (!deliveryNoteNumber.trim()) {
      setDeliveryError('Lieferscheinnummer ist erforderlich.')
      return
    }

    if (!deliveryNoteDate) {
      setDeliveryError('Lieferscheindatum ist erforderlich.')
      return
    }

    const busyId = `delivery:${deliveryRow.key}`
    setBusyKey(busyId)
    setDeliveryError(null)

    try {
      await runAndRefresh(async () => {
        let documentUrl: string | undefined
        if (deliveryNoteFile) {
          const uploadResult = await uploadSupplierOrderDocument(
            deliveryRow.orderId!,
            'supplier_delivery_note',
            deliveryNoteFile,
          )
          documentUrl = uploadResult.storagePath
        }

        const noteResult = await createDeliveryNote({
          supplierName: deliveryRow.supplierName,
          supplierDeliveryNoteNumber: deliveryNoteNumber.trim(),
          deliveryDate: deliveryNoteDate,
          receivedDate: new Date().toISOString(),
          status: 'matched',
          aiMatched: false,
          matchedProjectId: deliveryRow.projectId,
          supplierOrderId: deliveryRow.orderId,
          documentUrl,
          notes: deliveryNoteNotes.trim() || undefined,
        })

        if (!noteResult.ok) {
          throw new Error(noteResult.message || 'Lieferschein konnte nicht erfasst werden.')
        }

        const linkResult = await linkSupplierDeliveryNoteToOrder(deliveryRow.orderId!, noteResult.data.id)
        if (!linkResult.ok) {
          throw new Error(linkResult.message || 'Lieferschein konnte nicht mit Bestellung verknüpft werden.')
        }
      })

      closeDeliveryNoteDialog()
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Lieferschein konnte nicht erfasst werden.'
      setDeliveryError(message)
    } finally {
      setBusyKey(null)
    }
  }

  const openGoodsReceiptDialog = (row: OrderWorkflowRow) => {
    if (!row.orderId || row.kind !== 'supplier') {
      return
    }

    const candidateItems = row.projectItems
      .map((item) => ({
        projectItemId: item.id,
        description: item.description,
        unit: item.unit || 'Stk',
        remainingQuantity: Math.max(0, item.quantity - item.quantityDelivered),
      }))
      .filter((item) => item.remainingQuantity > 0 && UUID_PATTERN.test(item.projectItemId))

    if (candidateItems.length === 0) {
      alert(
        'Für diesen Auftrag sind keine offenen, auftragszugeordneten Wareneingangspositionen vorhanden.',
      )
      return
    }

    setGoodsReceiptRow(row)
    setGoodsReceiptItems(
      candidateItems.map((item) => ({
        ...item,
        receiveQuantity: String(item.remainingQuantity),
      })),
    )
    setGoodsReceiptError(null)
  }

  const closeGoodsReceiptDialog = () => {
    setGoodsReceiptRow(null)
    setGoodsReceiptError(null)
  }

  const submitGoodsReceiptDialog = async () => {
    if (!goodsReceiptRow?.orderId || goodsReceiptRow.kind !== 'supplier') {
      return
    }

    const itemsToBook = goodsReceiptItems
      .map((item) => ({
        ...item,
        receiveQuantityNumber: Math.max(0, toNumber(item.receiveQuantity)),
      }))
      .filter((item) => item.receiveQuantityNumber > 0)

    if (itemsToBook.length === 0) {
      setGoodsReceiptError('Bitte mindestens eine Position mit Menge > 0 buchen.')
      return
    }

    const busyId = `we:${goodsReceiptRow.key}`
    setBusyKey(busyId)
    setGoodsReceiptError(null)

    try {
      await runAndRefresh(async () => {
        const receiptType = itemsToBook.every(
          (item) => item.receiveQuantityNumber >= item.remainingQuantity,
        )
          ? 'complete'
          : 'partial'

        const idempotencyKey = `we-${goodsReceiptRow.orderId}-${itemsToBook
          .map((item) => `${item.projectItemId}:${item.receiveQuantityNumber}`)
          .sort()
          .join('|')}`

        const result = await createGoodsReceipt({
          projectId: goodsReceiptRow.projectId,
          supplierOrderId: goodsReceiptRow.orderId,
          receiptDate: new Date().toISOString(),
          receiptType,
          status: 'booked',
          idempotencyKey,
          items: itemsToBook.map((item) => ({
            projectItemId: item.projectItemId,
            quantityReceived: item.receiveQuantityNumber,
            quantityExpected: item.remainingQuantity,
            status: 'received',
          })),
        })

        if (!result.ok) {
          throw new Error(result.message || 'Wareneingang konnte nicht gebucht werden.')
        }
      })

      closeGoodsReceiptDialog()
    } catch (bookError) {
      const message =
        bookError instanceof Error ? bookError.message : 'Wareneingang konnte nicht gebucht werden.'
      setGoodsReceiptError(message)
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Bestellungen</h1>
          <p className="mt-1 text-sm text-slate-600">
            Linearer Ablauf pro Lieferant und Auftrag: Bestellung, AB, Lieferanten-Lieferschein,
            Wareneingang, Montage-Readiness.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEditor()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" /> Bestellung anlegen
          </button>
          <button
            type="button"
            onClick={() => refresh()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {queueOrder.map((queue) => {
          const meta = SUPPLIER_WORKFLOW_QUEUE_META[queue]
          const style = QUEUE_STYLES[queue]
          return (
            <button
              key={queue}
              type="button"
              onClick={() => setActiveQueue(queue)}
              className={`rounded-xl border px-3 py-3 text-left transition-all ${
                activeQueue === queue
                  ? `${style.chipClass} shadow-md`
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest">{meta.label}</p>
              <p className="mt-1 text-2xl font-black">{queueCounts[queue]}</p>
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Suche nach Auftrag, Kunde, Lieferant, Bestellnummer oder AB"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
          />
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Queue
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Auftrag + Lieferant
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Ablauf
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Terminlage
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Nächste Aktion
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center">
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Bestell-Queues werden geladen
                    </div>
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm font-semibold text-red-700">
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && visibleRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm font-semibold text-slate-600">
                    Keine Einträge in „{SUPPLIER_WORKFLOW_QUEUE_META[activeQueue].label}“.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                visibleRows.map((row) => {
                  const style = QUEUE_STYLES[row.queue]
                  const QueueIcon = style.icon

                  const orderSent =
                    Boolean(row.sentAt) ||
                    (row.orderStatus &&
                      [
                        'sent',
                        'ab_received',
                        'delivery_note_received',
                        'goods_receipt_open',
                        'goods_receipt_booked',
                        'ready_for_installation',
                      ].includes(row.orderStatus))
                  const hasAB = Boolean(row.abReceivedAt || row.abNumber || row.abConfirmedDeliveryDate)
                  const hasDeliveryNote = Boolean(row.supplierDeliveryNoteId)
                  const hasGoodsReceipt = Boolean(row.goodsReceiptId || row.bookedAt)
                  const isBusy = Boolean(
                    busyKey &&
                      [
                        `send:${row.key}`,
                        `ab:${row.key}`,
                        `delivery:${row.key}`,
                        `we:${row.key}`,
                        'editor-save',
                      ].includes(busyKey),
                  )

                  return (
                    <tr
                      key={row.key}
                      className={row.queue === 'brennt' || row.queue === 'lieferant_fehlt' ? style.rowClass : undefined}
                    >
                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${style.chipClass}`}
                        >
                          <QueueIcon className="h-3.5 w-3.5" />
                          {row.queueLabel}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="text-sm font-black text-slate-900">#{row.projectOrderNumber}</p>
                        <p className="text-sm text-slate-700">{row.customerName}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{row.supplierName}</p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Bestellnummer: {row.supplierOrderNumber || 'noch nicht erzeugt'}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap gap-1.5">
                          {renderStep('Bestellung', row.kind === 'missing_supplier' ? false : Boolean(orderSent))}
                          {renderStep('AB', row.kind === 'missing_supplier' ? false : hasAB)}
                          {renderStep('Lieferschein', row.kind === 'missing_supplier' ? false : hasDeliveryNote)}
                          {renderStep('Wareneingang', row.kind === 'missing_supplier' ? false : hasGoodsReceipt)}
                          {renderStep('Montage', row.queue === 'montagebereit')}
                        </div>
                        <p className="mt-2 text-[11px] text-slate-600">
                          Positionen: {row.totalItems} · offen Bestellung {row.openOrderItems} · offen WE{' '}
                          {row.openDeliveryItems}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1 text-xs text-slate-700">
                          <p className="inline-flex items-center gap-1.5 font-semibold">
                            <CalendarClock className="h-3.5 w-3.5 text-slate-500" />
                            Montage: {formatDate(row.installationDate)}
                            {typeof row.daysUntilInstallation === 'number' && (
                              <span className="text-slate-500">({row.daysUntilInstallation} Tage)</span>
                            )}
                          </p>
                          <p>AB-Termin: {formatDate(row.abConfirmedDeliveryDate)}</p>
                          <p>
                            AB vs. WE:{' '}
                            {row.abTimingStatus === 'late'
                              ? 'verspätet'
                              : row.abTimingStatus === 'on_time'
                                ? 'pünktlich'
                                : 'offen'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="text-xs font-semibold text-slate-700">{row.nextAction}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditor(row)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Positionen
                          </button>

                          {row.kind === 'supplier' && row.queue === 'zu_bestellen' && (
                            <button
                              type="button"
                              onClick={() => handleSendOrder(row)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isBusy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                              Senden
                            </button>
                          )}

                          {row.kind === 'supplier' && row.orderId && !hasAB && (
                            <button
                              type="button"
                              onClick={() => openAbDialog(row)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-orange-700 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              AB erfassen
                            </button>
                          )}

                          {row.kind === 'supplier' && row.orderId && hasAB && !hasDeliveryNote && (
                            <button
                              type="button"
                              onClick={() => openDeliveryNoteDialog(row)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Lieferschein
                            </button>
                          )}

                          {row.kind === 'supplier' && row.orderId && hasDeliveryNote && row.openDeliveryItems > 0 && (
                            <button
                              type="button"
                              onClick={() => openGoodsReceiptDialog(row)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Wareneingang
                            </button>
                          )}

                          <Link
                            href={`/projects?projectId=${row.projectId}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50"
                          >
                            Auftrag
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-black text-slate-900">Bestellung bearbeiten</h2>
            <p className="mt-1 text-sm text-slate-600">Auftrag, Lieferant und Positionen direkt in Bestellungen pflegen.</p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                Auftrag
                <select
                  value={editorProjectId}
                  onChange={(event) => setEditorProjectId(event.target.value)}
                  disabled={Boolean(editorRow)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-50"
                >
                  <option value="">Bitte wählen</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      #{project.orderNumber} · {project.customerName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                Lieferant
                <select
                  value={editorSupplierId}
                  onChange={(event) => setEditorSupplierId(event.target.value)}
                  disabled={editorRow?.kind === 'supplier'}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-50"
                >
                  <option value="">Bitte wählen</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {!editorRow && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={loadItemsFromProjectSupplier}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Positionen aus Auftrag laden
                </button>
              </div>
            )}

            <div className="mt-4 max-h-80 overflow-y-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Beschreibung</th>
                    <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Menge</th>
                    <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Einheit</th>
                    <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Termin</th>
                    <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {editorItems.map((item) => (
                    <tr key={item.localId}>
                      <td className="px-3 py-2">
                        <input
                          value={item.description}
                          onChange={(event) =>
                            setEditorItems((prev) =>
                              prev.map((entry) =>
                                entry.localId === item.localId
                                  ? { ...entry, description: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={item.quantity}
                          onChange={(event) =>
                            setEditorItems((prev) =>
                              prev.map((entry) =>
                                entry.localId === item.localId
                                  ? { ...entry, quantity: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                          className="w-24 rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={item.unit}
                          onChange={(event) =>
                            setEditorItems((prev) =>
                              prev.map((entry) =>
                                entry.localId === item.localId
                                  ? { ...entry, unit: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                          className="w-20 rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          value={item.expectedDeliveryDate}
                          onChange={(event) =>
                            setEditorItems((prev) =>
                              prev.map((entry) =>
                                entry.localId === item.localId
                                  ? { ...entry, expectedDeliveryDate: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setEditorItems((prev) =>
                              prev.length === 1 ? prev : prev.filter((entry) => entry.localId !== item.localId),
                            )
                          }
                          className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50"
                        >
                          Entfernen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={() => setEditorItems((prev) => [...prev, createEmptyEditableItem()])}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50"
              >
                Position hinzufügen
              </button>
            </div>

            {editorError && <p className="mt-3 text-sm font-semibold text-red-700">{editorError}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={saveEditor}
                disabled={busyKey === 'editor-save'}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyKey === 'editor-save' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {abRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-black text-slate-900">AB erfassen</h2>
            <p className="mt-1 text-sm text-slate-600">
              {abRow.supplierName} · Auftrag #{abRow.projectOrderNumber}
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                AB-Nummer
                <input
                  value={abNumber}
                  onChange={(event) => setAbNumber(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-400"
                />
              </label>
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                bestätigter Liefertermin
                <input
                  type="date"
                  value={abConfirmedDate}
                  onChange={(event) => setAbConfirmedDate(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-400"
                />
              </label>
            </div>

            <label className="mt-3 block text-xs font-black uppercase tracking-widest text-slate-500">
              Abweichungen
              <textarea
                value={abDeviation}
                onChange={(event) => setAbDeviation(event.target.value)}
                rows={3}
                placeholder="z. B. Mengenabweichung Position 4"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-400"
              />
            </label>

            <label className="mt-3 block text-xs font-black uppercase tracking-widest text-slate-500">
              Notiz
              <textarea
                value={abNotes}
                onChange={(event) => setAbNotes(event.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-400"
              />
            </label>

            <label className="mt-3 block text-xs font-black uppercase tracking-widest text-slate-500">
              AB-Dokument (optional)
              <input
                type="file"
                onChange={(event) => setAbFile(event.target.files?.[0] || null)}
                className="mt-1 block w-full text-sm text-slate-700"
              />
            </label>

            {abError && <p className="mt-3 text-sm font-semibold text-red-700">{abError}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeAbDialog}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={submitAbDialog}
                disabled={busyKey === `ab:${abRow.key}`}
                className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-orange-700 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyKey === `ab:${abRow.key}` && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {deliveryRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-black text-slate-900">Lieferanten-Lieferschein erfassen</h2>
            <p className="mt-1 text-sm text-slate-600">
              {deliveryRow.supplierName} · Auftrag #{deliveryRow.projectOrderNumber}
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                Lieferscheinnummer
                <input
                  value={deliveryNoteNumber}
                  onChange={(event) => setDeliveryNoteNumber(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-400"
                />
              </label>
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                Lieferscheindatum
                <input
                  type="date"
                  value={deliveryNoteDate}
                  onChange={(event) => setDeliveryNoteDate(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-400"
                />
              </label>
            </div>

            <label className="mt-3 block text-xs font-black uppercase tracking-widest text-slate-500">
              Notiz
              <textarea
                value={deliveryNoteNotes}
                onChange={(event) => setDeliveryNoteNotes(event.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-400"
              />
            </label>

            <label className="mt-3 block text-xs font-black uppercase tracking-widest text-slate-500">
              Lieferschein-Dokument (optional)
              <input
                type="file"
                onChange={(event) => setDeliveryNoteFile(event.target.files?.[0] || null)}
                className="mt-1 block w-full text-sm text-slate-700"
              />
            </label>

            {deliveryError && <p className="mt-3 text-sm font-semibold text-red-700">{deliveryError}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeliveryNoteDialog}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={submitDeliveryNoteDialog}
                disabled={busyKey === `delivery:${deliveryRow.key}`}
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyKey === `delivery:${deliveryRow.key}` && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {goodsReceiptRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-black text-slate-900">Wareneingang buchen</h2>
            <p className="mt-1 text-sm text-slate-600">
              {goodsReceiptRow.supplierName} · Auftrag #{goodsReceiptRow.projectOrderNumber}
            </p>

            <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Position</th>
                    <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Offen</th>
                    <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Buchen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {goodsReceiptItems.map((item) => (
                    <tr key={item.projectItemId}>
                      <td className="px-3 py-2 text-sm text-slate-800">{item.description}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-700">
                        {item.remainingQuantity} {item.unit}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={item.receiveQuantity}
                          onChange={(event) =>
                            setGoodsReceiptItems((prev) =>
                              prev.map((entry) =>
                                entry.projectItemId === item.projectItemId
                                  ? { ...entry, receiveQuantity: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                          className="w-24 rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {goodsReceiptError && <p className="mt-3 text-sm font-semibold text-red-700">{goodsReceiptError}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeGoodsReceiptDialog}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={submitGoodsReceiptDialog}
                disabled={busyKey === `we:${goodsReceiptRow.key}`}
                className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyKey === `we:${goodsReceiptRow.key}` && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Buchen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
