import type { SupplierOrderStatus } from '@/types'

export type SupplierWorkflowQueue =
  | 'lieferant_fehlt'
  | 'brennt'
  | 'zu_bestellen'
  | 'ab_fehlt'
  | 'lieferschein_da'
  | 'wareneingang_offen'
  | 'montagebereit'

export type AbTimingStatus = 'open' | 'on_time' | 'late'

export interface SupplierWorkflowQueueSnapshot {
  hasOrder: boolean
  orderStatus?: SupplierOrderStatus
  sentAt?: string
  abNumber?: string
  abReceivedAt?: string
  abConfirmedDeliveryDate?: string
  supplierDeliveryNoteId?: string
  goodsReceiptId?: string
  bookedAt?: string
  installationDate?: string
  openOrderItems: number
  openDeliveryItems: number
}

export interface SupplierWorkflowQueueDecision {
  queue: SupplierWorkflowQueue
  nextAction: string
}

export const SUPPLIER_WORKFLOW_QUEUE_META: Record<
  SupplierWorkflowQueue,
  { label: string; urgency: number }
> = {
  lieferant_fehlt: { label: 'Lieferant fehlt', urgency: 0 },
  brennt: { label: 'Brennt', urgency: 1 },
  zu_bestellen: { label: 'Zu bestellen', urgency: 2 },
  ab_fehlt: { label: 'AB fehlt', urgency: 3 },
  lieferschein_da: { label: 'Lieferschein da', urgency: 4 },
  wareneingang_offen: { label: 'Wareneingang offen', urgency: 5 },
  montagebereit: { label: 'Montagebereit', urgency: 6 },
}

const SENT_OR_LATER_STATUSES = new Set<SupplierOrderStatus>([
  'sent',
  'ab_received',
  'delivery_note_received',
  'goods_receipt_open',
  'goods_receipt_booked',
  'ready_for_installation',
])

function toDateOnly(value?: string): Date | null {
  if (!value) {
    return null
  }

  const normalized = value.includes('T') ? value.slice(0, 10) : value
  const parsed = new Date(`${normalized}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  parsed.setHours(0, 0, 0, 0)
  return parsed
}

function getDaysUntil(date: string | undefined, now: Date): number | null {
  const target = toDateOnly(date)
  if (!target) {
    return null
  }

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const dayMs = 24 * 60 * 60 * 1000
  return Math.round((target.getTime() - today.getTime()) / dayMs)
}

export function toQueueParam(queue: SupplierWorkflowQueue): string {
  return queue.replace(/_/g, '-')
}

export function fromQueueParam(value: string | null): SupplierWorkflowQueue | null {
  if (!value) {
    return null
  }

  const normalized = value.toLowerCase().trim().replace(/-/g, '_')
  const candidates = Object.keys(SUPPLIER_WORKFLOW_QUEUE_META) as SupplierWorkflowQueue[]
  return candidates.includes(normalized as SupplierWorkflowQueue)
    ? (normalized as SupplierWorkflowQueue)
    : null
}

export function getAbTimingStatus(
  abConfirmedDeliveryDate?: string,
  bookedAt?: string,
): AbTimingStatus {
  if (!abConfirmedDeliveryDate || !bookedAt) {
    return 'open'
  }

  const confirmed = toDateOnly(abConfirmedDeliveryDate)
  const booked = toDateOnly(bookedAt)
  if (!confirmed || !booked) {
    return 'open'
  }

  return booked.getTime() <= confirmed.getTime() ? 'on_time' : 'late'
}

export function deriveSupplierWorkflowQueue(
  snapshot: SupplierWorkflowQueueSnapshot,
  now: Date = new Date(),
): SupplierWorkflowQueueDecision {
  const hasDeliveryNote =
    Boolean(snapshot.supplierDeliveryNoteId) || snapshot.orderStatus === 'delivery_note_received'
  const hasGoodsReceipt =
    Boolean(snapshot.goodsReceiptId || snapshot.bookedAt) ||
    snapshot.orderStatus === 'goods_receipt_booked' ||
    snapshot.orderStatus === 'ready_for_installation'
  const hasAB =
    Boolean(snapshot.abReceivedAt || snapshot.abNumber || snapshot.abConfirmedDeliveryDate) ||
    snapshot.orderStatus === 'ab_received' ||
    hasDeliveryNote ||
    hasGoodsReceipt
  const orderSent =
    Boolean(snapshot.sentAt) ||
    (snapshot.orderStatus ? SENT_OR_LATER_STATUSES.has(snapshot.orderStatus) : false)

  const daysUntilInstallation = getDaysUntil(snapshot.installationDate, now)
  const installClose = daysUntilInstallation !== null && daysUntilInstallation <= 2
  const orderingCritical = daysUntilInstallation !== null && daysUntilInstallation <= 7

  const confirmedAbDate = toDateOnly(snapshot.abConfirmedDeliveryDate)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const abOverdue = Boolean(
    confirmedAbDate &&
      confirmedAbDate.getTime() < today.getTime() &&
      !hasGoodsReceipt &&
      snapshot.openDeliveryItems > 0,
  )

  if (
    abOverdue ||
    (installClose && (snapshot.openOrderItems > 0 || snapshot.openDeliveryItems > 0)) ||
    (orderingCritical && snapshot.openOrderItems > 0)
  ) {
    return {
      queue: 'brennt',
      nextAction: 'Sofort Eskalation: Liefertermin und Wareneingang mit Lieferant klären.',
    }
  }

  if (!snapshot.hasOrder || !orderSent || snapshot.orderStatus === 'draft' || snapshot.orderStatus === 'pending_approval') {
    return {
      queue: 'zu_bestellen',
      nextAction: snapshot.hasOrder
        ? 'Bestellung prüfen und manuell senden.'
        : 'Bestell-Bucket aus Positionen erzeugen und Bestellung senden.',
    }
  }

  if (!hasAB) {
    return {
      queue: 'ab_fehlt',
      nextAction: 'AB erfassen (AB-Nummer + bestätigter Liefertermin + Abweichungen).',
    }
  }

  if (hasDeliveryNote && !hasGoodsReceipt) {
    return {
      queue: 'lieferschein_da',
      nextAction: 'Lieferanten-Lieferschein zuordnen und Wareneingang starten.',
    }
  }

  if (snapshot.openDeliveryItems > 0) {
    return {
      queue: 'wareneingang_offen',
      nextAction: 'Wareneingang idempotent buchen und Restmengen prüfen.',
    }
  }

  return {
    queue: 'montagebereit',
    nextAction: 'Keine Aktion: Material ist montagebereit.',
  }
}
