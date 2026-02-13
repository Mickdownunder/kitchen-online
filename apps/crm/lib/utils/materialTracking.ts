import type { CustomerProject, InvoiceItem } from '@/types'
import type { InvoiceItemProcurementType } from '@/types'
import { roundTo2Decimals } from '@/lib/utils/priceCalculations'

const READY_PROCUREMENT_TYPES: InvoiceItemProcurementType[] = ['internal_stock', 'reservation_only']
function isNonOrderProcurement(value?: InvoiceItemProcurementType): boolean {
  return value != null && READY_PROCUREMENT_TYPES.includes(value)
}

export type ItemDeliveryStatus = NonNullable<InvoiceItem['deliveryStatus']>
export type MaterialRiskLevel = 'critical' | 'warning' | 'ok'

const DAY_IN_MS = 24 * 60 * 60 * 1000
const ORDERED_BY_STATUS = new Set<ItemDeliveryStatus>([
  'ordered',
  'partially_delivered',
  'delivered',
  'missing',
])

export const DELIVERY_STATUS_LABELS: Record<ItemDeliveryStatus, string> = {
  not_ordered: 'Nicht bestellt',
  ordered: 'Bestellt',
  partially_delivered: 'Teilweise geliefert',
  delivered: 'Geliefert',
  missing: 'Fehlteile',
}

export interface ItemMaterialSnapshot {
  quantity: number
  orderedQuantity: number
  deliveredQuantity: number
  openOrderQuantity: number
  openDeliveryQuantity: number
  status: ItemDeliveryStatus
  isFullyOrdered: boolean
  isFullyDelivered: boolean
  expectedDeliveryDate?: string
  actualDeliveryDate?: string
}

export interface ProjectMaterialSnapshot {
  projectId: string
  orderNumber: string
  customerName: string
  installationDate: string
  daysUntilInstallation: number
  totalItems: number
  fullyOrderedItems: number
  fullyDeliveredItems: number
  openOrderItems: number
  openDeliveryItems: number
  missingItems: number
  riskLevel: MaterialRiskLevel
}

function toNonNegativeNumber(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0
  }
  return value > 0 ? value : 0
}

function normalizeDate(date?: string): string | undefined {
  if (!date || typeof date !== 'string') {
    return undefined
  }
  const trimmed = date.trim()
  if (!trimmed) {
    return undefined
  }
  return trimmed.includes('T') ? trimmed.slice(0, 10) : trimmed
}

function normalizeItemQuantity(quantity?: number): number {
  return Math.max(1, toNonNegativeNumber(quantity))
}

export function resolveItemDeliveryStatus({
  quantity,
  quantityOrdered,
  quantityDelivered,
  currentStatus,
}: {
  quantity: number
  quantityOrdered?: number
  quantityDelivered?: number
  currentStatus?: InvoiceItem['deliveryStatus']
}): ItemDeliveryStatus {
  const normalizedQuantity = normalizeItemQuantity(quantity)
  const normalizedDelivered = toNonNegativeNumber(quantityDelivered)
  const normalizedOrdered = Math.max(normalizedDelivered, toNonNegativeNumber(quantityOrdered))

  if (normalizedDelivered >= normalizedQuantity) {
    return 'delivered'
  }

  if (currentStatus === 'missing') {
    return 'missing'
  }

  if (normalizedDelivered > 0) {
    return 'partially_delivered'
  }

  if (normalizedOrdered > 0 || (currentStatus && ORDERED_BY_STATUS.has(currentStatus as ItemDeliveryStatus))) {
    return 'ordered'
  }

  return 'not_ordered'
}

export function getItemMaterialSnapshot(item: InvoiceItem): ItemMaterialSnapshot {
  const quantity = normalizeItemQuantity(item.quantity)
  const deliveredQuantity = toNonNegativeNumber(item.quantityDelivered)
  const orderedByStatus =
    item.deliveryStatus && ORDERED_BY_STATUS.has(item.deliveryStatus as ItemDeliveryStatus) ? quantity : 0
  const orderedQuantity = Math.max(
    deliveredQuantity,
    toNonNegativeNumber(item.quantityOrdered),
    orderedByStatus,
  )

  const status = resolveItemDeliveryStatus({
    quantity,
    quantityOrdered: orderedQuantity,
    quantityDelivered: deliveredQuantity,
    currentStatus: item.deliveryStatus,
  })

  const openOrderQuantity = Math.max(0, roundTo2Decimals(quantity - orderedQuantity))
  const openDeliveryQuantity = Math.max(0, roundTo2Decimals(quantity - deliveredQuantity))

  return {
    quantity,
    orderedQuantity: roundTo2Decimals(orderedQuantity),
    deliveredQuantity: roundTo2Decimals(deliveredQuantity),
    openOrderQuantity,
    openDeliveryQuantity,
    status,
    isFullyOrdered: openOrderQuantity <= 0,
    isFullyDelivered: openDeliveryQuantity <= 0,
    expectedDeliveryDate: normalizeDate(item.expectedDeliveryDate),
    actualDeliveryDate: normalizeDate(item.actualDeliveryDate),
  }
}

export function applyItemMaterialUpdate(
  item: InvoiceItem,
  patch: Pick<
    Partial<InvoiceItem>,
    'deliveryStatus' | 'quantityOrdered' | 'quantityDelivered' | 'expectedDeliveryDate' | 'actualDeliveryDate'
  >,
): Pick<
  InvoiceItem,
  'deliveryStatus' | 'quantityOrdered' | 'quantityDelivered' | 'expectedDeliveryDate' | 'actualDeliveryDate'
> {
  const quantity = normalizeItemQuantity(item.quantity)

  let quantityDelivered = toNonNegativeNumber(
    patch.quantityDelivered !== undefined ? patch.quantityDelivered : item.quantityDelivered,
  )
  let quantityOrdered = Math.max(
    quantityDelivered,
    toNonNegativeNumber(patch.quantityOrdered !== undefined ? patch.quantityOrdered : item.quantityOrdered),
  )

  const requestedStatus = patch.deliveryStatus ?? item.deliveryStatus

  if (requestedStatus === 'not_ordered') {
    if (quantityDelivered <= 0) {
      quantityOrdered = 0
    }
  } else if (requestedStatus === 'ordered' && quantityOrdered <= 0) {
    quantityOrdered = quantity
  } else if (requestedStatus === 'partially_delivered') {
    const minPartialQuantity = Math.min(quantity, Math.max(0.01, quantityDelivered))
    quantityDelivered = minPartialQuantity
    quantityOrdered = Math.max(quantityOrdered, minPartialQuantity)
  } else if (requestedStatus === 'delivered') {
    quantityDelivered = Math.max(quantityDelivered, quantity)
    quantityOrdered = Math.max(quantityOrdered, quantityDelivered)
  } else if (requestedStatus === 'missing') {
    quantityOrdered = Math.max(quantityOrdered, quantity)
  }

  const status = resolveItemDeliveryStatus({
    quantity,
    quantityOrdered,
    quantityDelivered,
    currentStatus: requestedStatus,
  })

  const expectedDeliveryDate = status === 'not_ordered' ? undefined : normalizeDate(patch.expectedDeliveryDate ?? item.expectedDeliveryDate)
  const actualDeliveryDate =
    quantityDelivered > 0 ? normalizeDate(patch.actualDeliveryDate ?? item.actualDeliveryDate) : undefined

  return {
    deliveryStatus: status,
    quantityOrdered: roundTo2Decimals(quantityOrdered),
    quantityDelivered: roundTo2Decimals(quantityDelivered),
    expectedDeliveryDate,
    actualDeliveryDate,
  }
}

function parseIsoDate(date: string): Date | null {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  parsed.setHours(0, 0, 0, 0)
  return parsed
}

export function getProjectMaterialSnapshot(
  project: CustomerProject,
  now: Date = new Date(),
): ProjectMaterialSnapshot | null {
  const installationDate = normalizeDate(project.installationDate)
  if (!installationDate) {
    return null
  }

  const parsedInstallationDate = parseIsoDate(installationDate)
  if (!parsedInstallationDate) {
    return null
  }

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  const daysUntilInstallation = Math.round(
    (parsedInstallationDate.getTime() - today.getTime()) / DAY_IN_MS,
  )

  const items = project.items || []
  const itemSnapshots = items.map(getItemMaterialSnapshot)
  const totalItems = itemSnapshots.length
  // Reservierungs- und Lagerpositionen zählen als „bereit“, sie werden nicht bestellt/wareneingang
  const fullyOrderedItems = itemSnapshots.filter((snap, i) => {
    const item = items[i]
    return snap.isFullyOrdered || isNonOrderProcurement(item?.procurementType)
  }).length
  const fullyDeliveredItems = itemSnapshots.filter((snap, i) => {
    const item = items[i]
    return snap.isFullyDelivered || isNonOrderProcurement(item?.procurementType)
  }).length
  const missingItems = itemSnapshots.filter((item) => item.status === 'missing').length
  const openOrderItems = totalItems - fullyOrderedItems
  const openDeliveryItems = totalItems - fullyDeliveredItems

  let riskLevel: MaterialRiskLevel = 'ok'
  if (
    missingItems > 0 ||
    (daysUntilInstallation <= 2 && openDeliveryItems > 0) ||
    (daysUntilInstallation <= 7 && openOrderItems > 0)
  ) {
    riskLevel = 'critical'
  } else if (openOrderItems > 0 || openDeliveryItems > 0 || totalItems === 0) {
    riskLevel = 'warning'
  }

  return {
    projectId: project.id,
    orderNumber: project.orderNumber,
    customerName: project.customerName,
    installationDate,
    daysUntilInstallation,
    totalItems,
    fullyOrderedItems,
    fullyDeliveredItems,
    openOrderItems,
    openDeliveryItems,
    missingItems,
    riskLevel,
  }
}

export function getUpcomingInstallationMaterialSnapshots(
  projects: CustomerProject[],
  horizonDays: number = 14,
  now: Date = new Date(),
): ProjectMaterialSnapshot[] {
  const severityOrder: Record<MaterialRiskLevel, number> = {
    critical: 0,
    warning: 1,
    ok: 2,
  }

  return projects
    .map((project) => getProjectMaterialSnapshot(project, now))
    .filter((snapshot): snapshot is ProjectMaterialSnapshot => {
      if (!snapshot) {
        return false
      }
      return snapshot.daysUntilInstallation >= 0 && snapshot.daysUntilInstallation <= horizonDays
    })
    .sort((a, b) => {
      const severityDiff = severityOrder[a.riskLevel] - severityOrder[b.riskLevel]
      if (severityDiff !== 0) {
        return severityDiff
      }
      if (a.daysUntilInstallation !== b.daysUntilInstallation) {
        return a.daysUntilInstallation - b.daysUntilInstallation
      }
      return a.customerName.localeCompare(b.customerName)
    })
}
