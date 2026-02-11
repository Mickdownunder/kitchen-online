import { requirePermission } from '@/lib/auth/requirePermission'
import OrdersClient from './OrdersClient'

export default async function OrdersPage() {
  await requirePermission('menu_deliveries')

  return <OrdersClient />
}
