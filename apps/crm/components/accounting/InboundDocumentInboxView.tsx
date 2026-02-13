'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, RefreshCw, Send, XCircle } from 'lucide-react'
import { useInboundDocumentInbox } from '@/hooks/useInboundDocumentInbox'
import type { CustomerProject, SupplierOrder } from '@/types'
import type { InboundDocumentKind } from '@/components/accounting/inboundInbox.types'
import {
  formatConfidence,
  formatDate,
  formatDateTime,
  formatFileSize,
  INBOUND_KIND_LABELS,
  INBOUND_STATUS_LABELS,
  parseInboundCandidates,
  parseInboundSignals,
  toKind,
  toStatus,
} from '@/components/accounting/inboundInbox.utils'

interface InboundDocumentInboxViewProps {
  projects: CustomerProject[]
}

interface InboundDraft {
  kind: InboundDocumentKind
  supplierOrderId: string
  projectId: string
  supplierInvoiceId: string
  abNumber: string
  confirmedDeliveryDate: string
  supplierName: string
  deliveryNoteNumber: string
  deliveryDate: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  netAmount: string
  taxRate: string
  category: string
  notes: string
  rejectReason: string
}

interface UiMessage {
  tone: 'success' | 'error'
  text: string
}

function createDraft(item: ReturnType<typeof useInboundDocumentInbox>['selectedItem']): InboundDraft | null {
  if (!item) {
    return null
  }

  const signals = parseInboundSignals(item)
  const kind = toKind(signals.kind || item.document_kind)

  return {
    kind,
    supplierOrderId: item.assigned_supplier_order_id || '',
    projectId: item.assigned_project_id || '',
    supplierInvoiceId: item.assigned_supplier_invoice_id || '',
    abNumber: signals.abNumber || '',
    confirmedDeliveryDate: signals.confirmedDeliveryDate || '',
    supplierName: signals.supplierName || item.sender_name || item.sender_email || '',
    deliveryNoteNumber: signals.deliveryNoteNumber || '',
    deliveryDate: signals.deliveryDate || '',
    invoiceNumber: signals.invoiceNumber || '',
    invoiceDate: signals.invoiceDate || '',
    dueDate: signals.dueDate || '',
    netAmount: signals.netAmount ? String(signals.netAmount) : '',
    taxRate: signals.taxRate ? String(signals.taxRate) : '20',
    category: signals.category || 'material',
    notes: '',
    rejectReason: item.rejected_reason || '',
  }
}

function statusClass(status: string): string {
  switch (toStatus(status)) {
    case 'confirmed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'rejected':
      return 'border-rose-200 bg-rose-50 text-rose-700'
    case 'failed':
      return 'border-rose-200 bg-rose-50 text-rose-700'
    case 'preassigned':
      return 'border-blue-200 bg-blue-50 text-blue-700'
    case 'needs_review':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700'
  }
}

function buildOrderLabel(order: SupplierOrder): string {
  const parts = [order.orderNumber]
  if (order.projectOrderNumber) {
    parts.push(`Projekt ${order.projectOrderNumber}`)
  }
  if (order.supplierName) {
    parts.push(order.supplierName)
  }
  return parts.join(' | ')
}

function parseDecimalInput(value: string): number | undefined {
  const normalized = value.trim().replace(',', '.')
  if (!normalized) {
    return undefined
  }
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

function buildConfirmPayload(draft: InboundDraft): Record<string, unknown> {
  if (draft.kind === 'ab') {
    return {
      kind: 'ab',
      supplierOrderId: draft.supplierOrderId || undefined,
      abNumber: draft.abNumber || undefined,
      confirmedDeliveryDate: draft.confirmedDeliveryDate || undefined,
      notes: draft.notes || undefined,
    }
  }

  if (draft.kind === 'supplier_delivery_note') {
    return {
      kind: 'supplier_delivery_note',
      supplierOrderId: draft.supplierOrderId || undefined,
      projectId: draft.projectId || undefined,
      supplierName: draft.supplierName || undefined,
      deliveryNoteNumber: draft.deliveryNoteNumber || undefined,
      deliveryDate: draft.deliveryDate || undefined,
      notes: draft.notes || undefined,
    }
  }

  if (draft.kind === 'supplier_invoice') {
    const netAmount = parseDecimalInput(draft.netAmount)
    const taxRate = parseDecimalInput(draft.taxRate)

    return {
      kind: 'supplier_invoice',
      projectId: draft.projectId || undefined,
      supplierName: draft.supplierName || undefined,
      invoiceNumber: draft.invoiceNumber || undefined,
      invoiceDate: draft.invoiceDate || undefined,
      dueDate: draft.dueDate || undefined,
      netAmount: typeof netAmount === 'number' ? netAmount : undefined,
      taxRate: typeof taxRate === 'number' ? taxRate : undefined,
      category: draft.category || undefined,
      notes: draft.notes || undefined,
    }
  }

  return {
    kind: 'unknown',
    notes: draft.notes || undefined,
  }
}

export default function InboundDocumentInboxView({ projects }: InboundDocumentInboxViewProps) {
  const {
    items,
    loading,
    error,
    selectedId,
    setSelectedId,
    selectedItem,
    statusPreset,
    setStatusPreset,
    kindFilter,
    setKindFilter,
    refresh,
    supplierOrders,
    supplierOrdersError,
    actionItemId,
    confirmItem,
    reassignItem,
    rejectItem,
  } = useInboundDocumentInbox()

  // Reset draft when selectedItem changes; use queueMicrotask to avoid synchronous setState in effect
  const [draft, setDraft] = useState<InboundDraft | null>(() => createDraft(selectedItem))
  const [message, setMessage] = useState<UiMessage | null>(null)

  useEffect(() => {
    queueMicrotask(() => {
      setDraft(createDraft(selectedItem))
      setMessage(null)
    })
  }, [selectedItem])

  const projectOptions = useMemo(
    () => [...projects].sort((left, right) => left.orderNumber.localeCompare(right.orderNumber)),
    [projects],
  )

  const signals = useMemo(() => parseInboundSignals(selectedItem), [selectedItem])
  const candidates = useMemo(
    () => parseInboundCandidates(selectedItem?.assignment_candidates),
    [selectedItem?.assignment_candidates],
  )

  const orderOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string; projectId?: string }>()

    supplierOrders.forEach((order) => {
      map.set(order.id, {
        id: order.id,
        label: buildOrderLabel(order),
        projectId: order.projectId,
      })
    })

    candidates.forEach((candidate) => {
      if (map.has(candidate.orderId)) {
        return
      }

      const labelParts = [candidate.orderNumber || candidate.orderId]
      if (candidate.projectOrderNumber) {
        labelParts.push(`Projekt ${candidate.projectOrderNumber}`)
      }
      if (candidate.supplierName) {
        labelParts.push(candidate.supplierName)
      }

      map.set(candidate.orderId, {
        id: candidate.orderId,
        label: `${labelParts.join(' | ')} (Vorschlag)`,
        projectId: candidate.projectId || undefined,
      })
    })

    return Array.from(map.values()).sort((left, right) => left.label.localeCompare(right.label))
  }, [candidates, supplierOrders])

  const counts = useMemo(() => {
    return items.reduce(
      (accumulator, item) => {
        const normalized = toStatus(item.processing_status)
        accumulator.total += 1
        if (normalized === 'needs_review' || normalized === 'preassigned' || normalized === 'failed') {
          accumulator.review += 1
        }
        if (normalized === 'confirmed') {
          accumulator.confirmed += 1
        }
        if (normalized === 'rejected') {
          accumulator.rejected += 1
        }
        return accumulator
      },
      { total: 0, review: 0, confirmed: 0, rejected: 0 },
    )
  }, [items])

  const busy = actionItemId && selectedItem?.id === actionItemId

  const canConfirm = useMemo(() => {
    if (!draft) {
      return false
    }

    if (draft.kind === 'ab') {
      return draft.supplierOrderId.trim().length > 0
    }

    if (draft.kind === 'supplier_delivery_note') {
      return draft.projectId.trim().length > 0
    }

    if (draft.kind === 'supplier_invoice') {
      const netAmount = parseDecimalInput(draft.netAmount)
      return draft.invoiceNumber.trim().length > 0 && typeof netAmount === 'number' && netAmount > 0
    }

    return false
  }, [draft])

  function setField<K extends keyof InboundDraft>(key: K, value: InboundDraft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current))
  }

  async function handleReassign() {
    if (!selectedItem || !draft) {
      return
    }

    const confidence = selectedItem.assignment_confidence ?? 0.7
    const response = await reassignItem(selectedItem.id, {
      supplierOrderId: draft.supplierOrderId || null,
      projectId: draft.projectId || null,
      supplierInvoiceId: draft.supplierInvoiceId || null,
      confidence,
    })

    if (response.ok) {
      setMessage({
        tone: 'success',
        text: response.message || 'Vorzuweisung wurde gespeichert.',
      })
      return
    }

    setMessage({
      tone: 'error',
      text: response.message || 'Vorzuweisung fehlgeschlagen.',
    })
  }

  async function handleConfirm() {
    if (!selectedItem || !draft) {
      return
    }

    const response = await confirmItem(selectedItem.id, buildConfirmPayload(draft))
    if (response.ok) {
      setMessage({
        tone: 'success',
        text: response.message || 'Dokument wurde bestätigt und gebucht.',
      })
      return
    }

    setMessage({
      tone: 'error',
      text: response.message || 'Bestätigung fehlgeschlagen.',
    })
  }

  async function handleReject() {
    if (!selectedItem || !draft) {
      return
    }

    const response = await rejectItem(selectedItem.id, {
      reason: draft.rejectReason || undefined,
    })
    if (response.ok) {
      setMessage({
        tone: 'success',
        text: response.message || 'Dokument wurde abgelehnt.',
      })
      return
    }

    setMessage({
      tone: 'error',
      text: response.message || 'Ablehnen fehlgeschlagen.',
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Inbox gesamt</p>
          <p className="text-3xl font-black text-slate-900">{counts.total}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-amber-700">Zu prüfen</p>
          <p className="text-3xl font-black text-amber-800">{counts.review}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Bestätigt</p>
          <p className="text-3xl font-black text-emerald-800">{counts.confirmed}</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-rose-700">Abgelehnt</p>
          <p className="text-3xl font-black text-rose-800">{counts.rejected}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(320px,1fr)_minmax(0,1.3fr)]">
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-black text-slate-900">Offene Lieferanten-Dokumente</h3>
            <button
              onClick={() => {
                void refresh()
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Neu laden
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Status
              </label>
              <select
                value={statusPreset}
                onChange={(event) => setStatusPreset(event.target.value as 'open' | 'review' | 'done' | 'all')}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="open">Offen</option>
                <option value="review">Prüfen</option>
                <option value="done">Abgeschlossen</option>
                <option value="all">Alle</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Typ</label>
              <select
                value={kindFilter}
                onChange={(event) => setKindFilter(event.target.value as InboundDocumentKind | 'all')}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="all">Alle</option>
                <option value="ab">AB</option>
                <option value="supplier_delivery_note">Lieferschein</option>
                <option value="supplier_invoice">Eingangsrechnung</option>
                <option value="unknown">Unbekannt</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}

          <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
            {loading && items.length === 0 ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
              </div>
            ) : null}

            {!loading && items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Keine Inbox-Einträge für den aktuellen Filter.
              </div>
            ) : null}

            {items.map((item) => {
              const kind = toKind(item.document_kind)
              const status = toStatus(item.processing_status)
              const active = selectedId === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    active ? 'border-amber-400 bg-amber-50/40 shadow-sm' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <p className="truncate text-sm font-bold text-slate-900">{item.file_name}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${statusClass(status)}`}>
                      {INBOUND_STATUS_LABELS[status]}
                    </span>
                  </div>
                  <p className="truncate text-sm text-slate-600">{item.subject || 'Ohne Betreff'}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {INBOUND_KIND_LABELS[kind]} | {formatDateTime(item.received_at)}
                  </p>
                </button>
              )
            })}
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          {!selectedItem || !draft ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm text-slate-500">
              Bitte links ein Dokument auswählen.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-slate-900">{selectedItem.file_name}</h3>
                  <p className="text-sm text-slate-500">
                    Eingang: {formatDateTime(selectedItem.received_at)} | Größe:{' '}
                    {formatFileSize(selectedItem.file_size)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Von: {selectedItem.sender_name || selectedItem.sender_email || '-'} | An:{' '}
                    {selectedItem.recipient_email || '-'}
                  </p>
                </div>

                <a
                  href={`/api/document-inbox/${selectedItem.id}/file`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Beleg öffnen
                </a>
              </div>

              {signals.warnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="mb-1 text-xs font-black uppercase tracking-wider text-amber-700">KI-Hinweise</p>
                  <ul className="space-y-1 text-sm text-amber-800">
                    {signals.warnings.map((warning) => (
                      <li key={warning}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedItem.processing_error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  <span className="font-bold">Verarbeitungsfehler:</span> {selectedItem.processing_error}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Dokumenttyp
                  </label>
                  <select
                    value={draft.kind}
                    onChange={(event) => setField('kind', event.target.value as InboundDocumentKind)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="ab">AB</option>
                    <option value="supplier_delivery_note">Lieferschein</option>
                    <option value="supplier_invoice">Eingangsrechnung</option>
                    <option value="unknown">Unbekannt</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    KI-Vertrauen
                  </label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                    {formatConfidence(selectedItem.assignment_confidence)}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Lieferanten-Bestellung
                  </label>
                  <select
                    value={draft.supplierOrderId}
                    onChange={(event) => {
                      const nextId = event.target.value
                      setField('supplierOrderId', nextId)
                      const match = orderOptions.find((entry) => entry.id === nextId)
                      if (match?.projectId && !draft.projectId) {
                        setField('projectId', match.projectId)
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="">Keine Auswahl</option>
                    {orderOptions.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Projekt
                  </label>
                  <select
                    value={draft.projectId}
                    onChange={(event) => setField('projectId', event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="">Keine Auswahl</option>
                    {projectOptions.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.orderNumber} | {project.customerName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {draft.kind === 'ab' && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      AB-Nummer
                    </label>
                    <input
                      value={draft.abNumber}
                      onChange={(event) => setField('abNumber', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Lieferdatum
                    </label>
                    <input
                      type="date"
                      value={draft.confirmedDeliveryDate}
                      onChange={(event) => setField('confirmedDeliveryDate', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>
              )}

              {draft.kind === 'supplier_delivery_note' && (
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Lieferant
                    </label>
                    <input
                      value={draft.supplierName}
                      onChange={(event) => setField('supplierName', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      LS-Nummer
                    </label>
                    <input
                      value={draft.deliveryNoteNumber}
                      onChange={(event) => setField('deliveryNoteNumber', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Lieferdatum
                    </label>
                    <input
                      type="date"
                      value={draft.deliveryDate}
                      onChange={(event) => setField('deliveryDate', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>
              )}

              {draft.kind === 'supplier_invoice' && (
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Lieferant
                    </label>
                    <input
                      value={draft.supplierName}
                      onChange={(event) => setField('supplierName', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Rechnungsnummer
                    </label>
                    <input
                      value={draft.invoiceNumber}
                      onChange={(event) => setField('invoiceNumber', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Kategorie
                    </label>
                    <input
                      value={draft.category}
                      onChange={(event) => setField('category', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Rechnungsdatum
                    </label>
                    <input
                      type="date"
                      value={draft.invoiceDate}
                      onChange={(event) => setField('invoiceDate', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Fälligkeitsdatum
                    </label>
                    <input
                      type="date"
                      value={draft.dueDate}
                      onChange={(event) => setField('dueDate', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Steuer %
                    </label>
                    <input
                      value={draft.taxRate}
                      onChange={(event) => setField('taxRate', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Netto-Betrag
                    </label>
                    <input
                      value={draft.netAmount}
                      onChange={(event) => setField('netAmount', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Interne Notiz
                  </label>
                  <textarea
                    value={draft.notes}
                    onChange={(event) => setField('notes', event.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Ablehnungsgrund
                  </label>
                  <textarea
                    value={draft.rejectReason}
                    onChange={(event) => setField('rejectReason', event.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {candidates.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
                    KI-Kandidaten
                  </p>
                  <div className="space-y-2">
                    {candidates.map((candidate) => (
                      <button
                        key={candidate.orderId}
                        onClick={() => {
                          setField('supplierOrderId', candidate.orderId)
                          if (candidate.projectId) {
                            setField('projectId', candidate.projectId)
                          }
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:bg-amber-50"
                      >
                        <p className="text-sm font-semibold text-slate-800">
                          {candidate.orderNumber || candidate.orderId}
                          {candidate.projectOrderNumber ? ` | Projekt ${candidate.projectOrderNumber}` : ''}
                        </p>
                        <p className="text-xs text-slate-500">
                          Score: {formatConfidence(candidate.score)}{' '}
                          {candidate.reasons && candidate.reasons.length > 0
                            ? `| ${candidate.reasons.join(', ')}`
                            : ''}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 md:grid-cols-3">
                <div>
                  <span className="font-bold text-slate-700">Signal AB:</span> {signals.abNumber || '-'}
                </div>
                <div>
                  <span className="font-bold text-slate-700">Signal Rechnung:</span>{' '}
                  {signals.invoiceNumber || '-'}
                </div>
                <div>
                  <span className="font-bold text-slate-700">Signal Lieferdatum:</span>{' '}
                  {formatDate(signals.deliveryDate || signals.confirmedDeliveryDate)}
                </div>
              </div>

              {supplierOrdersError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Lieferanten-Bestellungen konnten nicht vollständig geladen werden: {supplierOrdersError}
                </div>
              )}

              {message && (
                <div
                  className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                    message.tone === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-rose-200 bg-rose-50 text-rose-700'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    void handleReassign()
                  }}
                  disabled={Boolean(busy)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  Vorzuweisung speichern
                </button>
                <button
                  onClick={() => {
                    void handleReject()
                  }}
                  disabled={Boolean(busy)}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <XCircle className="h-4 w-4" />
                  Ablehnen
                </button>
                <button
                  onClick={() => {
                    void handleConfirm()
                  }}
                  disabled={!canConfirm || Boolean(busy)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Bestätigen und buchen
                </button>
              </div>

              {busy && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Aktion wird ausgeführt...
                </div>
              )}

              {draft.kind === 'unknown' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>Dokumenttyp ist unbekannt. Bitte Typ wählen, bevor du bestätigst.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
