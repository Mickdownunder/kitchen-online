import type { SupplierOrderStatus } from '@/types'

export type SupplierWorkflowQueue =
  | 'zu_bestellen'
  | 'brennt'
  | 'ab_fehlt'
  | 'wareneingang_offen'
  | 'reservierung_offen'
  | 'montagebereit'
  | 'erledigt'

export type AbTimingStatus = 'open' | 'on_time' | 'late'
export type ReservationFlowStatus = 'draft' | 'requested' | 'confirmed' | 'cancelled'

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
  isProjectCompleted?: boolean
  hasExternalOrderItems?: boolean
  hasInternalStockItems?: boolean
  hasReservationOnlyItems?: boolean
  reservationStatus?: ReservationFlowStatus
}

export interface SupplierWorkflowQueueDecision {
  queue: SupplierWorkflowQueue
  nextAction: string
}

export const SUPPLIER_WORKFLOW_QUEUE_META: Record<
  SupplierWorkflowQueue,
  { label: string; urgency: number }
> = {
  zu_bestellen: { label: 'Zu bestellen', urgency: 1 },
  brennt: { label: 'Brennt', urgency: 2 },
  ab_fehlt: { label: 'Bestellbestätigung', urgency: 3 },
  wareneingang_offen: { label: 'Wareneingang', urgency: 4 },
  reservierung_offen: { label: 'Reservierung', urgency: 5 },
  montagebereit: { label: 'Montagebereit', urgency: 6 },
  erledigt: { label: 'Erledigt', urgency: 7 },
}

export const SUPPLIER_WORKFLOW_QUEUE_ORDER: SupplierWorkflowQueue[] = [
  'zu_bestellen',
  'brennt',
  'ab_fehlt',
  'wareneingang_offen',
  'reservierung_offen',
  'montagebereit',
  'erledigt',
]

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
  const legacyMapped =
    normalized === 'lieferschein_da'
      ? 'wareneingang_offen'
      : normalized === 'lieferant_fehlt'
        ? 'zu_bestellen'
        : normalized

  return SUPPLIER_WORKFLOW_QUEUE_ORDER.includes(legacyMapped as SupplierWorkflowQueue)
    ? (legacyMapped as SupplierWorkflowQueue)
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
  if (snapshot.isProjectCompleted) {
    return {
      queue: 'erledigt',
      nextAction: 'Projekt abgeschlossen. Keine offene Bestellaktion mehr.',
    }
  }

  const hasExternalOrderItems = snapshot.hasExternalOrderItems ?? true
  const hasReservationOnlyItems = Boolean(snapshot.hasReservationOnlyItems)
  const hasInternalStockItems = Boolean(snapshot.hasInternalStockItems)

  const reservationDecision =
    hasReservationOnlyItems && snapshot.reservationStatus !== 'confirmed'
      ? {
          queue: 'reservierung_offen' as const,
          nextAction:
            snapshot.reservationStatus === 'requested'
              ? 'Reservierungsanfrage läuft. Bestätigung von Montagepartner erfassen.'
              : snapshot.reservationStatus === 'cancelled'
                ? 'Reservierung storniert. Neue Reservierung per E-Mail senden.'
                : 'Montage-/Liefertermin per E-Mail reservieren und Pläne mitschicken.',
        }
      : null

  if (!hasExternalOrderItems && (hasInternalStockItems || hasReservationOnlyItems)) {
    if (reservationDecision) {
      return reservationDecision
    }

    return {
      queue: 'montagebereit',
      nextAction: hasInternalStockItems
        ? 'Lagerware ist verfügbar. Auftrag ist montagebereit.'
        : 'Reservierung bestätigt. Auftrag ist montagebereit.',
    }
  }

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

  const daysUntilTarget = getDaysUntil(snapshot.installationDate, now)
  const targetClose = daysUntilTarget !== null && daysUntilTarget <= 2
  const orderingCritical = daysUntilTarget !== null && daysUntilTarget <= 7

  const needsOrdering =
    hasExternalOrderItems &&
    (!snapshot.hasOrder ||
      !orderSent ||
      snapshot.orderStatus === 'draft' ||
      snapshot.orderStatus === 'pending_approval')

  if (needsOrdering && (targetClose || (orderingCritical && snapshot.openOrderItems > 0))) {
    return {
      queue: 'brennt',
      nextAction: 'Dringend: Bestellung jetzt auslösen oder als bereits bestellt markieren.',
    }
  }

  if (needsOrdering) {
    return {
      queue: 'zu_bestellen',
      nextAction: snapshot.hasOrder
        ? 'Bestellung senden oder als bereits bestellt markieren.'
        : 'Bestellung anlegen und versenden.',
    }
  }

  if (!hasAB) {
    return {
      queue: 'ab_fehlt',
      nextAction: 'Bestellbestätigung (AB) erfassen.',
    }
  }

  if (snapshot.openDeliveryItems > 0) {
    return {
      queue: 'wareneingang_offen',
      nextAction: hasDeliveryNote
        ? 'Wareneingang erfassen und bestätigen.'
        : 'Lieferschein hochladen und Wareneingang bestätigen.',
    }
  }

  if (reservationDecision) {
    return reservationDecision
  }

  return {
    queue: 'montagebereit',
    nextAction: 'Material vollständig verfügbar. Bereit für Montage/Abholung.',
  }
}
