import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerSession } from '@/lib/auth/requireCustomerSession'
import type { SupabaseClient } from '@supabase/supabase-js'

function extractStoragePath(fileUrlOrPath: string) {
  const bucketMarker = '/documents/'
  const markerIndex = fileUrlOrPath.indexOf(bucketMarker)
  if (markerIndex >= 0) {
    return fileUrlOrPath.substring(markerIndex + bucketMarker.length)
  }
  return fileUrlOrPath
}

async function isCustomerProject(
  supabase: SupabaseClient,
  customerId: string,
  projectId: string
) {
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('customer_id', customerId)
    .is('deleted_at', null)
    .single()

  return !error && !!data
}

/**
 * GET /api/customer/tickets/[id]/messages/[messageId]/download
 *
 * Returns a signed URL for a ticket message attachment.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id: ticketId, messageId } = await params

    const result = await requireCustomerSession(request)
    if (result instanceof NextResponse) return result
    const { customer_id, supabase } = result

    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, project_id')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { success: false, error: 'TICKET_NOT_FOUND' },
        { status: 404 }
      )
    }

    const ownsProject = await isCustomerProject(supabase, customer_id, ticket.project_id)
    if (!ownsProject) {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    const { data: message, error: messageError } = await supabase
      .from('ticket_messages')
      .select('id, ticket_id, file_url')
      .eq('id', messageId)
      .single()

    if (messageError || !message || message.ticket_id !== ticketId) {
      return NextResponse.json(
        { success: false, error: 'MESSAGE_NOT_FOUND' },
        { status: 404 }
      )
    }

    if (!message.file_url) {
      return NextResponse.json(
        { success: false, error: 'FILE_NOT_FOUND' },
        { status: 404 }
      )
    }

    const storagePath = extractStoragePath(message.file_url)

    const { data, error: signedUrlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 60)

    if (signedUrlError || !data?.signedUrl) {
      return NextResponse.json(
        { success: false, error: 'SIGNED_URL_FAILED' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      url: data.signedUrl,
      expiresIn: 60,
    })
  } catch (error) {
    console.warn('Ticket attachment download error:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
