import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { apiErrors } from '@/lib/utils/errorHandling'
import { getVoiceInboxEntryById, updateVoiceInboxEntry } from '@/lib/voice/inboxService'
import { requireVoiceRouteAccess } from '@/lib/voice/routeAccess'

const DiscardSchema = z.object({
  reason: z.string().max(500).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const access = await requireVoiceRouteAccess({ request, requireInboxPermission: true })
    if (access instanceof Response) {
      return access
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const parsedBody = DiscardSchema.safeParse(body)

    if (!parsedBody.success) {
      return apiErrors.validation({
        component: 'api/voice/inbox/discard',
        validationMessage: parsedBody.error.issues[0]?.message || 'Ungültiger Body.',
      })
    }

    const entryResult = await getVoiceInboxEntryById(access.serviceSupabase, access.companyId, id)
    if (!entryResult.ok) {
      if (entryResult.code === 'NOT_FOUND') {
        return apiErrors.notFound({ component: 'api/voice/inbox/discard', id })
      }
      return apiErrors.internal(new Error(entryResult.message), { component: 'api/voice/inbox/discard' })
    }

    const nowIso = new Date().toISOString()
    const updateResult = await updateVoiceInboxEntry(access.serviceSupabase, access.companyId, id, {
      status: 'discarded',
      discarded_at: nowIso,
      discarded_by_user_id: access.user.id,
      needs_confirmation_reason: parsedBody.data.reason || null,
      error_message: null,
    })

    if (!updateResult.ok) {
      return apiErrors.internal(new Error(updateResult.message), { component: 'api/voice/inbox/discard' })
    }

    return NextResponse.json({
      success: true,
      data: updateResult.data,
    })
  } catch (error) {
    return apiErrors.internal(error as Error, { component: 'api/voice/inbox/discard' })
  }
}
