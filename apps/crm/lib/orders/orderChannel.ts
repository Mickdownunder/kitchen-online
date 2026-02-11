import type { SupplierOrder, SupplierOrderStatus } from '@/types'

export type SupplierOrderChannel = 'crm_mail' | 'external' | 'pending'

const SENT_OR_LATER_STATUSES = new Set<SupplierOrderStatus>([
  'sent',
  'ab_received',
  'delivery_note_received',
  'goods_receipt_open',
  'goods_receipt_booked',
  'ready_for_installation',
])

export function deriveSupplierOrderChannel(order?: SupplierOrder): SupplierOrderChannel {
  if (!order) {
    return 'pending'
  }

  if ((order.dispatchLogs || []).length > 0) {
    return 'crm_mail'
  }

  if (Boolean(order.sentAt) || SENT_OR_LATER_STATUSES.has(order.status)) {
    return 'external'
  }

  return 'pending'
}

export const SUPPLIER_ORDER_CHANNEL_META: Record<
  SupplierOrderChannel,
  { label: string; chipClass: string }
> = {
  crm_mail: {
    label: 'via CRM-Mail',
    chipClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  external: {
    label: 'extern markiert',
    chipClass: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  pending: {
    label: 'noch offen',
    chipClass: 'border-slate-200 bg-slate-50 text-slate-600',
  },
}
