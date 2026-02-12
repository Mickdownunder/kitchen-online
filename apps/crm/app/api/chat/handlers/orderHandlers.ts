/**
 * AI handlers for supplier orders and lead times (Bestell-Tracking).
 */

import type { ServerHandler } from '../serverHandlers'

export const handleConfirmOrder: ServerHandler = async (args, supabase) => {
  const orderId = (args.supplierOrderId as string)?.trim()
  if (!orderId) return { result: '❌ supplierOrderId fehlt.' }

  const abNumber = (args.abNumber as string)?.trim()
  if (!abNumber) return { result: '❌ abNumber fehlt.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {
    status: 'ab_received',
    ab_number: abNumber,
    ab_received_at: new Date().toISOString(),
  }
  if (args.confirmedDeliveryDate != null && String(args.confirmedDeliveryDate).trim()) {
    updates.ab_confirmed_delivery_date = String(args.confirmedDeliveryDate).trim()
  }
  if (args.notes != null && String(args.notes).trim()) {
    updates.notes = String(args.notes).trim()
  }

  const { data, error } = await supabase
    .from('supplier_orders')
    .update(updates)
    .eq('id', orderId)
    .select('id, order_number, ab_number')
    .single()

  if (error) {
    if ((error as { code?: string }).code === 'PGRST116') {
      return { result: '❌ Bestellung nicht gefunden oder keine Berechtigung.' }
    }
    return { result: `❌ Fehler: ${error.message}` }
  }

  const row = data as { order_number: string; ab_number: string }
  return {
    result: `✅ Auftragsbestätigung erfasst: Bestellung ${row.order_number}, AB-Nr. ${row.ab_number}.`,
  }
}

export const handleGetLeadTimes: ServerHandler = async (args, supabase) => {
  const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
  if (companyError || !companyId) {
    return { result: '❌ Keine Firma zugeordnet.' }
  }

  const { data: suppliers, error } = await supabase
    .from('suppliers')
    .select('id, name, lead_time_weeks')
    .eq('company_id', companyId)
    .order('name', { ascending: true })

  if (error) return { result: `❌ Fehler: ${error.message}` }
  if (!suppliers?.length) return { result: 'Keine Lieferanten angelegt.' }

  const lines = (suppliers as { id: string; name: string; lead_time_weeks: number | null }[]).map(
    (s) => {
      const weeks = s.lead_time_weeks != null ? `${s.lead_time_weeks} Wochen` : 'nicht hinterlegt'
      return `id=${s.id} | ${s.name} | ${weeks}`
    },
  )
  return { result: lines.join('\n') }
}

export const handleSetLeadTime: ServerHandler = async (args, supabase) => {
  const supplierId = (args.supplierId as string)?.trim()
  if (!supplierId) return { result: '❌ supplierId fehlt.' }

  const raw = args.leadTimeWeeks
  const weeks = typeof raw === 'number' ? raw : Number.parseFloat(String(raw))
  if (!Number.isFinite(weeks) || weeks < 0) {
    return { result: '❌ leadTimeWeeks muss eine Zahl >= 0 sein.' }
  }

  const { data, error } = await supabase
    .from('suppliers')
    .update({ lead_time_weeks: weeks, updated_at: new Date().toISOString() })
    .eq('id', supplierId)
    .select('id, name, lead_time_weeks')
    .single()

  if (error) {
    if ((error as { code?: string }).code === 'PGRST116') {
      return { result: '❌ Lieferant nicht gefunden oder keine Berechtigung.' }
    }
    return { result: `❌ Fehler: ${error.message}` }
  }

  const row = data as { name: string; lead_time_weeks: number | null }
  return {
    result: `✅ Lieferzeit für ${row.name} auf ${row.lead_time_weeks ?? 0} Wochen gesetzt.`,
  }
}
