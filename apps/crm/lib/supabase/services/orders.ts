import { supabase } from '../client'
import { Order, OrderStatus, CustomerProject } from '@/types'
import { getCurrentUser } from './auth'

// ============================================
// ORDER SERVICE - CRUD Operations
// ============================================

/**
 * Alle Aufträge laden (optional nach Projekt gefiltert)
 */
export async function getOrders(projectId?: string): Promise<Order[]> {
  const user = await getCurrentUser()
  if (!user) return []

  let query = supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching orders:', error)
    return []
  }

  return (data || []).map(mapOrderFromDB)
}

/**
 * Einzelnen Auftrag laden
 */
export async function getOrder(id: string): Promise<Order | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if ((error as { code?: string }).code === 'PGRST116') return null
    console.error('Error fetching order:', error)
    return null
  }

  return mapOrderFromDB(data)
}

/**
 * Auftrag nach Auftragsnummer laden
 */
export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if ((error as { code?: string }).code === 'PGRST116') return null
    console.error('Error fetching order by number:', error)
    return null
  }

  return mapOrderFromDB(data)
}

/**
 * Auftrag für ein Projekt laden
 */
export async function getOrderByProject(projectId: string): Promise<Order | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if ((error as { code?: string }).code === 'PGRST116') return null
    console.error('Error fetching order by project:', error)
    return null
  }

  return mapOrderFromDB(data)
}

/**
 * Aufträge mit Projekt-Daten laden
 */
export async function getOrdersWithProject(status?: OrderStatus): Promise<Order[]> {
  const user = await getCurrentUser()
  if (!user) return []

  let query = supabase
    .from('orders')
    .select(
      `
      *,
      projects (
        id,
        customer_name,
        total_amount,
        address,
        phone,
        email
      )
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching orders with project:', error)
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => {
    const order = mapOrderFromDB(row)
    if (row.projects) {
      order.project = {
        id: row.projects.id,
        customerName: row.projects.customer_name,
        totalAmount: row.projects.total_amount,
        address: row.projects.customer_address || row.projects.address,
        phone: row.projects.customer_phone || row.projects.phone,
        email: row.projects.customer_email || row.projects.email,
      } as CustomerProject
    }
    return order
  })
}

// ============================================
// CREATE / UPDATE / DELETE
// ============================================

interface CreateOrderParams {
  projectId: string
  orderNumber: string
  orderDate?: string
  status?: OrderStatus
  footerText?: string
  agbSnapshot?: string
}

/**
 * Neuen Auftrag erstellen
 */
export async function createOrder(params: CreateOrderParams): Promise<Order> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      project_id: params.projectId,
      order_number: params.orderNumber,
      order_date: params.orderDate || new Date().toISOString().split('T')[0],
      status: params.status || 'draft',
      footer_text: params.footerText || null,
      agb_snapshot: params.agbSnapshot || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating order:', error)
    throw error
  }

  return mapOrderFromDB(data)
}

/**
 * Auftrag aktualisieren
 */
export async function updateOrder(
  id: string,
  updates: Partial<Omit<Order, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<Order> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {}

  if (updates.projectId !== undefined) updateData.project_id = updates.projectId
  if (updates.orderNumber !== undefined) updateData.order_number = updates.orderNumber
  if (updates.orderDate !== undefined) updateData.order_date = updates.orderDate
  if (updates.status !== undefined) updateData.status = updates.status
  if (updates.footerText !== undefined) updateData.footer_text = updates.footerText
  if (updates.agbSnapshot !== undefined) updateData.agb_snapshot = updates.agbSnapshot
  if (updates.sentAt !== undefined) updateData.sent_at = updates.sentAt
  if (updates.confirmedAt !== undefined) updateData.confirmed_at = updates.confirmedAt

  const { data, error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating order:', error)
    throw error
  }

  return mapOrderFromDB(data)
}

/**
 * Auftrag als "versendet" markieren
 */
export async function sendOrder(id: string): Promise<Order> {
  return updateOrder(id, {
    status: 'sent',
    sentAt: new Date().toISOString(),
  })
}

/**
 * Auftrag als "bestätigt" markieren
 */
export async function confirmOrder(id: string): Promise<Order> {
  return updateOrder(id, {
    status: 'confirmed',
    confirmedAt: new Date().toISOString(),
  })
}

/**
 * Auftrag stornieren
 */
export async function cancelOrder(id: string): Promise<Order> {
  return updateOrder(id, {
    status: 'cancelled',
  })
}

/**
 * Auftrag löschen
 */
export async function deleteOrder(id: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('orders').delete().eq('id', id).eq('user_id', user.id)

  if (error) {
    console.error('Error deleting order:', error)
    throw error
  }
}

/**
 * Auftrag für ein Projekt erstellen oder aktualisieren (Upsert)
 */
export async function upsertOrderForProject(
  projectId: string,
  orderNumber: string,
  params: Partial<CreateOrderParams>
): Promise<Order> {
  const existingOrder = await getOrderByProject(projectId)

  if (existingOrder) {
    return updateOrder(existingOrder.id, {
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

// ============================================
// STATISTIK-FUNKTIONEN
// ============================================

/**
 * Auftragsstatistik
 */
export async function getOrderStats(): Promise<{
  total: number
  draft: number
  sent: number
  confirmed: number
  cancelled: number
}> {
  const user = await getCurrentUser()
  if (!user) {
    return { total: 0, draft: 0, sent: 0, confirmed: 0, cancelled: 0 }
  }

  const { data, error } = await supabase.from('orders').select('status').eq('user_id', user.id)

  if (error) {
    console.error('Error fetching order stats:', error)
    return { total: 0, draft: 0, sent: 0, confirmed: 0, cancelled: 0 }
  }

  const orders = data || []

  return {
    total: orders.length,
    draft: orders.filter(o => o.status === 'draft').length,
    sent: orders.filter(o => o.status === 'sent').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  }
}

// ============================================
// MAPPING FUNCTIONS
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOrderFromDB(dbOrder: Record<string, any>): Order {
  return {
    id: dbOrder.id,
    userId: dbOrder.user_id,
    projectId: dbOrder.project_id,
    orderNumber: dbOrder.order_number,
    orderDate: dbOrder.order_date || undefined,
    status: dbOrder.status || 'draft',
    footerText: dbOrder.footer_text || undefined,
    agbSnapshot: dbOrder.agb_snapshot || undefined,
    sentAt: dbOrder.sent_at || undefined,
    confirmedAt: dbOrder.confirmed_at || undefined,
    createdAt: dbOrder.created_at,
    updatedAt: dbOrder.updated_at,
  }
}
