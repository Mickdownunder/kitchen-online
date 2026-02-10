import type { Invoice } from '@/types'
import { fail, ok, type ServiceResult } from '@/lib/types/service'
import { supabase } from '../../client'
import { getCurrentUser } from '../auth'
import { buildInvoiceStats, mapInvoiceFromRow, mapInvoiceWithProjectFromRow } from './mappers'
import type {
  InvoiceRowExt,
  InvoiceStats,
  InvoiceStatsRow,
  InvoiceWithProjectRow,
} from './types'
import { EMPTY_INVOICE_STATS } from './types'
import {
  ensureAuthenticatedUserId,
  getTodayIsoDate,
  isNotFoundError,
  toInternalErrorResult,
} from './validators'

export async function getInvoices(projectId?: string): Promise<ServiceResult<Invoice[]>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  let query = supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userResult.data)
    .order('invoice_date', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) {
    return toInternalErrorResult(error)
  }

  const rows = (data ?? []) as InvoiceRowExt[]
  return ok(rows.map(mapInvoiceFromRow))
}

export async function getInvoice(id: string): Promise<ServiceResult<Invoice>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('user_id', userResult.data)
    .single()

  if (error) {
    if (isNotFoundError(error)) {
      return fail('NOT_FOUND', `Invoice ${id} not found`)
    }

    return toInternalErrorResult(error)
  }

  return ok(mapInvoiceFromRow(data as InvoiceRowExt))
}

export async function getInvoiceByNumber(invoiceNumber: string): Promise<ServiceResult<Invoice>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('invoice_number', invoiceNumber)
    .eq('user_id', userResult.data)
    .single()

  if (error) {
    if (isNotFoundError(error)) {
      return fail('NOT_FOUND', `Invoice ${invoiceNumber} not found`)
    }

    return toInternalErrorResult(error)
  }

  return ok(mapInvoiceFromRow(data as InvoiceRowExt))
}

export async function getOpenInvoices(): Promise<ServiceResult<Invoice[]>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userResult.data)
    .eq('is_paid', false)
    .order('due_date', { ascending: true })

  if (error) {
    return toInternalErrorResult(error)
  }

  const rows = (data ?? []) as InvoiceRowExt[]
  return ok(rows.map(mapInvoiceFromRow))
}

export async function getOverdueInvoices(): Promise<ServiceResult<Invoice[]>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const today = getTodayIsoDate()

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userResult.data)
    .eq('is_paid', false)
    .lt('due_date', today)
    .order('due_date', { ascending: true })

  if (error) {
    return toInternalErrorResult(error)
  }

  const rows = (data ?? []) as InvoiceRowExt[]
  return ok(rows.map(mapInvoiceFromRow))
}

export async function getInvoicesWithProject(projectId?: string): Promise<ServiceResult<Invoice[]>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

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
    .eq('user_id', userResult.data)
    .order('invoice_date', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) {
    return toInternalErrorResult(error)
  }

  const rows = (data ?? []) as unknown as InvoiceWithProjectRow[]
  return ok(rows.map(mapInvoiceWithProjectFromRow))
}

export async function getExistingCreditNotes(
  originalInvoiceId: string,
): Promise<ServiceResult<Invoice[]>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userResult.data)
    .eq('original_invoice_id' as string, originalInvoiceId)
    .eq('type', 'credit')

  if (error) {
    return toInternalErrorResult(error)
  }

  const rows = (data ?? []) as InvoiceRowExt[]
  return ok(rows.map(mapInvoiceFromRow))
}

export async function getRemainingCancellableAmount(
  invoiceId: string,
): Promise<ServiceResult<number>> {
  const invoiceResult = await getInvoice(invoiceId)
  if (!invoiceResult.ok) {
    return invoiceResult
  }

  const creditNotesResult = await getExistingCreditNotes(invoiceId)
  if (!creditNotesResult.ok) {
    return creditNotesResult
  }

  const alreadyCancelled = creditNotesResult.data.reduce((sum, note) => sum + Math.abs(note.amount), 0)
  return ok(Math.max(0, invoiceResult.data.amount - alreadyCancelled))
}

export async function canCancelInvoice(
  invoiceId: string,
): Promise<ServiceResult<{ canCancel: boolean; reason?: string; remainingAmount?: number }>> {
  const invoiceResult = await getInvoice(invoiceId)

  if (!invoiceResult.ok) {
    return ok({ canCancel: false, reason: 'Rechnung nicht gefunden' })
  }

  if (invoiceResult.data.type === 'credit') {
    return ok({ canCancel: false, reason: 'Stornorechnungen können nicht storniert werden' })
  }

  const remainingResult = await getRemainingCancellableAmount(invoiceId)
  if (!remainingResult.ok) {
    return remainingResult
  }

  if (remainingResult.data <= 0) {
    return ok({ canCancel: false, reason: 'Rechnung wurde bereits vollständig storniert' })
  }

  return ok({ canCancel: true, remainingAmount: remainingResult.data })
}

export async function getInvoiceStats(year: number): Promise<ServiceResult<InvoiceStats>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return ok(EMPTY_INVOICE_STATS)
  }

  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`
  const today = getTodayIsoDate()

  const { data, error } = await supabase
    .from('invoices')
    .select('id, amount, is_paid, type, due_date, invoice_date')
    .eq('user_id', userResult.data)
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate)

  if (error) {
    return toInternalErrorResult(error)
  }

  return ok(buildInvoiceStats((data ?? []) as InvoiceStatsRow[], today))
}
