import StatisticsClient from './StatisticsClient'
import { requirePermission } from '@/lib/auth/requirePermission'

export default async function StatisticsPage() {
  await requirePermission('menu_statistics')

  return <StatisticsClient />
}
