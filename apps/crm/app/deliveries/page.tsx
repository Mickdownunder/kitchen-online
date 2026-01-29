import { requirePermission } from '@/lib/auth/requirePermission'
import DeliveriesClient from './DeliveriesClient'

export default async function DeliveriesPage() {
  await requirePermission('menu_deliveries')

  return <DeliveriesClient />
}
