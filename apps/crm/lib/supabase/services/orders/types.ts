import type { Order } from '@/types'
import type { Insert, Row, Update } from '@/lib/types/service'

export type OrderRow = Row<'orders'>
export type OrderInsert = Insert<'orders'>
export type OrderUpdate = Update<'orders'>

export interface OrderProjectRow {
  id: string
  customer_name: string | null
  total_amount: number | null
  address?: string | null
  phone?: string | null
  email?: string | null
  customer_address?: string | null
  customer_phone?: string | null
  customer_email?: string | null
}

export type OrderWithProjectRow = OrderRow & {
  projects: OrderProjectRow | null
}

export interface CreateOrderParams {
  projectId: string
  orderNumber: string
  orderDate?: string
  status?: Order['status']
  footerText?: string
  agbSnapshot?: string
}

export type UpdateOrderInput = Partial<Omit<Order, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>

export interface OrderStats {
  total: number
  draft: number
  sent: number
  confirmed: number
  cancelled: number
}

export interface AuthenticatedUserLike {
  id: string
}

export interface PostgrestErrorLike {
  code?: string
}

export interface OrderStatusRow {
  status: string | null
}
