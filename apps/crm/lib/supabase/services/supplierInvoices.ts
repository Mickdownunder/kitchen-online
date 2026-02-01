/**
 * Supplier Invoices Service
 * Eingangsrechnungen von Lieferanten für Buchhaltung
 * Wichtig für: Vorsteuerabzug, UVA, DATEV-Export
 */

import { supabase } from '../client'
import { SupplierInvoice, SupplierInvoiceCategory, PaymentMethod } from '@/types'

// ============================================
// Mapping: DB Schema (snake_case) <-> TypeScript (camelCase)
// ============================================

interface DBSupplierInvoice {
  id: string
  user_id: string
  supplier_name: string
  supplier_uid: string | null
  supplier_address: string | null
  invoice_number: string
  invoice_date: string
  due_date: string | null
  net_amount: number
  tax_amount: number
  gross_amount: number
  tax_rate: number
  is_paid: boolean
  paid_date: string | null
  payment_method: string | null
  category: string
  skonto_percent?: number | null
  skonto_amount?: number | null
  project_id: string | null
  document_url: string | null
  document_name: string | null
  notes: string | null
  datev_account: string | null
  cost_center: string | null
  created_at: string
  updated_at: string
}

function mapFromDB(db: DBSupplierInvoice): SupplierInvoice {
  return {
    id: db.id,
    userId: db.user_id,
    supplierName: db.supplier_name,
    supplierUid: db.supplier_uid || undefined,
    supplierAddress: db.supplier_address || undefined,
    invoiceNumber: db.invoice_number,
    invoiceDate: db.invoice_date,
    dueDate: db.due_date || undefined,
    netAmount: db.net_amount,
    taxAmount: db.tax_amount,
    grossAmount: db.gross_amount,
    taxRate: db.tax_rate,
    isPaid: db.is_paid,
    paidDate: db.paid_date || undefined,
    paymentMethod: (db.payment_method as PaymentMethod) || undefined,
    category: db.category as SupplierInvoiceCategory | string,
    skontoPercent: db.skonto_percent ?? undefined,
    skontoAmount: db.skonto_amount ?? undefined,
    projectId: db.project_id || undefined,
    documentUrl: db.document_url || undefined,
    documentName: db.document_name || undefined,
    notes: db.notes || undefined,
    datevAccount: db.datev_account || undefined,
    costCenter: db.cost_center || undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}

// ============================================
// CRUD Operations
// ============================================

export interface CreateSupplierInvoiceInput {
  supplierName: string
  supplierUid?: string
  supplierAddress?: string
  invoiceNumber: string
  invoiceDate?: string
  dueDate?: string
  netAmount: number
  taxAmount?: number
  grossAmount?: number
  taxRate?: number
  category?: SupplierInvoiceCategory | string
  skontoPercent?: number
  skontoAmount?: number
  projectId?: string
  documentUrl?: string
  documentName?: string
  notes?: string
  datevAccount?: string
  costCenter?: string
}

/**
 * Erstellt eine neue Eingangsrechnung
 */
export async function createSupplierInvoice(
  input: CreateSupplierInvoiceInput
): Promise<SupplierInvoice> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const taxRate = input.taxRate ?? 20
  const netAmount = input.netAmount
  const taxAmount = input.taxAmount ?? Math.round(netAmount * (taxRate / 100) * 100) / 100
  const grossAmount = input.grossAmount ?? Math.round((netAmount + taxAmount) * 100) / 100

  const { data, error } = await supabase
    .from('supplier_invoices')
    .insert({
      user_id: user.id,
      supplier_name: input.supplierName,
      supplier_uid: input.supplierUid || null,
      supplier_address: input.supplierAddress || null,
      invoice_number: input.invoiceNumber,
      invoice_date: input.invoiceDate || new Date().toISOString().split('T')[0],
      due_date: input.dueDate || null,
      net_amount: netAmount,
      tax_amount: taxAmount,
      gross_amount: grossAmount,
      tax_rate: taxRate,
      category: input.category || 'material',
      skonto_percent: input.skontoPercent ?? null,
      skonto_amount: input.skontoAmount ?? null,
      project_id: input.projectId || null,
      document_url: input.documentUrl || null,
      document_name: input.documentName || null,
      notes: input.notes || null,
      datev_account: input.datevAccount || null,
      cost_center: input.costCenter || null,
    })
    .select()
    .single()

  if (error) throw error
  return mapFromDB(data as DBSupplierInvoice)
}

/**
 * Holt alle Eingangsrechnungen (optional gefiltert nach Projekt)
 */
export async function getSupplierInvoices(projectId?: string): Promise<SupplierInvoice[]> {
  let query = supabase
    .from('supplier_invoices')
    .select('*')
    .order('invoice_date', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) throw error
  return (data as DBSupplierInvoice[]).map(mapFromDB)
}

/**
 * Holt eine einzelne Eingangsrechnung
 */
export async function getSupplierInvoice(id: string): Promise<SupplierInvoice | null> {
  const { data, error } = await supabase.from('supplier_invoices').select('*').eq('id', id).single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return mapFromDB(data as DBSupplierInvoice)
}

/**
 * Holt Eingangsrechnungen in einem Zeitraum
 */
export async function getSupplierInvoicesByDateRange(
  startDate: string,
  endDate: string
): Promise<SupplierInvoice[]> {
  const { data, error } = await supabase
    .from('supplier_invoices')
    .select('*')
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate)
    .order('invoice_date', { ascending: true })

  if (error) throw error
  return (data as DBSupplierInvoice[]).map(mapFromDB)
}

/**
 * Holt offene (unbezahlte) Eingangsrechnungen
 */
export async function getOpenSupplierInvoices(): Promise<SupplierInvoice[]> {
  const { data, error } = await supabase
    .from('supplier_invoices')
    .select('*')
    .eq('is_paid', false)
    .order('due_date', { ascending: true, nullsFirst: false })

  if (error) throw error
  return (data as DBSupplierInvoice[]).map(mapFromDB)
}

/**
 * Holt überfällige Eingangsrechnungen
 */
export async function getOverdueSupplierInvoices(): Promise<SupplierInvoice[]> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('supplier_invoices')
    .select('*')
    .eq('is_paid', false)
    .lt('due_date', today)
    .order('due_date', { ascending: true })

  if (error) throw error
  return (data as DBSupplierInvoice[]).map(mapFromDB)
}

export interface UpdateSupplierInvoiceInput {
  supplierName?: string
  supplierUid?: string
  supplierAddress?: string
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
  netAmount?: number
  taxAmount?: number
  grossAmount?: number
  taxRate?: number
  isPaid?: boolean
  paidDate?: string
  paymentMethod?: PaymentMethod
  category?: SupplierInvoiceCategory | string
  skontoPercent?: number
  skontoAmount?: number
  projectId?: string | null
  documentUrl?: string
  documentName?: string
  notes?: string
  datevAccount?: string
  costCenter?: string
}

/**
 * Aktualisiert eine Eingangsrechnung
 */
export async function updateSupplierInvoice(
  id: string,
  input: UpdateSupplierInvoiceInput
): Promise<SupplierInvoice> {
  const updateData: Record<string, unknown> = {}

  if (input.supplierName !== undefined) updateData.supplier_name = input.supplierName
  if (input.supplierUid !== undefined) updateData.supplier_uid = input.supplierUid || null
  if (input.supplierAddress !== undefined)
    updateData.supplier_address = input.supplierAddress || null
  if (input.invoiceNumber !== undefined) updateData.invoice_number = input.invoiceNumber
  if (input.invoiceDate !== undefined) updateData.invoice_date = input.invoiceDate
  if (input.dueDate !== undefined) updateData.due_date = input.dueDate || null
  if (input.netAmount !== undefined) updateData.net_amount = input.netAmount
  if (input.taxAmount !== undefined) updateData.tax_amount = input.taxAmount
  if (input.grossAmount !== undefined) updateData.gross_amount = input.grossAmount
  if (input.taxRate !== undefined) updateData.tax_rate = input.taxRate
  if (input.isPaid !== undefined) updateData.is_paid = input.isPaid
  if (input.paidDate !== undefined) updateData.paid_date = input.paidDate || null
  if (input.paymentMethod !== undefined) updateData.payment_method = input.paymentMethod || null
  if (input.category !== undefined) updateData.category = input.category
  if (input.skontoPercent !== undefined) updateData.skonto_percent = input.skontoPercent ?? null
  if (input.skontoAmount !== undefined) updateData.skonto_amount = input.skontoAmount ?? null
  if (input.projectId !== undefined) updateData.project_id = input.projectId
  if (input.documentUrl !== undefined) updateData.document_url = input.documentUrl || null
  if (input.documentName !== undefined) updateData.document_name = input.documentName || null
  if (input.notes !== undefined) updateData.notes = input.notes || null
  if (input.datevAccount !== undefined) updateData.datev_account = input.datevAccount || null
  if (input.costCenter !== undefined) updateData.cost_center = input.costCenter || null

  const { data, error } = await supabase
    .from('supplier_invoices')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return mapFromDB(data as DBSupplierInvoice)
}

/**
 * Markiert eine Eingangsrechnung als bezahlt
 */
export async function markSupplierInvoicePaid(
  id: string,
  paidDate?: string,
  paymentMethod?: PaymentMethod
): Promise<SupplierInvoice> {
  return updateSupplierInvoice(id, {
    isPaid: true,
    paidDate: paidDate || new Date().toISOString().split('T')[0],
    paymentMethod,
  })
}

/**
 * Markiert eine Eingangsrechnung als unbezahlt
 */
export async function markSupplierInvoiceUnpaid(id: string): Promise<SupplierInvoice> {
  return updateSupplierInvoice(id, {
    isPaid: false,
    paidDate: undefined,
    paymentMethod: undefined,
  })
}

/**
 * Löscht eine Eingangsrechnung
 */
export async function deleteSupplierInvoice(id: string): Promise<void> {
  const { error } = await supabase.from('supplier_invoices').delete().eq('id', id)

  if (error) throw error
}

// ============================================
// Benutzerdefinierte Kategorien
// ============================================

export interface SupplierInvoiceCustomCategory {
  id: string
  userId: string
  name: string
  createdAt: string
}

export async function getSupplierInvoiceCustomCategories(): Promise<SupplierInvoiceCustomCategory[]> {
  const { data, error } = await supabase
    .from('supplier_invoice_custom_categories')
    .select('id, user_id, name, created_at')
    .order('name')

  if (error) throw error
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: row.created_at,
  }))
}

export async function addSupplierInvoiceCustomCategory(name: string): Promise<SupplierInvoiceCustomCategory> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const trimmed = name.trim()
  if (!trimmed) throw new Error('Kategorie-Name darf nicht leer sein')

  const { data, error } = await supabase
    .from('supplier_invoice_custom_categories')
    .insert({ user_id: user.id, name: trimmed })
    .select('id, user_id, name, created_at')
    .single()

  if (error) throw error
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    createdAt: data.created_at,
  }
}

export async function deleteSupplierInvoiceCustomCategory(id: string): Promise<void> {
  const { error } = await supabase.from('supplier_invoice_custom_categories').delete().eq('id', id)
  if (error) throw error
}

// ============================================
// Statistiken für Buchhaltung
// ============================================

export interface SupplierInvoiceStats {
  totalCount: number
  totalNetAmount: number
  totalTaxAmount: number // Gesamte Vorsteuer
  totalGrossAmount: number
  paidCount: number
  paidAmount: number
  openCount: number
  openAmount: number
  overdueCount: number
  overdueAmount: number
  byCategory: {
    category: SupplierInvoiceCategory
    count: number
    netAmount: number
    taxAmount: number
  }[]
  byTaxRate: {
    taxRate: number
    count: number
    netAmount: number
    taxAmount: number
  }[]
}

/**
 * Berechnet Statistiken für Eingangsrechnungen in einem Zeitraum
 */
export async function getSupplierInvoiceStats(
  startDate: string,
  endDate: string
): Promise<SupplierInvoiceStats> {
  const invoices = await getSupplierInvoicesByDateRange(startDate, endDate)
  const today = new Date().toISOString().split('T')[0]

  const paid = invoices.filter(inv => inv.isPaid)
  const open = invoices.filter(inv => !inv.isPaid)
  const overdue = open.filter(inv => inv.dueDate && inv.dueDate < today)

  // Gruppierung nach Kategorie
  const categoryMap = new Map<
    SupplierInvoiceCategory,
    { count: number; netAmount: number; taxAmount: number }
  >()
  invoices.forEach(inv => {
    const existing = categoryMap.get(inv.category) || { count: 0, netAmount: 0, taxAmount: 0 }
    categoryMap.set(inv.category, {
      count: existing.count + 1,
      netAmount: existing.netAmount + inv.netAmount,
      taxAmount: existing.taxAmount + inv.taxAmount,
    })
  })

  // Gruppierung nach Steuersatz
  const taxRateMap = new Map<number, { count: number; netAmount: number; taxAmount: number }>()
  invoices.forEach(inv => {
    const existing = taxRateMap.get(inv.taxRate) || { count: 0, netAmount: 0, taxAmount: 0 }
    taxRateMap.set(inv.taxRate, {
      count: existing.count + 1,
      netAmount: existing.netAmount + inv.netAmount,
      taxAmount: existing.taxAmount + inv.taxAmount,
    })
  })

  return {
    totalCount: invoices.length,
    totalNetAmount: invoices.reduce((sum, inv) => sum + inv.netAmount, 0),
    totalTaxAmount: invoices.reduce((sum, inv) => sum + inv.taxAmount, 0),
    totalGrossAmount: invoices.reduce((sum, inv) => sum + inv.grossAmount, 0),
    paidCount: paid.length,
    paidAmount: paid.reduce((sum, inv) => sum + inv.grossAmount, 0),
    openCount: open.length,
    openAmount: open.reduce((sum, inv) => sum + inv.grossAmount, 0),
    overdueCount: overdue.length,
    overdueAmount: overdue.reduce((sum, inv) => sum + inv.grossAmount, 0),
    byCategory: Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      ...data,
    })),
    byTaxRate: Array.from(taxRateMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([taxRate, data]) => ({
        taxRate,
        ...data,
      })),
  }
}

// ============================================
// UVA-Hilfsfunktionen
// ============================================

/**
 * Berechnet die Vorsteuer für die UVA
 * Gruppiert nach Steuersätzen
 */
export async function getInputTaxForUVA(
  startDate: string,
  endDate: string
): Promise<{ taxRate: number; netAmount: number; taxAmount: number }[]> {
  const invoices = await getSupplierInvoicesByDateRange(startDate, endDate)

  const taxRateMap = new Map<number, { netAmount: number; taxAmount: number }>()

  invoices.forEach(inv => {
    const existing = taxRateMap.get(inv.taxRate) || { netAmount: 0, taxAmount: 0 }
    taxRateMap.set(inv.taxRate, {
      netAmount: existing.netAmount + inv.netAmount,
      taxAmount: existing.taxAmount + inv.taxAmount,
    })
  })

  return Array.from(taxRateMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([taxRate, data]) => ({
      taxRate,
      netAmount: Math.round(data.netAmount * 100) / 100,
      taxAmount: Math.round(data.taxAmount * 100) / 100,
    }))
}
