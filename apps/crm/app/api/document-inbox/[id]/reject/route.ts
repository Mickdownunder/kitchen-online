import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiErrors } from '@/lib/utils/errorHandling'
import { requireInboxAccess } from '@/lib/inbound/access'
import { insertInboundEvent, loadInboxItemByIdForUser, updateInboxItem } from '@/lib/inbound/repository'
import { toInboundProcessingStatus } from '@/lib/inbound/status'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const access = await requireInboxAccess(supabase)
    if (!access.ok) {
      return access.response
    }

    const existing = await loadInboxItemByIdForUser(supabase, id, access.user.id)
    if (!existing) {
      return apiErrors.notFound({ component: 'api/document-inbox/reject', id })
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''

    const updated = await updateInboxItem(supabase, id, access.user.id, {
      processing_status: 'rejected',
      rejected_reason: reason || null,
      processing_error: null,
      confirmed_at: null,
      confirmed_by_user_id: null,
    })

    await insertInboundEvent({
      supabase,
      inboxItemId: updated.id,
      userId: access.user.id,
      eventType: 'rejected',
      fromStatus: toInboundProcessingStatus(existing.processing_status),
      toStatus: 'rejected',
      payload: {
        reason: reason || null,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    return apiErrors.internal(error as Error, { component: 'api/document-inbox/reject' })
  }
}
