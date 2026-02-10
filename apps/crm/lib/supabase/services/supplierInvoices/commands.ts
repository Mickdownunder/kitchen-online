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
import { getTodayIsoDate, requireAuthenticatedUserId, requireNonEmptyCategoryName } from './validators'

export async function createSupplierInvoice(
  input: CreateSupplierInvoiceInput,
): Promise<SupplierInvoice> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const userId = requireAuthenticatedUserId(user)

  const { data, error } = await supabase
    .from('supplier_invoices')
    .insert(mapCreateInputToInsert(userId, input))
    .select()
    .single()

  if (error) {
    throw error
  }

  return mapSupplierInvoiceFromRow(data as SupplierInvoiceRow)
}

export async function updateSupplierInvoice(
  id: string,
  input: UpdateSupplierInvoiceInput,
): Promise<SupplierInvoice> {
  const { data, error } = await supabase
    .from('supplier_invoices')
    .update(mapUpdateInputToRow(input))
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return mapSupplierInvoiceFromRow(data as SupplierInvoiceRow)
}

export async function markSupplierInvoicePaid(
  id: string,
  paidDate?: string,
  paymentMethod?: PaymentMethod,
): Promise<SupplierInvoice> {
  return updateSupplierInvoice(id, {
    isPaid: true,
    paidDate: paidDate || getTodayIsoDate(),
    paymentMethod,
  })
}

export async function markSupplierInvoiceUnpaid(id: string): Promise<SupplierInvoice> {
  return updateSupplierInvoice(id, {
    isPaid: false,
    paidDate: undefined,
    paymentMethod: undefined,
  })
}

export async function deleteSupplierInvoice(id: string): Promise<void> {
  const { error } = await supabase.from('supplier_invoices').delete().eq('id', id)

  if (error) {
    throw error
  }
}

export async function addSupplierInvoiceCustomCategory(
  name: string,
): Promise<SupplierInvoiceCustomCategory> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const userId = requireAuthenticatedUserId(user)
  const trimmedName = requireNonEmptyCategoryName(name)

  const { data, error } = await supabase
    .from('supplier_invoice_custom_categories')
    .insert(mapCustomCategoryToInsert(userId, trimmedName))
    .select('id, user_id, name, created_at')
    .single()

  if (error) {
    throw error
  }

  return mapCustomCategoryFromRow(data as SupplierInvoiceCustomCategoryRow)
}

export async function deleteSupplierInvoiceCustomCategory(id: string): Promise<void> {
  const { error } = await supabase.from('supplier_invoice_custom_categories').delete().eq('id', id)

  if (error) {
    throw error
  }
}
