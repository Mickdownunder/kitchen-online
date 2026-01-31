import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Schema für Ticket-Erstellung
const CreateTicketSchema = z.object({
  subject: z
    .string()
    .min(3, 'Betreff muss mindestens 3 Zeichen haben')
    .max(200, 'Betreff darf maximal 200 Zeichen haben'),
  message: z
    .string()
    .min(10, 'Nachricht muss mindestens 10 Zeichen haben')
    .max(5000, 'Nachricht darf maximal 5000 Zeichen haben'),
})

/**
 * Helper: Customer Session aus Request extrahieren
 */
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

  return { project_id, customer_id, user_id: user.id }
}

/**
 * POST /api/customer/tickets
 * 
 * Erstellt ein neues Ticket für das Kunden-Projekt.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Session prüfen
    const session = await getCustomerSession(request)
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { project_id, customer_id } = session

    // 2. Request Body parsen
    const body = await request.json()
    
    // 3. Input validieren
    const parsed = CreateTicketSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { subject, message } = parsed.data

    // 4. Supabase Admin Client
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

    // 5. Get company_id from project
    const { data: project } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', project_id)
      .single()

    let companyId: string | null = null
    if (project?.user_id) {
      const { data: companyMember } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', project.user_id)
        .eq('is_active', true)
        .single()
      companyId = companyMember?.company_id || null
    }

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'NO_COMPANY' },
        { status: 403 }
      )
    }

    // 6. Ticket erstellen
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        project_id,
        subject,
        status: 'OFFEN',
        type: 'KUNDENANFRAGE',
        created_by: customer_id,
        company_id: companyId,
      })
      .select('id, subject, status, created_at')
      .single()

    if (ticketError) {
      console.error('Ticket create error:', ticketError)
      return NextResponse.json(
        { success: false, error: 'TICKET_CREATE_FAILED' },
        { status: 500 }
      )
    }

    // 7. Erste Nachricht hinzufügen
    const { error: messageError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticket.id,
        author_id: customer_id,
        message,
        is_customer: true,
        author_type: 'customer',
      })

    if (messageError) {
      console.error('Message create error:', messageError)
      // Ticket wurde erstellt, Nachricht nicht - trotzdem Erfolg melden
      // aber loggen für Debugging
    }

    // 7. Optional: Notification an CRM senden
    // TODO: Implement notification system
    // await notifyNewTicket(ticket.id, project_id)

    // 8. Erfolg
    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        createdAt: ticket.created_at,
      },
    })

  } catch (error) {
    console.error('Ticket create error:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
