import { fail, ok, type ServiceResult } from '@/lib/types/service'
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
import { getTodayIsoDate, isNotFoundError, toInternalErrorResult } from './validators'

export async function getSupplierInvoices(
  projectId?: string,
): Promise<ServiceResult<SupplierInvoice[]>> {
  let query = supabase
    .from('supplier_invoices')
    .select('*')
    .order('invoice_date', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) {
    return toInternalErrorResult(error)
  }

  const rows = (data || []) as SupplierInvoiceRow[]
  return ok(rows.map(mapSupplierInvoiceFromRow))
}

export async function getSupplierInvoice(id: string): Promise<ServiceResult<SupplierInvoice>> {
  const { data, error } = await supabase.from('supplier_invoices').select('*').eq('id', id).single()

  if (error) {
    if (isNotFoundError(error)) {
      return fail('NOT_FOUND', `Supplier invoice ${id} not found`)
    }

    return toInternalErrorResult(error)
  }

  return ok(mapSupplierInvoiceFromRow(data as SupplierInvoiceRow))
}

export async function getSupplierInvoicesByDateRange(
  startDate: string,
  endDate: string,
): Promise<ServiceResult<SupplierInvoice[]>> {
  const { data, error } = await supabase
    .from('supplier_invoices')
    .select('*')
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate)
    .order('invoice_date', { ascending: true })

  if (error) {
    return toInternalErrorResult(error)
  }

  const rows = (data || []) as SupplierInvoiceRow[]
  return ok(rows.map(mapSupplierInvoiceFromRow))
}

export async function getOpenSupplierInvoices(): Promise<ServiceResult<SupplierInvoice[]>> {
  const { data, error } = await supabase
    .from('supplier_invoices')
    .select('*')
    .eq('is_paid', false)
    .order('due_date', { ascending: true, nullsFirst: false })

  if (error) {
    return toInternalErrorResult(error)
  }

  const rows = (data || []) as SupplierInvoiceRow[]
  return ok(rows.map(mapSupplierInvoiceFromRow))
}

export async function getOverdueSupplierInvoices(): Promise<ServiceResult<SupplierInvoice[]>> {
  const today = getTodayIsoDate()

  const { data, error } = await supabase
    .from('supplier_invoices')
    .select('*')
    .eq('is_paid', false)
    .lt('due_date', today)
    .order('due_date', { ascending: true })

  if (error) {
    return toInternalErrorResult(error)
  }

  const rows = (data || []) as SupplierInvoiceRow[]
  return ok(rows.map(mapSupplierInvoiceFromRow))
}

export async function getSupplierInvoiceCustomCategories(): Promise<
  ServiceResult<SupplierInvoiceCustomCategory[]>
> {
  const { data, error } = await supabase
    .from('supplier_invoice_custom_categories')
    .select('id, user_id, name, created_at')
    .order('name')

  if (error) {
    return toInternalErrorResult(error)
  }

  const rows = (data || []) as SupplierInvoiceCustomCategoryRow[]
  return ok(rows.map(mapCustomCategoryFromRow))
}

export async function getSupplierInvoiceStats(
  startDate: string,
  endDate: string,
): Promise<ServiceResult<SupplierInvoiceStats>> {
  const invoicesResult = await getSupplierInvoicesByDateRange(startDate, endDate)
  if (!invoicesResult.ok) {
    return invoicesResult
  }

  return ok(buildSupplierInvoiceStats(invoicesResult.data))
}

export async function getInputTaxForUVA(
  startDate: string,
  endDate: string,
): Promise<ServiceResult<InputTaxBucket[]>> {
  const invoicesResult = await getSupplierInvoicesByDateRange(startDate, endDate)
  if (!invoicesResult.ok) {
    return invoicesResult
  }

  return ok(buildInputTaxBuckets(invoicesResult.data))
}
