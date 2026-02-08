import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireCustomerSession } from '@/lib/auth/requireCustomerSession'
import { z } from 'zod'

// Types for database queries
interface ProjectWithUserId {
  id: string
  user_id: string | null
}

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
  projectId: z.string().uuid().optional(),
})

async function resolveProjectId(
  supabase: SupabaseClient,
  customerId: string,
  requestedProjectId?: string | null
): Promise<ProjectWithUserId | null> {
  if (requestedProjectId) {
    const { data: project, error } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', requestedProjectId)
      .eq('customer_id', customerId)
      .is('deleted_at', null)
      .single() as { data: ProjectWithUserId | null; error: unknown }

    if (error || !project) return null
    return project
  }

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, user_id')
    .eq('customer_id', customerId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1) as { data: ProjectWithUserId[] | null; error: unknown }

  if (error || !projects || projects.length === 0) return null
  return projects[0]
}

/**
 * POST /api/customer/tickets
 * 
 * Erstellt ein neues Ticket für das Kunden-Projekt.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Session prüfen
    const result = await requireCustomerSession(request)
    if (result instanceof NextResponse) return result
    const { customer_id, supabase } = result

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

    const { subject, message, projectId: requestedProjectId } = parsed.data

    const project = await resolveProjectId(supabase, customer_id, requestedProjectId)
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

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
        project_id: project.id,
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
