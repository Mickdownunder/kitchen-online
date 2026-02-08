import { supabase } from '../client'
import type { Invoice, InvoiceType, InvoiceScheduleType, CustomerProject, Reminder } from '@/types'
import { getCurrentUser } from './auth'
import { getNextInvoiceNumber } from './company'
import { audit } from '@/lib/utils/auditLogger'
import { logger } from '@/lib/utils/logger'
import { roundTo2Decimals } from '@/lib/utils/priceCalculations'
import type { ServiceResult, Row, Insert, Update } from '@/lib/types/service'
import { ok, fail } from '@/lib/types/service'

type InvoiceRow = Row<'invoices'>
type InvoiceInsert = Insert<'invoices'>
type InvoiceUpdate = Update<'invoices'>

/**
 * `original_invoice_id` exists in the DB schema (for credit notes) but is
 * missing from the auto-generated types.  We extend the row type here so
 * the rest of the file stays type-safe without `any`.
 */
type InvoiceRowExt = InvoiceRow & {
  original_invoice_id?: string | null
  original_invoice_number?: string | null
}

// ============================================
// INVOICE SERVICE - CRUD Operations
// ============================================

/** Alle Rechnungen laden (optional nach Projekt gefiltert) */
export async function getInvoices(projectId?: string): Promise<ServiceResult<Invoice[]>> {
  const user = await getCurrentUser()
  if (!user) return fail('UNAUTHORIZED', 'Not authenticated')

  let query = supabase
    .from('invoices')
    .select('*')
    .eq('user_id', user.id)
    .order('invoice_date', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) return fail('INTERNAL', error.message, error)
  return ok((data ?? []).map(row => mapInvoiceFromDB(row as InvoiceRowExt)))
}

/** Einzelne Rechnung laden */
export async function getInvoice(id: string): Promise<ServiceResult<Invoice>> {
  const user = await getCurrentUser()
  if (!user) return fail('UNAUTHORIZED', 'Not authenticated')

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    const code = (error as { code?: string }).code
    if (code === 'PGRST116') return fail('NOT_FOUND', `Invoice ${id} not found`)
    return fail('INTERNAL', error.message, error)
  }

  return ok(mapInvoiceFromDB(data as InvoiceRowExt))
}

/** Rechnung nach Rechnungsnummer laden */
export async function getInvoiceByNumber(
  invoiceNumber: string,
): Promise<ServiceResult<Invoice>> {
  const user = await getCurrentUser()
  if (!user) return fail('UNAUTHORIZED', 'Not authenticated')

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('invoice_number', invoiceNumber)
    .eq('user_id', user.id)
    .single()

  if (error) {
    const code = (error as { code?: string }).code
    if (code === 'PGRST116') return fail('NOT_FOUND', `Invoice ${invoiceNumber} not found`)
    return fail('INTERNAL', error.message, error)
  }

  return ok(mapInvoiceFromDB(data as InvoiceRowExt))
}

/** Alle unbezahlten Rechnungen laden */
export async function getOpenInvoices(): Promise<ServiceResult<Invoice[]>> {
  const user = await getCurrentUser()
  if (!user) return fail('UNAUTHORIZED', 'Not authenticated')

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_paid', false)
    .order('due_date', { ascending: true })

  if (error) return fail('INTERNAL', error.message, error)
  return ok((data ?? []).map(row => mapInvoiceFromDB(row as InvoiceRowExt)))
}

/** Alle ueberfaelligen Rechnungen laden (unbezahlt und Faelligkeitsdatum ueberschritten) */
export async function getOverdueInvoices(): Promise<ServiceResult<Invoice[]>> {
  const user = await getCurrentUser()
  if (!user) return fail('UNAUTHORIZED', 'Not authenticated')

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_paid', false)
    .lt('due_date', today)
    .order('due_date', { ascending: true })

  if (error) return fail('INTERNAL', error.message, error)
  return ok((data ?? []).map(row => mapInvoiceFromDB(row as InvoiceRowExt)))
}

/** Rechnungen fuer ein Projekt mit Projekt-Daten laden */
export async function getInvoicesWithProject(
  projectId?: string,
): Promise<ServiceResult<Invoice[]>> {
  const user = await getCurrentUser()
  if (!user) return fail('UNAUTHORIZED', 'Not authenticated')

  let query = supabase
    .from('invoices')
    .select(
      `
      *,
      project:projects (
        id,
        customer_name,
        order_number,
        customer_address,
        customer_phone,
        customer_email,
        customer_id,
        total_amount,
        net_amount,
        tax_amount
      )
    `,
    )
    .eq('user_id', user.id)
    .order('invoice_date', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) return fail('INTERNAL', error.message, error)

  const invoices = (data ?? []).map(row => {
    const invoice = mapInvoiceFromDB(row as unknown as InvoiceRowExt)
    const proj = row.project as Record<string, unknown> | null
    if (proj) {
      invoice.project = {
        id: proj.id,
        customerName: proj.customer_name,
        orderNumber: proj.order_number,
        address: proj.customer_address,
        phone: proj.customer_phone,
        email: proj.customer_email,
        customerId: proj.customer_id,
        totalAmount: proj.total_amount,
        netAmount: proj.net_amount,
        taxAmount: proj.tax_amount,
      } as CustomerProject
    }
    return invoice
  })

  return ok(invoices)
}

// ============================================
// CREATE / UPDATE / DELETE
// ============================================

interface CreateInvoiceParams {
  projectId: string
  type: InvoiceType
  amount: number
  netAmount?: number
  taxAmount?: number
  taxRate?: number
  invoiceDate?: string
  dueDate?: string
  description?: string
  notes?: string
  scheduleType?: InvoiceScheduleType
  invoiceNumber?: string
}

/** Neue Rechnung erstellen. Generiert automatisch eine Rechnungsnummer wenn nicht angegeben. */
export async function createInvoice(params: CreateInvoiceParams): Promise<ServiceResult<Invoice>> {
  const user = await getCurrentUser()
  if (!user) return fail('UNAUTHORIZED', 'Not authenticated')

  const invoiceNumber = params.invoiceNumber || (await getNextInvoiceNumber())

  const taxRate = params.taxRate || 20
  let netAmount = params.netAmount
  let taxAmount = params.taxAmount
  const amountRounded = roundTo2Decimals(params.amount)

  if (netAmount === undefined || taxAmount === undefined) {
    const netRounded = roundTo2Decimals(amountRounded / (1 + taxRate / 100))
    netAmount = netRounded
    taxAmount = roundTo2Decimals(amountRounded - netRounded)
  }

  const invoiceDate = params.invoiceDate || new Date().toISOString().split('T')[0]

  const insert: InvoiceInsert = {
    user_id: user.id,
    project_id: params.projectId,
    invoice_number: invoiceNumber,
    type: params.type,
    amount: amountRounded,
    net_amount: netAmount,
    tax_amount: taxAmount,
    tax_rate: taxRate,
    invoice_date: invoiceDate,
    due_date: params.dueDate ?? null,
    description: params.description ?? null,
    notes: params.notes ?? null,
    schedule_type: params.scheduleType ?? null,
    is_paid: false,
    reminders: [],
  }

  const { data, error } = await supabase.from('invoices').insert(insert).select().single()

  if (error) return fail('INTERNAL', error.message, error)

  const createdInvoice = mapInvoiceFromDB(data as InvoiceRowExt)

  audit.invoiceCreated(createdInvoice.id, {
    invoiceNumber: createdInvoice.invoiceNumber,
    type: createdInvoice.type,
    amount: createdInvoice.amount,
    projectId: createdInvoice.projectId,
  })

  return ok(createdInvoice)
}

/** Rechnung aktualisieren */
export async function updateInvoice(
  id: string,
  updates: Partial<Omit<Invoice, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
): Promise<ServiceResult<Invoice>> {
  const user = await getCurrentUser()
  if (!user) return fail('UNAUTHORIZED', 'Not authenticated')

  const updateData: InvoiceUpdate = {}

  if (updates.projectId !== undefined) updateData.project_id = updates.projectId
  if (updates.invoiceNumber !== undefined) updateData.invoice_number = updates.invoiceNumber
  if (updates.type !== undefined) updateData.type = updates.type
  if (updates.amount !== undefined) updateData.amount = roundTo2Decimals(updates.amount)
  if (updates.netAmount !== undefined) updateData.net_amount = roundTo2Decimals(updates.netAmount)
  if (updates.taxAmount !== undefined) updateData.tax_amount = roundTo2Decimals(updates.taxAmount)
  if (updates.taxRate !== undefined) updateData.tax_rate = updates.taxRate
  if (updates.invoiceDate !== undefined) updateData.invoice_date = updates.invoiceDate
  if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate
  if (updates.isPaid !== undefined) updateData.is_paid = updates.isPaid
  if (updates.paidDate !== undefined) updateData.paid_date = updates.paidDate
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.notes !== undefined) updateData.notes = updates.notes
  if (updates.scheduleType !== undefined) updateData.schedule_type = updates.scheduleType
  if (updates.reminders !== undefined)
    updateData.reminders = updates.reminders as unknown as InvoiceUpdate['reminders']

  const { data, error } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return fail('INTERNAL', error.message, error)
  return ok(mapInvoiceFromDB(data as InvoiceRowExt))
}

/** Rechnung als bezahlt markieren */
export async function markInvoicePaid(
  id: string,
  paidDate?: string,
): Promise<ServiceResult<Invoice>> {
  const actualPaidDate = paidDate || new Date().toISOString().split('T')[0]
  const result = await updateInvoice(id, {
    isPaid: true,
    paidDate: actualPaidDate,
  })

  if (result.ok) {
    audit.invoicePaid(id, actualPaidDate)
  }

  return result
}

/** Rechnung als unbezahlt markieren */
export async function markInvoiceUnpaid(id: string): Promise<ServiceResult<Invoice>> {
  const result = await updateInvoice(id, {
    isPaid: false,
    paidDate: undefined,
  })

  if (result.ok) {
    audit.invoiceUnpaid(id)
  }

  return result
}

/** Rechnung loeschen */
export async function deleteInvoice(id: string): Promise<ServiceResult<void>> {
  const user = await getCurrentUser()
  if (!user) return fail('UNAUTHORIZED', 'Not authenticated')

  const { error } = await supabase.from('invoices').delete().eq('id', id).eq('user_id', user.id)

  if (error) return fail('INTERNAL', error.message, error)
  return ok(undefined)
}

// ============================================
// STORNORECHNUNGEN (Credit Notes)
// ============================================

interface CreateCreditNoteParams {
  invoiceId: string
  partialAmount?: number
  description?: string
  notes?: string
}

/** Prueft ob eine Rechnung bereits (voll) storniert wurde */
export async function getExistingCreditNotes(
  originalInvoiceId: string,
): Promise<ServiceResult<Invoice[]>> {
  const user = await getCurrentUser()
  if (!user) return fail('UNAUTHORIZED', 'Not authenticated')

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', user.id)
    .eq('original_invoice_id' as string, originalInvoiceId)
    .eq('type', 'credit')

  if (error) return fail('INTERNAL', error.message, error)
  return ok((data ?? []).map(row => mapInvoiceFromDB(row as InvoiceRowExt)))
}

/** Berechnet den noch stornierbaren Restbetrag einer Rechnung */
export async function getRemainingCancellableAmount(
  invoiceId: string,
): Promise<ServiceResult<number>> {
  const invoiceResult = await getInvoice(invoiceId)
  if (!invoiceResult.ok) return invoiceResult

  const creditNotesResult = await getExistingCreditNotes(invoiceId)
  if (!creditNotesResult.ok) return creditNotesResult

  const alreadyCancelled = creditNotesResult.data.reduce(
    (sum, cn) => sum + Math.abs(cn.amount),
    0,
  )

  return ok(Math.max(0, invoiceResult.data.amount - alreadyCancelled))
}

/**
 * Stornorechnung erstellen.
 * Erstellt eine Rechnung mit negativen Betraegen (Spiegelung der Originalrechnung).
 */
export async function createCreditNote(
  params: CreateCreditNoteParams,
): Promise<ServiceResult<Invoice>> {
  const user = await getCurrentUser()
  if (!user) return fail('UNAUTHORIZED', 'Not authenticated')

  // 1. Originalrechnung laden
  const originalResult = await getInvoice(params.invoiceId)
  if (!originalResult.ok) return originalResult
  const originalInvoice = originalResult.data

  // 2. Pruefen ob Originalrechnung selbst eine Stornorechnung ist
  if (originalInvoice.type === 'credit') {
    return fail('VALIDATION', 'Eine Stornorechnung kann nicht storniert werden')
  }

  // 3. Pruefen wieviel noch stornierbar ist
  const remainingResult = await getRemainingCancellableAmount(params.invoiceId)
  if (!remainingResult.ok) return remainingResult
  const remainingAmount = remainingResult.data

  if (remainingAmount <= 0) {
    return fail('VALIDATION', 'Diese Rechnung wurde bereits vollständig storniert')
  }

  // 4. Storno-Betrag bestimmen
  let cancelAmount: number
  if (params.partialAmount !== undefined && params.partialAmount > 0) {
    if (params.partialAmount > remainingAmount) {
      return fail(
        'VALIDATION',
        `Teilstorno-Betrag (${params.partialAmount.toFixed(2)}€) übersteigt den noch stornierbaren Betrag (${remainingAmount.toFixed(2)}€)`,
      )
    }
    cancelAmount = params.partialAmount
  } else {
    cancelAmount = remainingAmount
  }

  // 5. Betraege berechnen (NEGATIV!)
  const proportion = cancelAmount / originalInvoice.amount
  const creditAmount = roundTo2Decimals(-cancelAmount)
  const creditNetAmount = roundTo2Decimals(-originalInvoice.netAmount * proportion)
  const creditTaxAmount = roundTo2Decimals(creditAmount - creditNetAmount)

  // 6. Rechnungsnummer generieren
  const invoiceNumber = await getNextInvoiceNumber()

  // 7. Beschreibung erstellen
  const isPartialCancel = cancelAmount < originalInvoice.amount
  const defaultDescription = isPartialCancel
    ? `Teilstorno zu ${originalInvoice.invoiceNumber} (${cancelAmount.toFixed(2)}€ von ${originalInvoice.amount.toFixed(2)}€)`
    : `Stornorechnung zu ${originalInvoice.invoiceNumber}`

  const invoiceDate = new Date().toISOString().split('T')[0]

  // 8. Stornorechnung erstellen
  const insert: InvoiceInsert & { original_invoice_id: string } = {
    user_id: user.id,
    project_id: originalInvoice.projectId,
    invoice_number: invoiceNumber,
    type: 'credit',
    amount: creditAmount,
    net_amount: creditNetAmount,
    tax_amount: creditTaxAmount,
    tax_rate: originalInvoice.taxRate,
    invoice_date: invoiceDate,
    due_date: null,
    description: params.description || defaultDescription,
    notes:
      params.notes || `Storno erstellt am ${new Date().toLocaleDateString('de-AT')}`,
    original_invoice_id: originalInvoice.id,
    is_paid: true,
    paid_date: invoiceDate,
    reminders: [],
  }

  const { data, error } = await supabase
    .from('invoices')
    .insert(insert as InvoiceInsert)
    .select()
    .single()

  if (error) return fail('INTERNAL', error.message, error)

  const creditNote = mapInvoiceFromDB(data as InvoiceRowExt)
  creditNote.originalInvoiceNumber = originalInvoice.invoiceNumber

  audit.invoiceCreated(creditNote.id, {
    invoiceNumber: creditNote.invoiceNumber,
    type: 'credit',
    amount: creditNote.amount,
    projectId: creditNote.projectId,
    originalInvoiceId: originalInvoice.id,
    originalInvoiceNumber: originalInvoice.invoiceNumber,
  })

  logger.info('Credit note created', {
    component: 'invoices',
    creditNoteId: creditNote.id,
    creditNoteNumber: creditNote.invoiceNumber,
    originalInvoiceId: originalInvoice.id,
    originalInvoiceNumber: originalInvoice.invoiceNumber,
    amount: creditNote.amount,
    isPartialCancel,
  })

  return ok(creditNote)
}

/** Prueft ob eine Rechnung stornierbar ist */
export async function canCancelInvoice(
  invoiceId: string,
): Promise<
  ServiceResult<{ canCancel: boolean; reason?: string; remainingAmount?: number }>
> {
  const invoiceResult = await getInvoice(invoiceId)

  if (!invoiceResult.ok) {
    return ok({ canCancel: false, reason: 'Rechnung nicht gefunden' })
  }

  if (invoiceResult.data.type === 'credit') {
    return ok({
      canCancel: false,
      reason: 'Stornorechnungen können nicht storniert werden',
    })
  }

  const remainingResult = await getRemainingCancellableAmount(invoiceId)
  if (!remainingResult.ok) return remainingResult

  if (remainingResult.data <= 0) {
    return ok({
      canCancel: false,
      reason: 'Rechnung wurde bereits vollständig storniert',
    })
  }

  return ok({ canCancel: true, remainingAmount: remainingResult.data })
}

// ============================================
// STATISTIK-FUNKTIONEN
// ============================================

interface InvoiceStats {
  totalInvoiced: number
  totalPaid: number
  totalOutstanding: number
  partialCount: number
  finalCount: number
  creditCount: number
  creditAmount: number
  paidCount: number
  overdueCount: number
}

const EMPTY_STATS: InvoiceStats = {
  totalInvoiced: 0,
  totalPaid: 0,
  totalOutstanding: 0,
  partialCount: 0,
  finalCount: 0,
  creditCount: 0,
  creditAmount: 0,
  paidCount: 0,
  overdueCount: 0,
}

/** Rechnungsstatistik fuer ein Jahr */
export async function getInvoiceStats(year: number): Promise<ServiceResult<InvoiceStats>> {
  const user = await getCurrentUser()
  if (!user) return ok(EMPTY_STATS)

  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('invoices')
    .select('id, amount, is_paid, type, due_date, invoice_date')
    .eq('user_id', user.id)
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate)

  if (error) return fail('INTERNAL', error.message, error)

  const invoices = data ?? []
  const creditNotes = invoices.filter(inv => inv.type === 'credit')

  return ok({
    totalInvoiced: invoices.reduce((sum, inv) => sum + (inv.amount ?? 0), 0),
    totalPaid: invoices.filter(inv => inv.is_paid).reduce((sum, inv) => sum + (inv.amount ?? 0), 0),
    totalOutstanding: invoices
      .filter(inv => !inv.is_paid)
      .reduce((sum, inv) => sum + (inv.amount ?? 0), 0),
    partialCount: invoices.filter(inv => inv.type === 'partial').length,
    finalCount: invoices.filter(inv => inv.type === 'final').length,
    creditCount: creditNotes.length,
    creditAmount: creditNotes.reduce((sum, inv) => sum + Math.abs(inv.amount ?? 0), 0),
    paidCount: invoices.filter(inv => inv.is_paid).length,
    overdueCount: invoices.filter(inv => !inv.is_paid && inv.due_date && inv.due_date < today)
      .length,
  })
}

// ============================================
// MAPPING
// ============================================

function mapInvoiceFromDB(row: InvoiceRowExt): Invoice {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    invoiceNumber: row.invoice_number,
    type: row.type as InvoiceType,
    amount: row.amount ?? 0,
    netAmount: row.net_amount ?? 0,
    taxAmount: row.tax_amount ?? 0,
    taxRate: row.tax_rate ?? 20,
    invoiceDate: row.invoice_date,
    dueDate: row.due_date ?? undefined,
    isPaid: row.is_paid ?? false,
    paidDate: row.paid_date ?? undefined,
    description: row.description ?? undefined,
    notes: row.notes ?? undefined,
    scheduleType: (row.schedule_type as InvoiceScheduleType) ?? undefined,
    originalInvoiceId: row.original_invoice_id ?? undefined,
    originalInvoiceNumber: row.original_invoice_number ?? undefined,
    reminders: (row.reminders as unknown as Reminder[]) ?? [],
    overdueDays: computeOverdueDays(row),
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  }
}

function computeOverdueDays(row: InvoiceRowExt): number | undefined {
  if (row.is_paid || !row.due_date) return undefined

  const dueDate = new Date(row.due_date)
  const today = new Date()
  const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

  return diffDays > 0 ? diffDays : undefined
}
