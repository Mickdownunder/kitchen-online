import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiErrors } from '@/lib/utils/errorHandling'
import { requireInboxAccess } from '@/lib/inbound/access'
import { INBOUND_ALLOWED_DOCUMENT_KINDS, INBOUND_ALLOWED_PROCESSING_STATUSES } from '@/lib/inbound/constants'
import { listInboxItemsForUser } from '@/lib/inbound/repository'

function parseCsvParam(value: string | null): string[] {
  if (!value) {
    return []
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const access = await requireInboxAccess(supabase)
    if (!access.ok) {
      return access.response
    }

    const limitRaw = request.nextUrl.searchParams.get('limit')
    const limit = Math.max(1, Math.min(200, Number.parseInt(limitRaw || '50', 10) || 50))

    const kinds = parseCsvParam(request.nextUrl.searchParams.get('kinds')).filter((entry) => {
      return INBOUND_ALLOWED_DOCUMENT_KINDS.has(entry as 'ab' | 'supplier_delivery_note' | 'supplier_invoice' | 'unknown')
    })

    const statuses = parseCsvParam(request.nextUrl.searchParams.get('statuses')).filter((entry) => {
      return INBOUND_ALLOWED_PROCESSING_STATUSES.has(
        entry as 'received' | 'classified' | 'preassigned' | 'needs_review' | 'confirmed' | 'rejected' | 'failed',
      )
    })

    const rows = await listInboxItemsForUser({
      supabase,
      userId: access.user.id,
      limit,
      kinds,
      statuses,
    })

    return NextResponse.json({
      success: true,
      data: rows,
    })
  } catch (error) {
    return apiErrors.internal(error as Error, { component: 'api/document-inbox' })
  }
}
