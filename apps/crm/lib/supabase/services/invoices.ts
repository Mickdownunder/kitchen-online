import { supabase } from '../client'
import { Invoice, InvoiceType, InvoiceScheduleType, CustomerProject } from '@/types'
import { getCurrentUser } from './auth'
import { getNextInvoiceNumber } from './company'
import { audit } from '@/lib/utils/auditLogger'
import { logger } from '@/lib/utils/logger'
import { roundTo2Decimals } from '@/lib/utils/priceCalculations'

// ============================================
// INVOICE SERVICE - CRUD Operations
// ============================================

/**
 * Alle Rechnungen laden (optional nach Projekt gefiltert)
 */
export async function getInvoices(projectId?: string): Promise<Invoice[]> {
  const user = await getCurrentUser()
  if (!user) return []

  let query = supabase
    .from('invoices')
    .select('*')
    .eq('user_id', user.id)
    .order('invoice_date', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Error fetching invoices', { component: 'invoices' }, error as Error)
    return []
  }

  return (data || []).map(mapInvoiceFromDB)
}

/**
 * Einzelne Rechnung laden
 */
export async function getInvoice(id: string): Promise<Invoice | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if ((error as { code?: string }).code === 'PGRST116') return null
    logger.error('Error fetching invoice', { component: 'invoices' }, error as Error)
    return null
  }

  return mapInvoiceFromDB(data)
}

/**
 * Rechnung nach Rechnungsnummer laden
 */
export async function getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('invoice_number', invoiceNumber)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if ((error as { code?: string }).code === 'PGRST116') return null
    logger.error('Error fetching invoice by number', { component: 'invoices' }, error as Error)
    return null
  }

  return mapInvoiceFromDB(data)
}

/**
 * Alle unbezahlten Rechnungen laden
 */
export async function getOpenInvoices(): Promise<Invoice[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_paid', false)
    .order('due_date', { ascending: true })

  if (error) {
    logger.error('Error fetching open invoices', { component: 'invoices' }, error as Error)
    return []
  }

  return (data || []).map(mapInvoiceFromDB)
}

/**
 * Alle überfälligen Rechnungen laden (unbezahlt und Fälligkeitsdatum überschritten)
 */
export async function getOverdueInvoices(): Promise<Invoice[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_paid', false)
    .lt('due_date', today)
    .order('due_date', { ascending: true })

  if (error) {
    logger.error('Error fetching overdue invoices', { component: 'invoices' }, error as Error)
    return []
  }

  return (data || []).map(mapInvoiceFromDB)
}

/**
 * Rechnungen für ein Projekt mit Projekt-Daten laden
 */
export async function getInvoicesWithProject(projectId?: string): Promise<Invoice[]> {
  const user = await getCurrentUser()
  if (!user) return []

  let query = supabase
    .from('invoices')
    .select(
      `
      *,
      projects!left (
        id,
        customer_name,
        order_number,
        address,
        phone,
        email,
        customer_id,
        total_amount,
        net_amount,
        tax_amount
      )
    `
    )
    .eq('user_id', user.id)
    .order('invoice_date', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Error fetching invoices with project', { component: 'invoices' }, error as Error)
    return []
  }

  return (data || []).map(row => {
    const invoice = mapInvoiceFromDB(row)
    if (row.projects) {
      invoice.project = {
        id: row.projects.id,
        customerName: row.projects.customer_name,
        orderNumber: row.projects.order_number,
        address: row.projects.address,
        phone: row.projects.phone,
        email: row.projects.email,
        customerId: row.projects.customer_id,
        totalAmount: row.projects.total_amount,
        netAmount: row.projects.net_amount,
        taxAmount: row.projects.tax_amount,
      } as CustomerProject
    }
    return invoice
  })
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
  invoiceNumber?: string // Optional: wenn nicht angegeben, wird automatisch generiert
}

/**
 * Neue Rechnung erstellen
 * Generiert automatisch eine fortlaufende Rechnungsnummer wenn nicht angegeben
 */
export async function createInvoice(params: CreateInvoiceParams): Promise<Invoice> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  // Rechnungsnummer generieren wenn nicht angegeben
  const invoiceNumber = params.invoiceNumber || (await getNextInvoiceNumber())

  // Beträge berechnen wenn nicht alle angegeben (immer auf 2 Dezimalen für Buchhaltung)
  const taxRate = params.taxRate || 20
  let netAmount = params.netAmount
  let taxAmount = params.taxAmount

  const amountRounded = roundTo2Decimals(params.amount)

  if (netAmount === undefined || taxAmount === undefined) {
    // Brutto ist angegeben: Netto auf 2 Dezimalen, MwSt = Brutto - Netto (damit net + tax = amount exakt)
    const netRounded = roundTo2Decimals(amountRounded / (1 + taxRate / 100))
    netAmount = netRounded
    taxAmount = roundTo2Decimals(amountRounded - netRounded)
  }

  const invoiceDate = params.invoiceDate || new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      user_id: user.id,
      project_id: params.projectId,
      invoice_number: invoiceNumber,
      type: params.type,
      amount: amountRounded,
      net_amount: netAmount,
      tax_amount: taxAmount,
      tax_rate: taxRate,
      invoice_date: invoiceDate,
      due_date: params.dueDate || null,
      description: params.description || null,
      notes: params.notes || null,
      schedule_type: params.scheduleType || null,
      is_paid: false,
      reminders: [],
    })
    .select()
    .single()

  if (error) {
    logger.error('Error creating invoice', { component: 'invoices' }, error as Error)
    throw error
  }

  const createdInvoice = mapInvoiceFromDB(data)

  // Audit logging
  audit.invoiceCreated(createdInvoice.id, {
    invoiceNumber: createdInvoice.invoiceNumber,
    type: createdInvoice.type,
    amount: createdInvoice.amount,
    projectId: createdInvoice.projectId,
  })

  return createdInvoice
}

/**
 * Rechnung aktualisieren
 */
export async function updateInvoice(
  id: string,
  updates: Partial<Omit<Invoice, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<Invoice> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {}

  if (updates.projectId !== undefined) updateData.project_id = updates.projectId
  if (updates.invoiceNumber !== undefined) updateData.invoice_number = updates.invoiceNumber
  if (updates.type !== undefined) updateData.type = updates.type
  if (updates.amount !== undefined) updateData.amount = roundTo2Decimals(updates.amount)
  if (updates.netAmount !== undefined) updateData.net_amount = updates.netAmount
  if (updates.taxAmount !== undefined) updateData.tax_amount = updates.taxAmount
  if (updates.taxRate !== undefined) updateData.tax_rate = updates.taxRate
  if (updates.invoiceDate !== undefined) updateData.invoice_date = updates.invoiceDate
  if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate
  if (updates.isPaid !== undefined) updateData.is_paid = updates.isPaid
  if (updates.paidDate !== undefined) updateData.paid_date = updates.paidDate
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.notes !== undefined) updateData.notes = updates.notes
  if (updates.scheduleType !== undefined) updateData.schedule_type = updates.scheduleType
  if (updates.reminders !== undefined) updateData.reminders = updates.reminders

  const { data, error } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    logger.error('Error updating invoice', { component: 'invoices' }, error as Error)
    throw error
  }

  return mapInvoiceFromDB(data)
}

/**
 * Rechnung als bezahlt markieren
 */
export async function markInvoicePaid(id: string, paidDate?: string): Promise<Invoice> {
  const actualPaidDate = paidDate || new Date().toISOString().split('T')[0]
  const invoice = await updateInvoice(id, {
    isPaid: true,
    paidDate: actualPaidDate,
  })

  // Audit logging
  audit.invoicePaid(id, actualPaidDate)

  return invoice
}

/**
 * Rechnung als unbezahlt markieren
 */
export async function markInvoiceUnpaid(id: string): Promise<Invoice> {
  const invoice = await updateInvoice(id, {
    isPaid: false,
    paidDate: undefined,
  })

  // Audit logging
  audit.invoiceUnpaid(id)

  return invoice
}

/**
 * Rechnung löschen
 */
export async function deleteInvoice(id: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('invoices').delete().eq('id', id).eq('user_id', user.id)

  if (error) {
    logger.error('Error deleting invoice', { component: 'invoices' }, error as Error)
    throw error
  }
}

// ============================================
// STORNORECHNUNGEN (Credit Notes)
// ============================================

interface CreateCreditNoteParams {
  invoiceId: string // ID der zu stornierenden Rechnung
  partialAmount?: number // Optional: Teilstorno (Brutto-Betrag, positiv angeben!)
  description?: string // Optional: Beschreibung
  notes?: string // Optional: Notizen
}

/**
 * Prüft ob eine Rechnung bereits (voll) storniert wurde
 */
export async function getExistingCreditNotes(originalInvoiceId: string): Promise<Invoice[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', user.id)
    .eq('original_invoice_id', originalInvoiceId)
    .eq('type', 'credit')

  if (error) {
    logger.error('Error fetching credit notes', { component: 'invoices' }, error as Error)
    return []
  }

  return (data || []).map(mapInvoiceFromDB)
}

/**
 * Berechnet den noch stornierbaren Restbetrag einer Rechnung
 * (Originalbetrag minus bereits stornierte Beträge)
 */
export async function getRemainingCancellableAmount(invoiceId: string): Promise<number> {
  const invoice = await getInvoice(invoiceId)
  if (!invoice) return 0

  const creditNotes = await getExistingCreditNotes(invoiceId)
  
  // Summe der Stornos (negative Beträge) → Betrag wird positiv
  const alreadyCancelled = creditNotes.reduce((sum, cn) => sum + Math.abs(cn.amount), 0)
  
  return Math.max(0, invoice.amount - alreadyCancelled)
}

/**
 * Stornorechnung erstellen
 * 
 * WICHTIG: Erstellt eine Rechnung mit negativen Beträgen (Spiegelung der Originalrechnung)
 * 
 * @param params.invoiceId - ID der zu stornierenden Rechnung
 * @param params.partialAmount - Optional: Betrag für Teilstorno (positiv angeben, wird negiert)
 * @param params.description - Optional: Beschreibung für die Stornorechnung
 * @returns Die erstellte Stornorechnung mit negativen Beträgen
 */
export async function createCreditNote(params: CreateCreditNoteParams): Promise<Invoice> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  // 1. Originalrechnung laden
  const originalInvoice = await getInvoice(params.invoiceId)
  if (!originalInvoice) {
    throw new Error('Originalrechnung nicht gefunden')
  }

  // 2. Prüfen ob Originalrechnung selbst eine Stornorechnung ist
  if (originalInvoice.type === 'credit') {
    throw new Error('Eine Stornorechnung kann nicht storniert werden')
  }

  // 3. Prüfen wieviel noch stornierbar ist
  const remainingAmount = await getRemainingCancellableAmount(params.invoiceId)
  
  if (remainingAmount <= 0) {
    throw new Error('Diese Rechnung wurde bereits vollständig storniert')
  }

  // 4. Storno-Betrag bestimmen (Vollstorno oder Teilstorno)
  let cancelAmount: number
  if (params.partialAmount !== undefined && params.partialAmount > 0) {
    // Teilstorno
    if (params.partialAmount > remainingAmount) {
      throw new Error(
        `Teilstorno-Betrag (${params.partialAmount.toFixed(2)}€) übersteigt den noch stornierbaren Betrag (${remainingAmount.toFixed(2)}€)`
      )
    }
    cancelAmount = params.partialAmount
  } else {
    // Vollstorno: Restbetrag stornieren
    cancelAmount = remainingAmount
  }

  // 5. Beträge berechnen (NEGATIV!)
  // Wir berechnen proportional zum Originalbetrag
  const proportion = cancelAmount / originalInvoice.amount
  
  const creditAmount = roundTo2Decimals(-cancelAmount) // Brutto negativ
  const creditNetAmount = roundTo2Decimals(-originalInvoice.netAmount * proportion) // Netto negativ
  const creditTaxAmount = roundTo2Decimals(creditAmount - creditNetAmount) // MwSt = Brutto - Netto (auch negativ)

  // 6. Rechnungsnummer generieren
  const invoiceNumber = await getNextInvoiceNumber()

  // 7. Beschreibung erstellen
  const isPartialCancel = cancelAmount < originalInvoice.amount
  const defaultDescription = isPartialCancel
    ? `Teilstorno zu ${originalInvoice.invoiceNumber} (${cancelAmount.toFixed(2)}€ von ${originalInvoice.amount.toFixed(2)}€)`
    : `Stornorechnung zu ${originalInvoice.invoiceNumber}`

  const invoiceDate = new Date().toISOString().split('T')[0]

  // 8. Stornorechnung erstellen
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      user_id: user.id,
      project_id: originalInvoice.projectId,
      invoice_number: invoiceNumber,
      type: 'credit',
      amount: creditAmount,
      net_amount: creditNetAmount,
      tax_amount: creditTaxAmount,
      tax_rate: originalInvoice.taxRate, // Gleicher Steuersatz wie Original!
      invoice_date: invoiceDate,
      due_date: null, // Stornorechnungen haben kein Fälligkeitsdatum
      description: params.description || defaultDescription,
      notes: params.notes || `Storno erstellt am ${new Date().toLocaleDateString('de-AT')}`,
      original_invoice_id: originalInvoice.id,
      is_paid: true, // Stornorechnungen gelten als "abgeschlossen"
      paid_date: invoiceDate,
      reminders: [],
    })
    .select()
    .single()

  if (error) {
    logger.error('Error creating credit note', { component: 'invoices' }, error as Error)
    throw error
  }

  const creditNote = mapInvoiceFromDB(data)
  // Originalrechnungsnummer für Anzeige setzen
  creditNote.originalInvoiceNumber = originalInvoice.invoiceNumber

  // 9. Audit logging
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

  return creditNote
}

/**
 * Prüft ob eine Rechnung stornierbar ist
 */
export async function canCancelInvoice(invoiceId: string): Promise<{
  canCancel: boolean
  reason?: string
  remainingAmount?: number
}> {
  const invoice = await getInvoice(invoiceId)
  
  if (!invoice) {
    return { canCancel: false, reason: 'Rechnung nicht gefunden' }
  }
  
  if (invoice.type === 'credit') {
    return { canCancel: false, reason: 'Stornorechnungen können nicht storniert werden' }
  }
  
  const remainingAmount = await getRemainingCancellableAmount(invoiceId)
  
  if (remainingAmount <= 0) {
    return { canCancel: false, reason: 'Rechnung wurde bereits vollständig storniert' }
  }
  
  return { canCancel: true, remainingAmount }
}

// ============================================
// STATISTIK-FUNKTIONEN
// ============================================

/**
 * Rechnungsstatistik für ein Jahr
 */
export async function getInvoiceStats(year: number): Promise<{
  totalInvoiced: number
  totalPaid: number
  totalOutstanding: number
  partialCount: number
  finalCount: number
  creditCount: number
  creditAmount: number
  paidCount: number
  overdueCount: number
}> {
  const user = await getCurrentUser()
  if (!user) {
    return {
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
  }

  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`
  const today = new Date().toISOString().split('T')[0]

  // Nur Spalten für Statistik-Aggregation laden (Performance)
  const { data, error } = await supabase
    .from('invoices')
    .select('id, amount, is_paid, type, due_date, invoice_date')
    .eq('user_id', user.id)
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate)

  if (error) {
    logger.error('Error fetching invoice stats', { component: 'invoices' }, error as Error)
    return {
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
  }

  const invoices = data || []
  const creditNotes = invoices.filter(inv => inv.type === 'credit')

  return {
    // Hinweis: totalInvoiced enthält Stornos (negative Beträge werden subtrahiert)
    totalInvoiced: invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
    totalPaid: invoices.filter(inv => inv.is_paid).reduce((sum, inv) => sum + (inv.amount || 0), 0),
    totalOutstanding: invoices
      .filter(inv => !inv.is_paid)
      .reduce((sum, inv) => sum + (inv.amount || 0), 0),
    partialCount: invoices.filter(inv => inv.type === 'partial').length,
    finalCount: invoices.filter(inv => inv.type === 'final').length,
    creditCount: creditNotes.length,
    creditAmount: creditNotes.reduce((sum, inv) => sum + Math.abs(inv.amount || 0), 0),
    paidCount: invoices.filter(inv => inv.is_paid).length,
    overdueCount: invoices.filter(inv => !inv.is_paid && inv.due_date && inv.due_date < today)
      .length,
  }
}

// ============================================
// MAPPING FUNCTIONS
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapInvoiceFromDB(dbInvoice: Record<string, any>): Invoice {
  return {
    id: dbInvoice.id,
    userId: dbInvoice.user_id,
    projectId: dbInvoice.project_id,
    invoiceNumber: dbInvoice.invoice_number,
    type: dbInvoice.type,
    amount: parseFloat(dbInvoice.amount) || 0,
    netAmount: parseFloat(dbInvoice.net_amount) || 0,
    taxAmount: parseFloat(dbInvoice.tax_amount) || 0,
    taxRate: parseFloat(dbInvoice.tax_rate) || 20,
    invoiceDate: dbInvoice.invoice_date,
    dueDate: dbInvoice.due_date || undefined,
    isPaid: dbInvoice.is_paid || false,
    paidDate: dbInvoice.paid_date || undefined,
    description: dbInvoice.description || undefined,
    notes: dbInvoice.notes || undefined,
    scheduleType: dbInvoice.schedule_type || undefined,
    originalInvoiceId: dbInvoice.original_invoice_id || undefined,
    originalInvoiceNumber: dbInvoice.original_invoice_number || undefined, // Aus JOIN
    reminders: dbInvoice.reminders || [],
    overdueDays: calculateOverdueDays(dbInvoice),
    createdAt: dbInvoice.created_at,
    updatedAt: dbInvoice.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateOverdueDays(dbInvoice: Record<string, any>): number | undefined {
  if (dbInvoice.is_paid || !dbInvoice.due_date) return undefined

  const dueDate = new Date(dbInvoice.due_date)
  const today = new Date()
  const diffTime = today.getTime() - dueDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  return diffDays > 0 ? diffDays : undefined
}
