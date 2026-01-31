import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function extractStoragePath(fileUrlOrPath: string) {
  const bucketMarker = '/documents/'
  const markerIndex = fileUrlOrPath.indexOf(bucketMarker)
  if (markerIndex >= 0) {
    return fileUrlOrPath.substring(markerIndex + bucketMarker.length)
  }
  return fileUrlOrPath
}

async function getCustomerSession(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return null
  }

  const project_id = user.app_metadata?.project_id
  const customer_id = user.app_metadata?.customer_id
  const role = user.app_metadata?.role

  if (!project_id || !customer_id || role !== 'customer') {
    return null
  }

  return { project_id }
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

    const session = await getCustomerSession(request)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

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

    if (ticket.project_id !== session.project_id) {
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
    console.error('Ticket attachment download error:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
