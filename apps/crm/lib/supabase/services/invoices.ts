import { supabase } from '../client'
import { Invoice, InvoiceType, InvoiceScheduleType, CustomerProject } from '@/types'
import { getCurrentUser } from './auth'
import { getNextInvoiceNumber } from './company'
import { audit } from '@/lib/utils/auditLogger'
import { logger } from '@/lib/utils/logger'

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
      projects (
        id,
        customer_name,
        order_number,
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

  // Beträge berechnen wenn nicht alle angegeben
  const taxRate = params.taxRate || 20
  let netAmount = params.netAmount
  let taxAmount = params.taxAmount

  if (netAmount === undefined || taxAmount === undefined) {
    // Brutto ist angegeben, berechne Netto und MwSt
    netAmount = params.amount / (1 + taxRate / 100)
    taxAmount = params.amount - netAmount
  }

  const invoiceDate = params.invoiceDate || new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      user_id: user.id,
      project_id: params.projectId,
      invoice_number: invoiceNumber,
      type: params.type,
      amount: params.amount,
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
  if (updates.amount !== undefined) updateData.amount = updates.amount
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
      paidCount: 0,
      overdueCount: 0,
    }
  }

  const invoices = data || []

  return {
    totalInvoiced: invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
    totalPaid: invoices.filter(inv => inv.is_paid).reduce((sum, inv) => sum + (inv.amount || 0), 0),
    totalOutstanding: invoices
      .filter(inv => !inv.is_paid)
      .reduce((sum, inv) => sum + (inv.amount || 0), 0),
    partialCount: invoices.filter(inv => inv.type === 'partial').length,
    finalCount: invoices.filter(inv => inv.type === 'final').length,
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
