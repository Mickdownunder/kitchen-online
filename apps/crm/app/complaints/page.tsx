import { requirePermission } from '@/lib/auth/requirePermission'
import ComplaintsClient from './ComplaintsClient'

export default async function ComplaintsPage() {
  await requirePermission('menu_complaints')

  return <ComplaintsClient />
}
