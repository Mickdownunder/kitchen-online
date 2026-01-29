import { requirePermission } from '@/lib/auth/requirePermission'
import CustomersClient from './CustomersClient'

export default async function CustomersPage() {
  await requirePermission('menu_customers')

  return <CustomersClient />
}
