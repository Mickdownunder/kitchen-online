export const ADVANCED_SUPPLIER_ORDER_STATUSES = new Set([
  'ab_received',
  'delivery_note_received',
  'goods_receipt_open',
  'goods_receipt_booked',
  'ready_for_installation',
])

export function toExternallyOrderedStatus(currentStatus: string): string {
  return ADVANCED_SUPPLIER_ORDER_STATUSES.has(currentStatus) ? currentStatus : 'sent'
}

export function appendExternalOrderedNote(existingNotes: string | null, nowIso: string): string {
  const noteDate = nowIso.slice(0, 10)
  const line = `Extern bestellt markiert (${noteDate})`
  const normalized = (existingNotes || '').trim()

  if (!normalized) {
    return line
  }

  if (normalized.includes(line)) {
    return normalized
  }

  return `${normalized}\n${line}`
}
