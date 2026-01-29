import AccountingClient from './AccountingClient'
import { requirePermission } from '@/lib/auth/requirePermission'

export default async function AccountingPage() {
  await requirePermission('menu_accounting')

  return <AccountingClient />
}
