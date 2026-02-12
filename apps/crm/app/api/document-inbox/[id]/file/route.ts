import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { apiErrors } from '@/lib/utils/errorHandling'
import { requireInboxAccess } from '@/lib/inbound/access'
import { loadInboxItemByIdForUser } from '@/lib/inbound/repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!id) {
      return apiErrors.badRequest({ component: 'api/document-inbox/file', reason: 'missing_id' })
    }

    const supabase = await createClient()
    const access = await requireInboxAccess(supabase)
    if (!access.ok) {
      return access.response
    }

    const row = await loadInboxItemByIdForUser(supabase, id, access.user.id)
    if (!row?.storage_path) {
      return apiErrors.notFound({ component: 'api/document-inbox/file', id })
    }

    const serviceClient = await createServiceClient()
    const { data: signedUrl, error: signError } = await serviceClient.storage
      .from('documents')
      .createSignedUrl(row.storage_path, 300)

    if (signError || !signedUrl?.signedUrl) {
      return apiErrors.internal(
        signError ? new Error(signError.message) : new Error('Signed URL missing'),
        { component: 'api/document-inbox/file' },
      )
    }

    return NextResponse.redirect(signedUrl.signedUrl)
  } catch (error) {
    return apiErrors.internal(error as Error, { component: 'api/document-inbox/file' })
  }
}

