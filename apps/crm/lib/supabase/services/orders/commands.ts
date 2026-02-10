import { ok, type ServiceResult } from '@/lib/types/service'
import type { Order } from '@/types'
import { logger } from '@/lib/utils/logger'
import { supabase } from '../../client'
import { getCurrentUser } from '../auth'
import { mapOrderFromRow } from './mappers'
import { getOrderByProject } from './queries'
import type { CreateOrderParams, OrderInsert, OrderRow, OrderUpdate, UpdateOrderInput } from './types'
import { ensureAuthenticatedUserId, toInternalErrorResult } from './validators'

function getTodayIsoDate(): string {
  return new Date().toISOString().split('T')[0]
}

function mapCreateParamsToInsert(userId: string, params: CreateOrderParams): OrderInsert {
  return {
    user_id: userId,
    project_id: params.projectId,
    order_number: params.orderNumber,
    order_date: params.orderDate || getTodayIsoDate(),
    status: params.status || 'draft',
    footer_text: params.footerText || null,
    agb_snapshot: params.agbSnapshot || null,
  }
}

function mapUpdateInputToRow(updates: UpdateOrderInput): OrderUpdate {
  const updateData: OrderUpdate = {}

  if (updates.projectId !== undefined) updateData.project_id = updates.projectId
  if (updates.orderNumber !== undefined) updateData.order_number = updates.orderNumber
  if (updates.orderDate !== undefined) updateData.order_date = updates.orderDate
  if (updates.status !== undefined) updateData.status = updates.status
  if (updates.footerText !== undefined) updateData.footer_text = updates.footerText
  if (updates.agbSnapshot !== undefined) updateData.agb_snapshot = updates.agbSnapshot
  if (updates.sentAt !== undefined) updateData.sent_at = updates.sentAt
  if (updates.confirmedAt !== undefined) updateData.confirmed_at = updates.confirmedAt

  return updateData
}

export async function createOrder(params: CreateOrderParams): Promise<ServiceResult<Order>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const { data, error } = await supabase
    .from('orders')
    .insert(mapCreateParamsToInsert(userResult.data, params))
    .select()
    .single()

  if (error) {
    logger.error('Error creating order', { component: 'orders' }, error as Error)
    return toInternalErrorResult(error)
  }

  return ok(mapOrderFromRow(data as OrderRow))
}

export async function updateOrder(
  id: string,
  updates: UpdateOrderInput,
): Promise<ServiceResult<Order>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const { data, error } = await supabase
    .from('orders')
    .update(mapUpdateInputToRow(updates))
    .eq('id', id)
    .eq('user_id', userResult.data)
    .select()
    .single()

  if (error) {
    logger.error('Error updating order', { component: 'orders' }, error as Error)
    return toInternalErrorResult(error)
  }

  return ok(mapOrderFromRow(data as OrderRow))
}

export async function sendOrder(id: string): Promise<ServiceResult<Order>> {
  return updateOrder(id, {
    status: 'sent',
    sentAt: new Date().toISOString(),
  })
}

export async function confirmOrder(id: string): Promise<ServiceResult<Order>> {
  return updateOrder(id, {
    status: 'confirmed',
    confirmedAt: new Date().toISOString(),
  })
}

export async function cancelOrder(id: string): Promise<ServiceResult<Order>> {
  return updateOrder(id, { status: 'cancelled' })
}

export async function deleteOrder(id: string): Promise<ServiceResult<void>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const { error } = await supabase.from('orders').delete().eq('id', id).eq('user_id', userResult.data)

  if (error) {
    logger.error('Error deleting order', { component: 'orders' }, error as Error)
    return toInternalErrorResult(error)
  }

  return ok(undefined)
}

export async function upsertOrderForProject(
  projectId: string,
  orderNumber: string,
  params: Partial<CreateOrderParams>,
): Promise<ServiceResult<Order>> {
  const existingOrderResult = await getOrderByProject(projectId)

  if (existingOrderResult.ok) {
    return updateOrder(existingOrderResult.data.id, {
      orderNumber,
      ...params,
    })
  }

  return createOrder({
    projectId,
    orderNumber,
    ...params,
  })
}
