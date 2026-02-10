import { fail, ok, type ServiceResult } from '@/lib/types/service'
import type { CustomerDeliveryNote, DeliveryNote, GoodsReceipt } from '@/types'
import { logger } from '@/lib/utils/logger'
import { supabase } from '../../client'
import { getCurrentUser } from '../auth'
import {
  mapCustomerDeliveryNoteFromDB,
  mapDeliveryNoteFromDB,
  mapGoodsReceiptFromDB,
} from './mappers'
import {
  ensureAuthenticatedUserId,
  isNotFoundError,
  toInternalErrorResult,
} from './validators'

export async function getDeliveryNotes(): Promise<ServiceResult<DeliveryNote[]>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const { data, error } = await supabase
    .from('delivery_notes')
    .select(
      `
      *,
      delivery_note_items (*)
    `,
    )
    .eq('user_id', userResult.data)
    .order('received_date', { ascending: false })

  if (error) {
    logger.error('Error fetching delivery notes', { component: 'delivery' }, error as Error)
    return toInternalErrorResult(error)
  }

  return ok((data || []).map(mapDeliveryNoteFromDB))
}

export async function getDeliveryNote(id: string): Promise<ServiceResult<DeliveryNote>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const { data, error } = await supabase
    .from('delivery_notes')
    .select(
      `
      *,
      delivery_note_items (*)
    `,
    )
    .eq('id', id)
    .eq('user_id', userResult.data)
    .single()

  if (error) {
    if (isNotFoundError(error)) {
      return fail('NOT_FOUND', `Delivery note ${id} not found`)
    }

    return toInternalErrorResult(error)
  }

  return ok(mapDeliveryNoteFromDB(data))
}

export async function getGoodsReceipts(projectId?: string): Promise<ServiceResult<GoodsReceipt[]>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  let query = supabase
    .from('goods_receipts')
    .select(
      `
      *,
      goods_receipt_items (*)
    `,
    )
    .eq('user_id', userResult.data)

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query.order('receipt_date', { ascending: false })

  if (error) {
    logger.error('Error fetching goods receipts', { component: 'delivery' }, error as Error)
    return toInternalErrorResult(error)
  }

  return ok((data || []).map(mapGoodsReceiptFromDB))
}

export async function getCustomerDeliveryNotes(
  projectId?: string,
): Promise<ServiceResult<CustomerDeliveryNote[]>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  let query = supabase
    .from('customer_delivery_notes')
    .select('*')
    .eq('user_id', userResult.data)
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) {
    const errObj = error as Error & { code?: string; details?: string; hint?: string }
    logger.error('getCustomerDeliveryNotes error', {
      component: 'delivery',
      message: errObj.message,
      code: errObj.code,
      details: errObj.details,
      hint: errObj.hint,
    })

    if (errObj.code === '42P01' || errObj.message?.includes('does not exist')) {
      return fail(
        'INTERNAL',
        'Die Tabelle customer_delivery_notes existiert noch nicht. Bitte führen Sie das SQL-Script in Supabase aus.',
        error,
      )
    }

    return toInternalErrorResult(error)
  }

  return ok((data || []).map(mapCustomerDeliveryNoteFromDB))
}

export async function getCustomerDeliveryNote(
  id: string,
): Promise<ServiceResult<CustomerDeliveryNote>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const { data, error } = await supabase
    .from('customer_delivery_notes')
    .select('*')
    .eq('id', id)
    .eq('user_id', userResult.data)
    .single()

  if (error) {
    if (isNotFoundError(error)) {
      return fail('NOT_FOUND', `Customer delivery note ${id} not found`)
    }

    return toInternalErrorResult(error)
  }

  return ok(mapCustomerDeliveryNoteFromDB(data))
}
