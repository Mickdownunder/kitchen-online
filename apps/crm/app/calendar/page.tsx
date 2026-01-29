import { requirePermission } from '@/lib/auth/requirePermission'
import CalendarClient from './CalendarClient'

export default async function CalendarPage() {
  await requirePermission('menu_calendar')

  return <CalendarClient />
}
