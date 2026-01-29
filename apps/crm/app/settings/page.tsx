import SettingsClient from './SettingsClient'
import { requirePermission } from '@/lib/auth/requirePermission'

export default async function SettingsPage() {
  await requirePermission('menu_settings')

  return <SettingsClient />
}
