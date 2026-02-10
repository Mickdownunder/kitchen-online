import type { Order, OrderStatus } from '@/types'
import { logger } from '@/lib/utils/logger'
import { supabase } from '../../client'
import { getCurrentUser } from '../auth'
import { mapOrderFromRow, mapOrderWithProjectFromRow } from './mappers'
import type { OrderRow, OrderStats, OrderStatusRow, OrderWithProjectRow } from './types'
import { emptyOrderStats, getAuthenticatedUserId, isNotFoundError } from './validators'

export async function getOrders(projectId?: string): Promise<Order[]> {
  const userId = getAuthenticatedUserId(await getCurrentUser())
  if (!userId) {
    return []
  }

  let query = supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Error fetching orders', { component: 'orders' }, error as Error)
    return []
  }

  const rows = (data || []) as OrderRow[]
  return rows.map(mapOrderFromRow)
}

export async function getOrder(id: string): Promise<Order | null> {
  const userId = getAuthenticatedUserId(await getCurrentUser())
  if (!userId) {
    return null
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (isNotFoundError(error)) {
      return null
    }

    logger.error('Error fetching order', { component: 'orders' }, error as Error)
    return null
  }

  return mapOrderFromRow(data as OrderRow)
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  const userId = getAuthenticatedUserId(await getCurrentUser())
  if (!userId) {
    return null
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (isNotFoundError(error)) {
      return null
    }

    logger.error('Error fetching order by number', { component: 'orders' }, error as Error)
    return null
  }

  return mapOrderFromRow(data as OrderRow)
}

export async function getOrderByProject(projectId: string): Promise<Order | null> {
  const userId = getAuthenticatedUserId(await getCurrentUser())
  if (!userId) {
    return null
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (isNotFoundError(error)) {
      return null
    }

    logger.error('Error fetching order by project', { component: 'orders' }, error as Error)
    return null
  }

  return mapOrderFromRow(data as OrderRow)
}

export async function getOrdersWithProject(status?: OrderStatus): Promise<Order[]> {
  const userId = getAuthenticatedUserId(await getCurrentUser())
  if (!userId) {
    return []
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
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Error fetching orders with project', { component: 'orders' }, error as Error)
    return []
  }

  const rows = (data || []) as OrderWithProjectRow[]
  return rows.map(mapOrderWithProjectFromRow)
}

export async function getOrderStats(): Promise<OrderStats> {
  const userId = getAuthenticatedUserId(await getCurrentUser())
  if (!userId) {
    return emptyOrderStats()
  }

  const { data, error } = await supabase.from('orders').select('status').eq('user_id', userId)

  if (error) {
    logger.error('Error fetching order stats', { component: 'orders' }, error as Error)
    return emptyOrderStats()
  }

  const rows = (data || []) as OrderStatusRow[]

  return {
    total: rows.length,
    draft: rows.filter((row) => row.status === 'draft').length,
    sent: rows.filter((row) => row.status === 'sent').length,
    confirmed: rows.filter((row) => row.status === 'confirmed').length,
    cancelled: rows.filter((row) => row.status === 'cancelled').length,
  }
}
