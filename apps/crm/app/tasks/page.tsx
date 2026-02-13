import { requirePermission } from '@/lib/auth/requirePermission'
import TasksPageClient from './TasksPageClient'

export default async function TasksPage() {
  await requirePermission('menu_projects')

  return <TasksPageClient />
}
