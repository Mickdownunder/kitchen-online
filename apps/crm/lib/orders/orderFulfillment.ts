export type ProjectDeliveryStatus =
  | 'fully_delivered'
  | 'partially_delivered'
  | 'fully_ordered'
  | 'partially_ordered'

export interface ProjectDeliveryProgressRow {
  delivery_status: string | null
  quantity: unknown
  quantity_ordered: unknown
  quantity_delivered: unknown
}

export interface SupplierOrderInvoiceCandidateRow {
  id: string
  supplierId: string | null
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

export function collectSupplierOrderCandidateInvoiceItemIds(
  rows: SupplierOrderInvoiceCandidateRow[],
  supplierId: string,
  explicitInvoiceItemIds: Iterable<string>,
): Set<string> {
  const candidates = new Set<string>()
  const explicitIds = new Set<string>(explicitInvoiceItemIds)

  rows.forEach((row) => {
    if (explicitIds.has(row.id) || row.supplierId === supplierId) {
      candidates.add(row.id)
    }
  })

  return candidates
}

export function deriveProjectDeliveryStatus(rows: ProjectDeliveryProgressRow[]): {
  status: ProjectDeliveryStatus
  allDelivered: boolean
} {
  const allDelivered = rows.every((item) => {
    return (
      item.delivery_status === 'delivered' &&
      toFiniteNumber(item.quantity_delivered) >= toFiniteNumber(item.quantity)
    )
  })

  const partiallyDelivered = rows.some((item) => {
    return (
      item.delivery_status === 'partially_delivered' ||
      (toFiniteNumber(item.quantity_delivered) > 0 &&
        toFiniteNumber(item.quantity_delivered) < toFiniteNumber(item.quantity))
    )
  })

  const allOrdered = rows.every((item) => {
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
