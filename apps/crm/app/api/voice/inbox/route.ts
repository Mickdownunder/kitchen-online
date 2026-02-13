import { NextRequest, NextResponse } from 'next/server'
import { apiErrors } from '@/lib/utils/errorHandling'
import { listVoiceInboxEntries } from '@/lib/voice/inboxService'
import { requireVoiceRouteAccess } from '@/lib/voice/routeAccess'
import type { VoiceInboxStatus } from '@/types'

const allowedStatuses = new Set<VoiceInboxStatus>([
  'captured',
  'parsed',
  'needs_confirmation',
  'executed',
  'failed',
  'discarded',
])

function parseStatuses(value: string | null): VoiceInboxStatus[] {
  if (!value) return []

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry): entry is VoiceInboxStatus => allowedStatuses.has(entry as VoiceInboxStatus))
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireVoiceRouteAccess({ request, requireInboxPermission: true })
    if (access instanceof Response) {
      return access
    }

    const statuses = parseStatuses(request.nextUrl.searchParams.get('statuses'))
    const limitRaw = request.nextUrl.searchParams.get('limit')
    const limit = Number.parseInt(limitRaw || '100', 10)

    const result = await listVoiceInboxEntries(access.serviceSupabase, access.companyId, {
      statuses,
      limit,
    })

    if (!result.ok) {
      return apiErrors.internal(new Error(result.message), { component: 'api/voice/inbox' })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error) {
    return apiErrors.internal(error as Error, { component: 'api/voice/inbox' })
  }
}
