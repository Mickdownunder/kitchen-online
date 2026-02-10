import type { CustomerDeliveryNote, DeliveryNote, GoodsReceipt } from '@/types'
import { logger } from '@/lib/utils/logger'
import { supabase } from '../../client'
import { getCurrentUser } from '../auth'
import {
  mapCustomerDeliveryNoteFromDB,
  mapDeliveryNoteFromDB,
  mapGoodsReceiptFromDB,
} from './mappers'
import { isNotFoundError } from './validators'

export async function getDeliveryNotes(): Promise<DeliveryNote[]> {
  const user = await getCurrentUser()
  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('delivery_notes')
    .select(
      `
      *,
      delivery_note_items (*)
    `,
    )
    .eq('user_id', user.id)
    .order('received_date', { ascending: false })

  if (error) {
    logger.error('Error fetching delivery notes', { component: 'delivery' }, error as Error)
    return []
  }

  return (data || []).map(mapDeliveryNoteFromDB)
}

export async function getDeliveryNote(id: string): Promise<DeliveryNote | null> {
  const user = await getCurrentUser()
  if (!user) {
    return null
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
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (isNotFoundError(error)) {
      return null
    }

    throw error
  }

  return mapDeliveryNoteFromDB(data)
}

export async function getGoodsReceipts(projectId?: string): Promise<GoodsReceipt[]> {
  const user = await getCurrentUser()
  if (!user) {
    return []
  }

  let query = supabase
    .from('goods_receipts')
    .select(
      `
      *,
      goods_receipt_items (*)
    `,
    )
    .eq('user_id', user.id)

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query.order('receipt_date', { ascending: false })

  if (error) {
    logger.error('Error fetching goods receipts', { component: 'delivery' }, error as Error)
    return []
  }

  return (data || []).map(mapGoodsReceiptFromDB)
}

export async function getCustomerDeliveryNotes(projectId?: string): Promise<CustomerDeliveryNote[]> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      logger.warn('getCustomerDeliveryNotes: No user authenticated', { component: 'delivery' })
      return []
    }

    let query = supabase
      .from('customer_delivery_notes')
      .select('*')
      .eq('user_id', user.id)
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
        logger.warn('customer_delivery_notes table does not exist yet. Please run the SQL script.', {
          component: 'delivery',
        })
        return []
      }

      return []
    }

    return (data || []).map(mapCustomerDeliveryNoteFromDB)
  } catch (error: unknown) {
    const err = error as { message?: string; name?: string; stack?: string }
    if (err?.message?.includes('aborted') || err?.name === 'AbortError') {
      return []
    }

    logger.error('getCustomerDeliveryNotes failed', {
      component: 'delivery',
      message: err?.message,
      stack: err?.stack,
    })

    return []
  }
}

export async function getCustomerDeliveryNote(id: string): Promise<CustomerDeliveryNote | null> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return null
    }

    const { data, error } = await supabase
      .from('customer_delivery_notes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      logger.error('getCustomerDeliveryNote error', { component: 'delivery' }, error as Error)
      return null
    }

    return mapCustomerDeliveryNoteFromDB(data)
  } catch (error) {
    logger.error('getCustomerDeliveryNote failed', { component: 'delivery' }, error as Error)
    return null
  }
}
