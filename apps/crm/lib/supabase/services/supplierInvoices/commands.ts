import { ok, type ServiceResult } from '@/lib/types/service'
import type { PaymentMethod, SupplierInvoice } from '@/types'
import { supabase } from '../../client'
import {
  mapCreateInputToInsert,
  mapCustomCategoryFromRow,
  mapCustomCategoryToInsert,
  mapSupplierInvoiceFromRow,
  mapUpdateInputToRow,
} from './mappers'
import type {
  CreateSupplierInvoiceInput,
  SupplierInvoiceCustomCategory,
  SupplierInvoiceCustomCategoryRow,
  SupplierInvoiceRow,
  UpdateSupplierInvoiceInput,
} from './types'
import {
  ensureAuthenticatedUserId,
  ensureNonEmptyCategoryName,
  getTodayIsoDate,
  toInternalErrorResult,
} from './validators'

export async function createSupplierInvoice(
  input: CreateSupplierInvoiceInput,
): Promise<ServiceResult<SupplierInvoice>> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const userResult = ensureAuthenticatedUserId(user)
  if (!userResult.ok) {
    return userResult
  }

  const { data, error } = await supabase
    .from('supplier_invoices')
    .insert(mapCreateInputToInsert(userResult.data, input))
    .select()
    .single()

  if (error) {
    return toInternalErrorResult(error)
  }

  return ok(mapSupplierInvoiceFromRow(data as SupplierInvoiceRow))
}

export async function updateSupplierInvoice(
  id: string,
  input: UpdateSupplierInvoiceInput,
): Promise<ServiceResult<SupplierInvoice>> {
  const { data, error } = await supabase
    .from('supplier_invoices')
    .update(mapUpdateInputToRow(input))
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return toInternalErrorResult(error)
  }

  return ok(mapSupplierInvoiceFromRow(data as SupplierInvoiceRow))
}

export async function markSupplierInvoicePaid(
  id: string,
  paidDate?: string,
  paymentMethod?: PaymentMethod,
): Promise<ServiceResult<SupplierInvoice>> {
  return updateSupplierInvoice(id, {
    isPaid: true,
    paidDate: paidDate || getTodayIsoDate(),
    paymentMethod,
  })
}

export async function markSupplierInvoiceUnpaid(
  id: string,
): Promise<ServiceResult<SupplierInvoice>> {
  return updateSupplierInvoice(id, {
    isPaid: false,
    paidDate: undefined,
    paymentMethod: undefined,
  })
}

export async function deleteSupplierInvoice(id: string): Promise<ServiceResult<void>> {
  const { error } = await supabase.from('supplier_invoices').delete().eq('id', id)

  if (error) {
    return toInternalErrorResult(error)
  }

  return ok(undefined)
}

export async function addSupplierInvoiceCustomCategory(
  name: string,
): Promise<ServiceResult<SupplierInvoiceCustomCategory>> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const userResult = ensureAuthenticatedUserId(user)
  if (!userResult.ok) {
    return userResult
  }

  const categoryNameResult = ensureNonEmptyCategoryName(name)
  if (!categoryNameResult.ok) {
    return categoryNameResult
  }

  const { data, error } = await supabase
    .from('supplier_invoice_custom_categories')
    .insert(mapCustomCategoryToInsert(userResult.data, categoryNameResult.data))
    .select('id, user_id, name, created_at')
    .single()

  if (error) {
    return toInternalErrorResult(error)
  }

  return ok(mapCustomCategoryFromRow(data as SupplierInvoiceCustomCategoryRow))
}

export async function deleteSupplierInvoiceCustomCategory(
  id: string,
): Promise<ServiceResult<void>> {
  const { error } = await supabase.from('supplier_invoice_custom_categories').delete().eq('id', id)

  if (error) {
    return toInternalErrorResult(error)
  }

  return ok(undefined)
}
