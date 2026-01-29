import { requirePermission } from '@/lib/auth/requirePermission'
import InvoicesClient from './InvoicesClient'

export default async function InvoicesPage() {
  await requirePermission('menu_invoices')

  return <InvoicesClient />
}
