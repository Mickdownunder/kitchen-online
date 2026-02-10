import type { CustomerProject, Order } from '@/types'
import type { OrderProjectRow, OrderRow, OrderWithProjectRow } from './types'
import { toOrderStatus } from './validators'

function mapProjectFromRow(projectRow: OrderProjectRow): CustomerProject {
  return {
    id: projectRow.id,
    customerName: projectRow.customer_name || '',
    totalAmount: projectRow.total_amount ?? 0,
    address: projectRow.customer_address || projectRow.address || undefined,
    phone: projectRow.customer_phone || projectRow.phone || undefined,
    email: projectRow.customer_email || projectRow.email || undefined,
  } as CustomerProject
}

export function mapOrderFromRow(dbOrder: OrderRow): Order {
  return {
    id: dbOrder.id,
    userId: dbOrder.user_id,
    projectId: dbOrder.project_id,
    orderNumber: dbOrder.order_number,
    orderDate: dbOrder.order_date || undefined,
    status: toOrderStatus(dbOrder.status),
    footerText: dbOrder.footer_text || undefined,
    agbSnapshot: dbOrder.agb_snapshot || undefined,
    sentAt: dbOrder.sent_at || undefined,
    confirmedAt: dbOrder.confirmed_at || undefined,
    createdAt: dbOrder.created_at as string,
    updatedAt: dbOrder.updated_at as string,
  }
}

export function mapOrderWithProjectFromRow(row: OrderWithProjectRow): Order {
  const order = mapOrderFromRow(row)

  if (row.projects) {
    order.project = mapProjectFromRow(row.projects)
  }

  return order
}
