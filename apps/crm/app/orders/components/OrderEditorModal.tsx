'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  createSupplierOrder,
  getSupplierOrder,
  replaceSupplierOrderItems,
} from '@/lib/supabase/services'
import { supabase } from '@/lib/supabase/client'
import {
  groupSelectedOrderItemsBySupplier,
  mapProjectItemsToEditorItems,
  type ProjectInvoiceItemForOrderEditor,
} from '@/lib/orders/orderEditorUtils'
import { deriveProjectDeliveryStatus } from '@/lib/orders/orderFulfillment'
import type { CustomerProject } from '@/types'
import { createEmptyEditableItem, mapRowItemsToEditableItems } from '../orderUtils'
import type { EditableOrderItem, EditorViewFilter, OrderWorkflowRow, SupplierLookupOption } from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import { ModalShell } from './ModalShell'

interface OrderEditorModalProps {
  open: boolean
  row: OrderWorkflowRow | null
  allRows: OrderWorkflowRow[]
  projects: CustomerProject[]
  suppliers: SupplierLookupOption[]
  busyKey: string | null
  onClose: () => void
  onSaved: () => Promise<void>
  onMarkExternallyOrdered: (row: OrderWorkflowRow) => Promise<boolean>
}

type InvoiceItemProcurementType = 'external_order' | 'internal_stock' | 'reservation_only'

function normalizeProcurementType(value: string | undefined): InvoiceItemProcurementType {
  if (value === 'internal_stock' || value === 'reservation_only') {
    return value
  }
  return 'external_order'
}

function isInternalStockSupplierName(value: string | undefined): boolean {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized === 'baleah eigen' || normalized === 'lagerware' || normalized === 'lager'
}

export function OrderEditorModal({
  open,
  row,
  allRows,
  projects,
  suppliers,
  busyKey,
  onClose,
  onSaved,
  onMarkExternallyOrdered,
}: OrderEditorModalProps) {
  const [orderId, setOrderId] = useState<string | null>(null)
  const [projectId, setProjectId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [items, setItems] = useState<EditableOrderItem[]>([])
  const [viewFilter, setViewFilter] = useState<EditorViewFilter>('all')
  const [error, setError] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showMarkConfirm, setShowMarkConfirm] = useState(false)

  const projectLookup = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])
  const supplierLocked = row?.kind === 'supplier'
  const markBusy = Boolean(row && busyKey === `mark:${row.key}`)
  const saveBusy = saving

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false

    const initialize = async () => {
      setError(null)
      setViewFilter('all')
      setShowMarkConfirm(false)
      setSaving(false)

      if (!row) {
        setOrderId(null)
        setProjectId('')
        setSupplierId('')
        setItems([createEmptyEditableItem()])
        setInitializing(false)
        return
      }

      setProjectId(row.projectId)
      setSupplierId(row.supplierId || '')

      if (row.orderId) {
        setInitializing(true)
        const result = await getSupplierOrder(row.orderId)
        if (cancelled) {
          return
        }

        if (!result.ok) {
          setOrderId(null)
          setItems([createEmptyEditableItem(row.supplierId)])
          setError(result.message || 'Bestellung konnte nicht geladen werden.')
          setInitializing(false)
          return
        }

        setOrderId(result.data.id)
        setItems(mapRowItemsToEditableItems({ ...row, orderItems: result.data.items || [] }))
        setInitializing(false)
        return
      }

      const mappedItems = mapRowItemsToEditableItems(row)
      setOrderId(null)
      setItems(mappedItems.length > 0 ? mappedItems : [createEmptyEditableItem(row.supplierId)])
      setInitializing(false)
    }

    void initialize()

    return () => {
      cancelled = true
    }
  }, [open, row])

  const selectedItemsCount = items.filter((item) => item.selected).length
  const selectedWithoutSupplierCount = items.filter(
    (item) =>
      item.selected &&
      item.procurementType === 'external_order' &&
      item.supplierId.trim().length === 0,
  ).length
  const missingSupplierCount = items.filter((item) => item.supplierId.trim().length === 0).length

  const visibleItems = useMemo(() => {
    if (viewFilter === 'selected') {
      return items.filter((item) => item.selected)
    }
    if (viewFilter === 'missing_supplier') {
      return items.filter((item) => item.supplierId.trim().length === 0)
    }
    return items
  }, [items, viewFilter])

  if (!open) {
    return null
  }

  return (
    <>
      <ModalShell
        open={open}
        onClose={onClose}
        title="Bestellung bearbeiten"
        description="Auftrag, Lieferant und Positionen direkt in Bestellungen pflegen."
        maxWidthClassName="max-w-[97vw] xl:max-w-[1760px]"
      >
        {initializing ? (
          <div className="mt-6 flex items-center justify-center gap-2 py-8 text-sm font-semibold text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Bestellung wird geladen
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                Auftrag
                <select
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  disabled={Boolean(row)}
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
                {supplierLocked ? 'Lieferant' : 'Standard-Lieferant (optional)'}
                <select
                  value={supplierId}
                  onChange={(event) => setSupplierId(event.target.value)}
                  disabled={supplierLocked}
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

            {!orderId && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={async () => {
                    if (!projectId) {
                      setError('Bitte zuerst einen Auftrag auswählen.')
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
                        procurement_type,
                        articles (supplier_id)
                      `,
                      )
                      .eq('project_id', projectId)

                    if (invoiceError) {
                      setError(invoiceError.message)
                      return
                    }

                    const rows = (data || []) as ProjectInvoiceItemForOrderEditor[]
                    if (rows.length === 0) {
                      setError('Keine Positionen im Auftrag gefunden.')
                      return
                    }

                    const mapped: EditableOrderItem[] = mapProjectItemsToEditorItems(rows, supplierId || undefined).map(
                      (item, index) => ({
                        localId: `${item.invoiceItemId}-${index}`,
                        selected: item.selected,
                        supplierId: item.supplierId,
                        invoiceItemId: item.invoiceItemId,
                        articleId: item.articleId,
                        description: item.description,
                        modelNumber: item.modelNumber,
                        manufacturer: item.manufacturer,
                        quantity: item.quantity,
                        unit: item.unit,
                        expectedDeliveryDate: '',
                        notes: '',
                        procurementType: item.procurementType,
                      }),
                    )

                    setItems(mapped.length > 0 ? mapped : [createEmptyEditableItem(supplierId)])
                    setError(null)
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Alle Positionen aus Auftrag laden
                </button>
                <p className="mt-1 text-xs text-slate-500">
                  Zeigt alle Auftragspositionen inkl. Marke/Modell. Pro Zeile Bestellhaken und Lieferant setzen.
                </p>
              </div>
            )}

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-700">
                  Positionen: {items.length}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-700">
                  Ausgewählt: {selectedItemsCount}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                    missingSupplierCount > 0
                      ? 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  Lieferant fehlt: {missingSupplierCount}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600">
                  Sichtbar: {visibleItems.length}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setItems((prev) =>
                      prev.map((entry) => ({
                        ...entry,
                        selected: entry.procurementType === 'external_order',
                      })),
                    )
                  }
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Alle markieren
                </button>
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.map((entry) => ({ ...entry, selected: false })))}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Alle abwählen
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setItems((prev) =>
                      prev.map((entry) => ({
                        ...entry,
                        selected:
                          entry.procurementType === 'external_order' && entry.supplierId.trim().length === 0
                            ? true
                            : entry.selected,
                      })),
                    )
                  }
                  className="rounded-md border border-fuchsia-200 bg-fuchsia-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-fuchsia-700 transition-colors hover:bg-fuchsia-100"
                >
                  Fehlende Lieferanten markieren
                </button>
                <label className="ml-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Ansicht
                  <select
                    value={viewFilter}
                    onChange={(event) => setViewFilter(event.target.value as EditorViewFilter)}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 outline-none focus:border-slate-400"
                  >
                    <option value="all">Alle</option>
                    <option value="selected">Nur ausgewählt</option>
                    <option value="missing_supplier">Nur Lieferant fehlt</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-4 max-h-[52vh] overflow-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[920px] table-fixed divide-y divide-slate-200 xl:min-w-0">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr>
                    <th scope="col" className="w-[86px] px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Bestellen
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Beschreibung
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Marke / Modell
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Lieferant
                    </th>
                    <th scope="col" className="w-[170px] px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Beschaffung
                    </th>
                    <th scope="col" className="w-[82px] px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Menge
                    </th>
                    <th scope="col" className="w-[92px] px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Einheit
                    </th>
                    <th scope="col" className="w-[140px] px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Termin
                    </th>
                    <th scope="col" className="w-[110px] px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {visibleItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-6 text-center text-sm text-slate-500">
                        Keine Positionen für diesen Filter.
                      </td>
                    </tr>
                  ) : (
                    visibleItems.map((item) => (
                      <tr key={item.localId}>
                        <td className="px-3 py-2 align-top">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            disabled={item.procurementType !== 'external_order'}
                            onChange={(event) =>
                              setItems((prev) =>
                                prev.map((entry) =>
                                  entry.localId === item.localId
                                    ? { ...entry, selected: event.target.checked }
                                    : entry,
                                ),
                              )
                            }
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 disabled:opacity-50"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={item.description}
                            onChange={(event) =>
                              setItems((prev) =>
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
                          <div className="space-y-1">
                            <input
                              value={item.manufacturer}
                              onChange={(event) =>
                                setItems((prev) =>
                                  prev.map((entry) =>
                                    entry.localId === item.localId
                                      ? { ...entry, manufacturer: event.target.value }
                                      : entry,
                                  ),
                                )
                              }
                              placeholder="Marke"
                              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
                            />
                            <input
                              value={item.modelNumber}
                              onChange={(event) =>
                                setItems((prev) =>
                                  prev.map((entry) =>
                                    entry.localId === item.localId
                                      ? { ...entry, modelNumber: event.target.value }
                                      : entry,
                                  ),
                                )
                              }
                              placeholder="Modell"
                              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={item.supplierId}
                            onChange={(event) =>
                              setItems((prev) =>
                                prev.map((entry) =>
                                  entry.localId === item.localId
                                    ? {
                                        ...entry,
                                        supplierId: event.target.value,
                                        procurementType: (() => {
                                          const supplier = suppliers.find((s) => s.id === event.target.value)
                                          if (
                                            supplier &&
                                            isInternalStockSupplierName(supplier.name) &&
                                            entry.procurementType === 'external_order'
                                          ) {
                                            return 'internal_stock'
                                          }
                                          return entry.procurementType
                                        })(),
                                        selected: (() => {
                                          const supplier = suppliers.find((s) => s.id === event.target.value)
                                          if (supplier && isInternalStockSupplierName(supplier.name)) {
                                            return false
                                          }
                                          return entry.selected
                                        })(),
                                      }
                                    : entry,
                                ),
                              )
                            }
                            disabled={supplierLocked}
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-50"
                          >
                            <option value="">Lieferant fehlt</option>
                            {suppliers.map((supplier) => (
                              <option key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={item.procurementType}
                            onChange={(event) =>
                              setItems((prev) =>
                                prev.map((entry) =>
                                  entry.localId === item.localId
                                    ? {
                                        ...entry,
                                        procurementType: normalizeProcurementType(event.target.value),
                                        selected:
                                          normalizeProcurementType(event.target.value) === 'external_order'
                                            ? entry.selected
                                            : false,
                                      }
                                    : entry,
                                ),
                              )
                            }
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-400"
                          >
                            <option value="external_order">Extern bestellen</option>
                            <option value="internal_stock">Lagerware</option>
                            <option value="reservation_only">Nur reservieren</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={item.quantity}
                            onChange={(event) =>
                              setItems((prev) =>
                                prev.map((entry) =>
                                  entry.localId === item.localId ? { ...entry, quantity: event.target.value } : entry,
                                ),
                              )
                            }
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={item.unit}
                            onChange={(event) =>
                              setItems((prev) =>
                                prev.map((entry) =>
                                  entry.localId === item.localId ? { ...entry, unit: event.target.value } : entry,
                                ),
                              )
                            }
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={item.expectedDeliveryDate}
                            onChange={(event) =>
                              setItems((prev) =>
                                prev.map((entry) =>
                                  entry.localId === item.localId
                                    ? { ...entry, expectedDeliveryDate: event.target.value }
                                    : entry,
                                ),
                              )
                            }
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setItems((prev) =>
                                prev.length === 1 ? prev : prev.filter((entry) => entry.localId !== item.localId),
                              )
                            }
                            className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50"
                          >
                            Entfernen
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={() => setItems((prev) => [...prev, createEmptyEditableItem(supplierId)])}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50"
              >
                Position hinzufügen
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-600">
              Ausgewählt: {selectedItemsCount}
              {selectedWithoutSupplierCount > 0 &&
                ` · ohne Lieferant: ${selectedWithoutSupplierCount} (bitte zuordnen oder abwählen)`}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Extern bestellen: Position markieren und senden. Lagerware/Reservierung laufen ohne AB/Lieferschein/WE.
            </p>

            {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}

            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              {row?.kind === 'supplier' && row.externalOrderItems > 0 && (
                <button
                  type="button"
                  onClick={() => setShowMarkConfirm(true)}
                  disabled={markBusy || saveBusy}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {markBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Bereits bestellt
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={saveBusy}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={async () => {
                  const normalizedProjectId = projectId.trim()
                  const normalizedSupplierId = supplierId.trim()

                  if (!normalizedProjectId) {
                    setError('Auftrag ist erforderlich.')
                    return
                  }

                  if ((orderId || supplierLocked) && !normalizedSupplierId) {
                    setError('Lieferant ist erforderlich.')
                    return
                  }

                  const grouped = groupSelectedOrderItemsBySupplier(items)
                  if (grouped.missingSupplierCount > 0) {
                    setError(
                      `${grouped.missingSupplierCount} ausgewählte Position(en) haben keinen Lieferanten. Bitte zuordnen.`,
                    )
                    return
                  }

                  const toPayloadItems = (
                    groupedItems: ReturnType<typeof groupSelectedOrderItemsBySupplier>['groups'][string],
                  ) =>
                    groupedItems.map((item, index) => ({
                      ...item,
                      positionNumber: index + 1,
                    }))

                  let groupedEntries = Object.entries(grouped.groups)
                  if (supplierLocked && normalizedSupplierId) {
                    groupedEntries = groupedEntries.filter(([entrySupplierId]) => entrySupplierId === normalizedSupplierId)
                  }

                  const invoiceItemsById = new Map<
                    string,
                    {
                      procurementType: InvoiceItemProcurementType
                      quantity: number
                    }
                  >()
                  items.forEach((item) => {
                    const invoiceItemId = (item.invoiceItemId || '').trim()
                    if (!invoiceItemId) {
                      return
                    }
                    invoiceItemsById.set(invoiceItemId, {
                      procurementType: normalizeProcurementType(item.procurementType),
                      quantity: Math.max(0, Number.parseFloat(item.quantity || '0') || 0),
                    })
                  })

                  if (grouped.externalSelectedCount === 0 && invoiceItemsById.size === 0) {
                    setError('Bitte mindestens eine Position auswählen oder Beschaffung ändern.')
                    return
                  }

                  setError(null)

                  try {
                    setSaving(true)

                    for (const [invoiceItemId, data] of invoiceItemsById.entries()) {
                      const updatePayload: Record<string, unknown> = {
                        procurement_type: data.procurementType,
                      }

                      if (data.procurementType === 'internal_stock') {
                        const fulfilledQuantity = data.quantity > 0 ? data.quantity : 1
                        updatePayload.delivery_status = 'delivered'
                        updatePayload.quantity_ordered = fulfilledQuantity
                        updatePayload.quantity_delivered = fulfilledQuantity
                        updatePayload.actual_delivery_date = new Date().toISOString().slice(0, 10)
                      }

                      const { error: invoiceUpdateError } = await supabase
                        .from('invoice_items')
                        .update(updatePayload)
                        .eq('id', invoiceItemId)
                        .eq('project_id', normalizedProjectId)

                      if (invoiceUpdateError) {
                        throw new Error(invoiceUpdateError.message)
                      }
                    }

                    const { data: refreshedMaterialRows, error: refreshedMaterialRowsError } = await supabase
                      .from('invoice_items')
                      .select('delivery_status, quantity, quantity_ordered, quantity_delivered, procurement_type')
                      .eq('project_id', normalizedProjectId)

                    if (refreshedMaterialRowsError) {
                      throw new Error(refreshedMaterialRowsError.message)
                    }

                    const deliveryState = deriveProjectDeliveryStatus((refreshedMaterialRows || []) as Array<{
                      delivery_status: string | null
                      quantity: unknown
                      quantity_ordered: unknown
                      quantity_delivered: unknown
                      procurement_type?: unknown
                    }>)

                    const { error: projectDeliveryUpdateError } = await supabase
                      .from('projects')
                      .update({
                        delivery_status: deliveryState.status,
                        all_items_delivered: deliveryState.allDelivered,
                        ready_for_assembly_date: deliveryState.allDelivered
                          ? new Date().toISOString().slice(0, 10)
                          : null,
                      })
                      .eq('id', normalizedProjectId)

                    if (projectDeliveryUpdateError) {
                      throw new Error(projectDeliveryUpdateError.message)
                    }

                    if (orderId) {
                      const payloadItems = toPayloadItems(grouped.groups[normalizedSupplierId] || [])
                      const updateResult = await replaceSupplierOrderItems(orderId, payloadItems)
                      if (!updateResult.ok) {
                        throw new Error(updateResult.message || 'Bestellung konnte nicht gespeichert werden.')
                      }
                    } else {
                      const upsertSupplierBucket = async (
                        targetSupplierId: string,
                        groupedItems: ReturnType<typeof groupSelectedOrderItemsBySupplier>['groups'][string],
                      ) => {
                        const payloadItems = toPayloadItems(groupedItems)
                        if (payloadItems.length === 0) {
                          return
                        }

                        const existingRow = allRows.find(
                          (candidate) =>
                            candidate.kind === 'supplier' &&
                            candidate.projectId === normalizedProjectId &&
                            candidate.supplierId === targetSupplierId &&
                            candidate.orderId,
                        )

                        if (existingRow?.orderId) {
                          const existingOrderResult = await getSupplierOrder(existingRow.orderId)
                          if (!existingOrderResult.ok) {
                            throw new Error(
                              existingOrderResult.message || 'Bestehende Bestellung konnte nicht geladen werden.',
                            )
                          }

                          const mergedItems = [...(existingOrderResult.data.items || []), ...payloadItems].map(
                            (item, index) => ({
                              ...item,
                              positionNumber: index + 1,
                            }),
                          )

                          const mergedResult = await replaceSupplierOrderItems(existingRow.orderId, mergedItems)
                          if (!mergedResult.ok) {
                            throw new Error(mergedResult.message || 'Bestellung konnte nicht gespeichert werden.')
                          }
                          return
                        }

                        const createResult = await createSupplierOrder({
                          projectId: normalizedProjectId,
                          supplierId: targetSupplierId,
                          status: 'draft',
                          createdByType: 'user',
                          installationReferenceDate: projectLookup.get(normalizedProjectId)?.installationDate,
                          items: payloadItems,
                        })

                        if (!createResult.ok) {
                          throw new Error(createResult.message || 'Bestellung konnte nicht erstellt werden.')
                        }
                      }

                      for (const [targetSupplierId, groupedItems] of groupedEntries) {
                        await upsertSupplierBucket(targetSupplierId, groupedItems)
                      }
                    }

                    await onSaved()
                    onClose()
                  } catch (saveError) {
                    const message =
                      saveError instanceof Error ? saveError.message : 'Bestellung konnte nicht gespeichert werden.'
                    setError(message)
                  } finally {
                    setSaving(false)
                  }
                }}
                disabled={saveBusy || markBusy}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Speichern
              </button>
            </div>
          </>
        )}
      </ModalShell>

      {row?.kind === 'supplier' && row.externalOrderItems > 0 && (
        <ConfirmDialog
          open={showMarkConfirm}
          onClose={() => setShowMarkConfirm(false)}
          onConfirm={async () => {
            const success = await onMarkExternallyOrdered(row)
            if (success) {
              setShowMarkConfirm(false)
              onClose()
            }
          }}
          busy={markBusy}
          tone="warning"
          title="Als extern bestellt markieren?"
          description={`Für ${row.supplierName} wird die Bestellung als bereits extern bestellt markiert.`}
          confirmLabel="Ja, markieren"
        />
      )}
    </>
  )
}
