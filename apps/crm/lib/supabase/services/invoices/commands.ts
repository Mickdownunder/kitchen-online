import { audit } from '@/lib/utils/auditLogger'
import { logger } from '@/lib/utils/logger'
import { fail, ok, type ServiceResult } from '@/lib/types/service'
import { roundTo2Decimals } from '@/lib/utils/priceCalculations'
import type { Invoice } from '@/types'
import { supabase } from '../../client'
import { getCurrentUser } from '../auth'
import { getNextInvoiceNumber } from '../company'
import { mapCreateInvoiceToInsert, mapInvoiceFromRow, mapInvoiceUpdateToRow } from './mappers'
import { getInvoice, getRemainingCancellableAmount } from './queries'
import type {
  CreateCreditNoteParams,
  CreateInvoiceParams,
  InvoiceInsert,
  InvoiceRowExt,
  UpdateInvoiceInput,
} from './types'
import {
  ensureAuthenticatedUserId,
  ensureInvoiceCanBeCancelled,
  getTodayIsoDate,
  getTodayLocaleDateDeAT,
  resolveCancelAmount,
  toInternalErrorResult,
} from './validators'

export async function createInvoice(params: CreateInvoiceParams): Promise<ServiceResult<Invoice>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const invoiceNumber = params.invoiceNumber || (await getNextInvoiceNumber())
  const invoiceDate = params.invoiceDate || getTodayIsoDate()

  const insert = mapCreateInvoiceToInsert(userResult.data, invoiceNumber, {
    ...params,
    invoiceDate,
  })

  const { data, error } = await supabase.from('invoices').insert(insert).select().single()

  if (error) {
    return toInternalErrorResult(error)
  }

  const createdInvoice = mapInvoiceFromRow(data as InvoiceRowExt)

  audit.invoiceCreated(createdInvoice.id, {
    invoiceNumber: createdInvoice.invoiceNumber,
    type: createdInvoice.type,
    amount: createdInvoice.amount,
    projectId: createdInvoice.projectId,
  })

  return ok(createdInvoice)
}

export async function updateInvoice(
  id: string,
  updates: UpdateInvoiceInput,
): Promise<ServiceResult<Invoice>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const { data, error } = await supabase
    .from('invoices')
    .update(mapInvoiceUpdateToRow(updates))
    .eq('id', id)
    .eq('user_id', userResult.data)
    .select()
    .single()

  if (error) {
    return toInternalErrorResult(error)
  }

  return ok(mapInvoiceFromRow(data as InvoiceRowExt))
}

export async function markInvoicePaid(
  id: string,
  paidDate?: string,
): Promise<ServiceResult<Invoice>> {
  const actualPaidDate = paidDate || getTodayIsoDate()
  const result = await updateInvoice(id, {
    isPaid: true,
    paidDate: actualPaidDate,
  })

  if (result.ok) {
    audit.invoicePaid(id, actualPaidDate)
  }

  return result
}

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

export async function deleteInvoice(id: string): Promise<ServiceResult<void>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)
    .eq('user_id', userResult.data)

  if (error) {
    return toInternalErrorResult(error)
  }

  return ok(undefined)
}

export async function createCreditNote(
  params: CreateCreditNoteParams,
): Promise<ServiceResult<Invoice>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const originalResult = await getInvoice(params.invoiceId)
  if (!originalResult.ok) {
    return originalResult
  }

  const originalInvoice = originalResult.data
  const canCancelTypeResult = ensureInvoiceCanBeCancelled(originalInvoice.type)
  if (!canCancelTypeResult.ok) {
    return canCancelTypeResult
  }

  const remainingResult = await getRemainingCancellableAmount(params.invoiceId)
  if (!remainingResult.ok) {
    return remainingResult
  }

  const remainingAmount = remainingResult.data
  if (remainingAmount <= 0) {
    return fail('VALIDATION', 'Diese Rechnung wurde bereits vollständig storniert')
  }

  const cancelAmountResult = resolveCancelAmount(params.partialAmount, remainingAmount)
  if (!cancelAmountResult.ok) {
    return cancelAmountResult
  }

  const cancelAmount = cancelAmountResult.data
  const proportion = cancelAmount / originalInvoice.amount
  const creditAmount = roundTo2Decimals(-cancelAmount)
  const creditNetAmount = roundTo2Decimals(-originalInvoice.netAmount * proportion)
  const creditTaxAmount = roundTo2Decimals(creditAmount - creditNetAmount)

  const invoiceNumber = await getNextInvoiceNumber()
  const isPartialCancel = cancelAmount < originalInvoice.amount
  const defaultDescription = isPartialCancel
    ? `Teilstorno zu ${originalInvoice.invoiceNumber} (${cancelAmount.toFixed(2)}€ von ${originalInvoice.amount.toFixed(2)}€)`
    : `Stornorechnung zu ${originalInvoice.invoiceNumber}`

  const invoiceDate = getTodayIsoDate()

  const insert: InvoiceInsert & { original_invoice_id: string } = {
    user_id: userResult.data,
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
    notes: params.notes || `Storno erstellt am ${getTodayLocaleDateDeAT()}`,
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

  if (error) {
    return toInternalErrorResult(error)
  }

  const creditNote = mapInvoiceFromRow(data as InvoiceRowExt)
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
