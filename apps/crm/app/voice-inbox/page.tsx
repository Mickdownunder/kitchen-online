import { requirePermission } from '@/lib/auth/requirePermission'
import VoiceInboxPageClient from './VoiceInboxPageClient'

export default async function VoiceInboxPage() {
  await requirePermission('menu_accounting')

  return <VoiceInboxPageClient />
}
