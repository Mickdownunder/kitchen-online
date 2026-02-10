import type { SupplierInvoice } from '@/types'
import { supabase } from '../../client'
import {
  buildInputTaxBuckets,
  buildSupplierInvoiceStats,
  mapCustomCategoryFromRow,
  mapSupplierInvoiceFromRow,
} from './mappers'
import type {
  InputTaxBucket,
  SupplierInvoiceCustomCategory,
  SupplierInvoiceCustomCategoryRow,
  SupplierInvoiceRow,
  SupplierInvoiceStats,
} from './types'
import { isNotFoundError, getTodayIsoDate } from './validators'

export async function getSupplierInvoices(projectId?: string): Promise<SupplierInvoice[]> {
  let query = supabase
    .from('supplier_invoices')
    .select('*')
    .order('invoice_date', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  const rows = (data || []) as SupplierInvoiceRow[]
  return rows.map(mapSupplierInvoiceFromRow)
}

export async function getSupplierInvoice(id: string): Promise<SupplierInvoice | null> {
  const { data, error } = await supabase.from('supplier_invoices').select('*').eq('id', id).single()

  if (error) {
    if (isNotFoundError(error)) {
      return null
    }

    throw error
  }

  return mapSupplierInvoiceFromRow(data as SupplierInvoiceRow)
}

export async function getSupplierInvoicesByDateRange(
  startDate: string,
  endDate: string,
): Promise<SupplierInvoice[]> {
  const { data, error } = await supabase
    .from('supplier_invoices')
    .select('*')
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate)
    .order('invoice_date', { ascending: true })

  if (error) {
    throw error
  }

  const rows = (data || []) as SupplierInvoiceRow[]
  return rows.map(mapSupplierInvoiceFromRow)
}

export async function getOpenSupplierInvoices(): Promise<SupplierInvoice[]> {
  const { data, error } = await supabase
    .from('supplier_invoices')
    .select('*')
    .eq('is_paid', false)
    .order('due_date', { ascending: true, nullsFirst: false })

  if (error) {
    throw error
  }

  const rows = (data || []) as SupplierInvoiceRow[]
  return rows.map(mapSupplierInvoiceFromRow)
}

export async function getOverdueSupplierInvoices(): Promise<SupplierInvoice[]> {
  const today = getTodayIsoDate()

  const { data, error } = await supabase
    .from('supplier_invoices')
    .select('*')
    .eq('is_paid', false)
    .lt('due_date', today)
    .order('due_date', { ascending: true })

  if (error) {
    throw error
  }

  const rows = (data || []) as SupplierInvoiceRow[]
  return rows.map(mapSupplierInvoiceFromRow)
}

export async function getSupplierInvoiceCustomCategories(): Promise<SupplierInvoiceCustomCategory[]> {
  const { data, error } = await supabase
    .from('supplier_invoice_custom_categories')
    .select('id, user_id, name, created_at')
    .order('name')

  if (error) {
    throw error
  }

  const rows = (data || []) as SupplierInvoiceCustomCategoryRow[]
  return rows.map(mapCustomCategoryFromRow)
}

export async function getSupplierInvoiceStats(
  startDate: string,
  endDate: string,
): Promise<SupplierInvoiceStats> {
  const invoices = await getSupplierInvoicesByDateRange(startDate, endDate)
  return buildSupplierInvoiceStats(invoices)
}

export async function getInputTaxForUVA(
  startDate: string,
  endDate: string,
): Promise<InputTaxBucket[]> {
  const invoices = await getSupplierInvoicesByDateRange(startDate, endDate)
  return buildInputTaxBuckets(invoices)
}
