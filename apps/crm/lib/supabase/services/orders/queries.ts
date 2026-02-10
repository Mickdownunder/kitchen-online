import { fail, ok, type ServiceResult } from '@/lib/types/service'
import type { Order, OrderStatus } from '@/types'
import { logger } from '@/lib/utils/logger'
import { supabase } from '../../client'
import { getCurrentUser } from '../auth'
import { mapOrderFromRow, mapOrderWithProjectFromRow } from './mappers'
import type { OrderRow, OrderStats, OrderStatusRow, OrderWithProjectRow } from './types'
import {
  emptyOrderStats,
  ensureAuthenticatedUserId,
  isNotFoundError,
  toInternalErrorResult,
} from './validators'

export async function getOrders(projectId?: string): Promise<ServiceResult<Order[]>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  let query = supabase
    .from('orders')
    .select('*')
    .eq('user_id', userResult.data)
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Error fetching orders', { component: 'orders' }, error as Error)
    return toInternalErrorResult(error)
  }

  const rows = (data || []) as OrderRow[]
  return ok(rows.map(mapOrderFromRow))
}

export async function getOrder(id: string): Promise<ServiceResult<Order>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('user_id', userResult.data)
    .single()

  if (error) {
    if (isNotFoundError(error)) {
      return fail('NOT_FOUND', `Order ${id} not found`)
    }

    logger.error('Error fetching order', { component: 'orders' }, error as Error)
    return toInternalErrorResult(error)
  }

  return ok(mapOrderFromRow(data as OrderRow))
}

export async function getOrderByNumber(orderNumber: string): Promise<ServiceResult<Order>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .eq('user_id', userResult.data)
    .single()

  if (error) {
    if (isNotFoundError(error)) {
      return fail('NOT_FOUND', `Order ${orderNumber} not found`)
    }

    logger.error('Error fetching order by number', { component: 'orders' }, error as Error)
    return toInternalErrorResult(error)
  }

  return ok(mapOrderFromRow(data as OrderRow))
}

export async function getOrderByProject(projectId: string): Promise<ServiceResult<Order>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userResult.data)
    .single()

  if (error) {
    if (isNotFoundError(error)) {
      return fail('NOT_FOUND', `Order for project ${projectId} not found`)
    }

    logger.error('Error fetching order by project', { component: 'orders' }, error as Error)
    return toInternalErrorResult(error)
  }

  return ok(mapOrderFromRow(data as OrderRow))
}

export async function getOrdersWithProject(status?: OrderStatus): Promise<ServiceResult<Order[]>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  let query = supabase
    .from('orders')
    .select(
      `
      *,
      projects (
        id,
        customer_name,
        total_amount,
        customer_address,
        customer_phone,
        customer_email
      )
    `,
    )
    .eq('user_id', userResult.data)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Error fetching orders with project', { component: 'orders' }, error as Error)
    return toInternalErrorResult(error)
  }

  const rows = (data || []) as OrderWithProjectRow[]
  return ok(rows.map(mapOrderWithProjectFromRow))
}

export async function getOrderStats(): Promise<ServiceResult<OrderStats>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return ok(emptyOrderStats())
  }

  const { data, error } = await supabase.from('orders').select('status').eq('user_id', userResult.data)

  if (error) {
    logger.error('Error fetching order stats', { component: 'orders' }, error as Error)
    return toInternalErrorResult(error)
  }

  const rows = (data || []) as OrderStatusRow[]

  return ok({
    total: rows.length,
    draft: rows.filter((row) => row.status === 'draft').length,
    sent: rows.filter((row) => row.status === 'sent').length,
    confirmed: rows.filter((row) => row.status === 'confirmed').length,
    cancelled: rows.filter((row) => row.status === 'cancelled').length,
  })
}
