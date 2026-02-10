import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerSession } from '@/lib/auth/requireCustomerSession'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Schema für Nachricht
const MessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Nachricht darf nicht leer sein')
    .max(5000, 'Nachricht darf maximal 5000 Zeichen haben'),
})

// Upload Limits für Anhänge
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic']

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
 * POST /api/customer/tickets/[id]/messages
 * 
 * Fügt eine Nachricht zu einem Ticket hinzu.
 * Optional mit Datei-Anhang.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params

    // 1. Session prüfen
    const result = await requireCustomerSession(request)
    if (result instanceof NextResponse) return result
    const { customer_id, supabase } = result

    // 2. Ticket laden und Berechtigung prüfen
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, project_id, status')
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

    // 4. Request parsen (kann JSON oder FormData sein)
    let messageText: string
    let file: File | null = null

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      messageText = formData.get('message') as string
      file = formData.get('file') as File | null
    } else {
      const body = await request.json()
      const parsed = MessageSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
      messageText = parsed.data.message
    }

    // 5. Message validieren
    if (!messageText || messageText.length < 1) {
      return NextResponse.json(
        { success: false, error: 'MESSAGE_REQUIRED' },
        { status: 400 }
      )
    }

    // 6. Optional: File hochladen
    let fileUrl: string | null = null

    if (file) {
      // Validieren
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: 'FILE_TOO_LARGE' },
          { status: 400 }
        )
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: 'INVALID_FILE_TYPE' },
          { status: 400 }
        )
      }

      // Hochladen
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const storagePath = `tickets/${ticketId}/${fileName}`

      const fileBuffer = await file.arrayBuffer()
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, fileBuffer, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        console.warn('Upload error:', uploadError)
        // Weitermachen ohne File
      } else {
        fileUrl = storagePath
      }
    }

    // 7. Nachricht erstellen
    const { data: ticketMessage, error: messageError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        author_id: customer_id,
        message: messageText,
        file_url: fileUrl,
        is_customer: true,
        author_type: 'customer',
      })
      .select('id, message, file_url, created_at')
      .single()

    if (messageError) {
      console.warn('Message create error:', messageError)
      return NextResponse.json(
        { success: false, error: 'MESSAGE_CREATE_FAILED' },
        { status: 500 }
      )
    }

    // 8. Ticket updated_at aktualisieren
    await supabase
      .from('tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticketId)

    // 9. Falls Ticket geschlossen war, wieder öffnen
    if (ticket.status === 'GESCHLOSSEN') {
      await supabase
        .from('tickets')
        .update({ status: 'IN_BEARBEITUNG' })
        .eq('id', ticketId)
    }

    // 10. Erfolg
    return NextResponse.json({
      success: true,
      message: {
        id: ticketMessage.id,
        message: ticketMessage.message,
        fileUrl: ticketMessage.file_url,
        createdAt: ticketMessage.created_at,
      },
    })

  } catch (error) {
    console.warn('Message create error:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
