export type ProjectDeliveryStatus =
  | 'fully_delivered'
  | 'partially_delivered'
  | 'fully_ordered'
  | 'partially_ordered'

export type InvoiceItemProcurementType = 'external_order' | 'internal_stock' | 'reservation_only'

export interface ProjectDeliveryProgressRow {
  delivery_status: string | null
  quantity: unknown
  quantity_ordered: unknown
  quantity_delivered: unknown
  procurement_type?: unknown
}

export interface InvoiceItemProgressSnapshot {
  delivery_status: string | null
  quantity: unknown
  quantity_ordered: unknown
  quantity_delivered: unknown
}

export interface SupplierOrderInvoiceCandidateRow {
  id: string
  supplierId: string | null
  procurementType?: unknown
}

export function toFiniteNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

export function normalizeProcurementType(value: unknown): InvoiceItemProcurementType {
  if (value === 'internal_stock' || value === 'reservation_only') {
    return value
  }
  return 'external_order'
}

export function collectSupplierOrderCandidateInvoiceItemIds(
  rows: SupplierOrderInvoiceCandidateRow[],
  supplierId: string,
  explicitInvoiceItemIds: Iterable<string>,
): Set<string> {
  const candidates = new Set<string>()
  const explicitIds = new Set<string>(explicitInvoiceItemIds)

  rows.forEach((row) => {
    const isExternalOrder = normalizeProcurementType(row.procurementType) === 'external_order'
    if (!isExternalOrder) return
    const inOrder = explicitIds.has(row.id)
    const sameSupplier = row.supplierId === supplierId
    const noSupplier = row.supplierId == null || row.supplierId === ''
    if (inOrder || sameSupplier || noSupplier) {
      candidates.add(row.id)
    }
  })

  return candidates
}

export function deriveInternalStockFulfillmentQuantity(
  snapshot: InvoiceItemProgressSnapshot,
  requestedQuantity: unknown,
): number {
  return Math.max(
    1,
    toFiniteNumber(requestedQuantity),
    toFiniteNumber(snapshot.quantity),
    toFiniteNumber(snapshot.quantity_ordered),
    toFiniteNumber(snapshot.quantity_delivered),
  )
}

export function shouldResetSyntheticInternalStockProgress(
  snapshot: InvoiceItemProgressSnapshot,
): boolean {
  const quantity = Math.max(0, toFiniteNumber(snapshot.quantity))
  const ordered = Math.max(0, toFiniteNumber(snapshot.quantity_ordered))
  const delivered = Math.max(0, toFiniteNumber(snapshot.quantity_delivered))
  const reachedQuantity = quantity > 0 ? ordered >= quantity && delivered >= quantity : delivered > 0

  return snapshot.delivery_status === 'delivered' && reachedQuantity
}

export function deriveProjectDeliveryStatus(rows: ProjectDeliveryProgressRow[]): {
  status: ProjectDeliveryStatus
  allDelivered: boolean
} {
  const relevantRows = rows.filter(
    (item) => normalizeProcurementType(item.procurement_type) !== 'reservation_only',
  )

  if (relevantRows.length === 0) {
    return {
      status: 'fully_delivered',
      allDelivered: true,
    }
  }

  const allDelivered = relevantRows.every((item) => {
    return (
      item.delivery_status === 'delivered' &&
      toFiniteNumber(item.quantity_delivered) >= toFiniteNumber(item.quantity)
    )
  })

  const partiallyDelivered = relevantRows.some((item) => {
    return (
      item.delivery_status === 'partially_delivered' ||
      (toFiniteNumber(item.quantity_delivered) > 0 &&
        toFiniteNumber(item.quantity_delivered) < toFiniteNumber(item.quantity))
    )
  })

  const allOrdered = relevantRows.every((item) => {
    const orderedQuantity = Math.max(
      toFiniteNumber(item.quantity_ordered),
      toFiniteNumber(item.quantity_delivered),
    )
    const quantity = toFiniteNumber(item.quantity)
    if (quantity > 0 && orderedQuantity >= quantity) {
      return true
    }

    return item.delivery_status !== 'not_ordered'
  })

  const status: ProjectDeliveryStatus = allDelivered
    ? 'fully_delivered'
    : partiallyDelivered
      ? 'partially_delivered'
      : allOrdered
        ? 'fully_ordered'
        : 'partially_ordered'

  return {
    status,
    allDelivered,
  }
}
