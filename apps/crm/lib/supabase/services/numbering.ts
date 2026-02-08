/**
 * Sequential numbering logic for invoices, orders, and delivery notes.
 *
 * All functions derive the "next" number from the maximum existing number
 * in the respective DB table (no gap-filling). The settings counter is used
 * as fallback when no records exist yet.
 */

import { supabase } from '../client'
import { getCurrentUser } from './auth'
import { getCompanySettings } from './company'

// ============================================
// Parsing helpers
// ============================================

/**
 * Extracts the running number from a formatted number string.
 * Supports: R2026-1108, R-2026-1108, R-2026-1001-A1 (takes base number).
 */
function parseNumberSegment(year: number, formatted: string): number | null {
  if (!formatted?.trim()) return null
  const match = formatted.match(new RegExp(`${year}-(\\d+)`))
  if (!match) return null
  const n = parseInt(match[1], 10)
  return Number.isNaN(n) ? null : n
}

/**
 * Collects all used numbers from an array of records for the given year.
 */
function collectUsedNumbers(
  rows: Array<Record<string, string | null>> | null,
  field: string,
  year: number
): Set<number> {
  const used = new Set<number>()
  for (const row of rows || []) {
    const num = parseNumberSegment(year, row[field] ?? '')
    if (num != null) used.add(num)
  }
  return used
}

/**
 * Computes the next number: max(used) + 1, or fallback if no numbers exist.
 */
function nextFromUsed(used: Set<number>, fallback: number): number {
  if (used.size > 0) {
    return Math.max(...used) + 1
  }
  return fallback
}

// ============================================
// Invoice numbering
// ============================================

/**
 * Generates the next invoice number.
 * Format: {prefix}{year}-{number} e.g. "R-2026-0001"
 *
 * NOTE: This function does NOT "reserve" a number – it only computes the suggestion.
 * The actual number is assigned when the invoice is saved.
 */
export async function getNextInvoiceNumber(): Promise<string> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const { data: settings, error: loadError } = await supabase
    .from('company_settings')
    .select('id, invoice_prefix, next_invoice_number')
    .eq('user_id', user.id)
    .single()

  if (loadError || !settings) {
    throw new Error('Firmeneinstellungen nicht gefunden. Bitte zuerst Einstellungen speichern.')
  }

  const prefix = settings.invoice_prefix || 'R-'
  const year = new Date().getFullYear()

  const { data: existing } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('user_id', user.id)

  const used = collectUsedNumbers(existing, 'invoice_number', year)
  const n = nextFromUsed(used, settings.next_invoice_number || 1)

  return `${prefix}${year}-${String(n).padStart(4, '0')}`
}

/**
 * Returns the next invoice number as a preview without reserving it.
 */
export async function peekNextInvoiceNumber(): Promise<string> {
  const user = await getCurrentUser()
  if (!user) return 'R-' + new Date().getFullYear() + '-0001'

  const settings = await getCompanySettings()
  if (!settings) return 'R-' + new Date().getFullYear() + '-0001'

  const prefix = settings.invoicePrefix || 'R-'
  const year = new Date().getFullYear()

  const { data: existing } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('user_id', user.id)

  const used = collectUsedNumbers(existing, 'invoice_number', year)
  const n = nextFromUsed(used, settings.nextInvoiceNumber || 1)

  return `${prefix}${year}-${String(n).padStart(4, '0')}`
}

// ============================================
// Order numbering
// ============================================

/**
 * Generates the next order number.
 * Format: {prefix}{year}-{number} e.g. "K-2026-0001"
 */
export async function getNextOrderNumber(): Promise<string> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const { data: settings, error: loadError } = await supabase
    .from('company_settings')
    .select('id, order_prefix, next_order_number')
    .eq('user_id', user.id)
    .single()

  if (loadError || !settings) {
    throw new Error('Firmeneinstellungen nicht gefunden. Bitte zuerst Einstellungen speichern.')
  }

  const prefix = settings.order_prefix || 'K-'
  const year = new Date().getFullYear()

  const { data: existing } = await supabase
    .from('projects')
    .select('order_number')
    .eq('user_id', user.id)

  const used = collectUsedNumbers(existing, 'order_number', year)
  const n = nextFromUsed(used, settings.next_order_number || 1)

  const orderNumber = `${prefix}${year}-${String(n).padStart(4, '0')}`

  const nextCounter = Math.max(settings.next_order_number || 1, n + 1)
  const { error: updateError } = await supabase
    .from('company_settings')
    .update({
      next_order_number: nextCounter,
      updated_at: new Date().toISOString(),
    })
    .eq('id', settings.id)

  if (updateError) {
    throw new Error('Fehler beim Aktualisieren des Auftragszählers: ' + updateError.message)
  }

  return orderNumber
}

/**
 * Returns the next order number as a preview without reserving it.
 */
export async function peekNextOrderNumber(): Promise<string> {
  const user = await getCurrentUser()
  if (!user) return 'K-' + new Date().getFullYear() + '-0001'

  const settings = await getCompanySettings()
  if (!settings) return 'K-' + new Date().getFullYear() + '-0001'

  const prefix = settings.orderPrefix || 'K-'
  const year = new Date().getFullYear()

  const { data: existing } = await supabase
    .from('projects')
    .select('order_number')
    .eq('user_id', user.id)

  const used = collectUsedNumbers(existing, 'order_number', year)
  const n = nextFromUsed(used, settings.nextOrderNumber || 1)

  return `${prefix}${year}-${String(n).padStart(4, '0')}`
}

// ============================================
// Delivery note numbering
// ============================================

/**
 * Generates the next delivery note number.
 * Format: {prefix}{year}-{number} e.g. "LS-2026-0001"
 */
export async function getNextDeliveryNoteNumber(): Promise<string> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const { data: settings, error: loadError } = await supabase
    .from('company_settings')
    .select('id, delivery_note_prefix, next_delivery_note_number')
    .eq('user_id', user.id)
    .single()

  if (loadError || !settings) {
    throw new Error('Firmeneinstellungen nicht gefunden. Bitte zuerst Einstellungen speichern.')
  }

  const prefix = settings.delivery_note_prefix || 'LS-'
  const year = new Date().getFullYear()

  const { data: existing } = await supabase
    .from('customer_delivery_notes')
    .select('delivery_note_number')
    .eq('user_id', user.id)

  const used = collectUsedNumbers(existing, 'delivery_note_number', year)
  const n = nextFromUsed(used, settings.next_delivery_note_number || 1)

  return `${prefix}${year}-${String(n).padStart(4, '0')}`
}

/**
 * Returns the next delivery note number as a preview without reserving it.
 */
export async function peekNextDeliveryNoteNumber(): Promise<string> {
  const user = await getCurrentUser()
  if (!user) return 'LS-' + new Date().getFullYear() + '-0001'

  const settings = await getCompanySettings()
  if (!settings) return 'LS-' + new Date().getFullYear() + '-0001'

  const prefix = settings.deliveryNotePrefix || 'LS-'
  const year = new Date().getFullYear()

  const { data: existing } = await supabase
    .from('customer_delivery_notes')
    .select('delivery_note_number')
    .eq('user_id', user.id)

  const used = collectUsedNumbers(existing, 'delivery_note_number', year)
  const n = nextFromUsed(used, settings.nextDeliveryNoteNumber || 1)

  return `${prefix}${year}-${String(n).padStart(4, '0')}`
}
