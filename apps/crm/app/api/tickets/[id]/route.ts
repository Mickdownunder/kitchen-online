import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { z } from 'zod'

const ReplySchema = z.object({
  message: z
    .string()
    .min(1, 'Nachricht darf nicht leer sein')
    .max(5000, 'Nachricht darf maximal 5000 Zeichen haben'),
})

const UpdateStatusSchema = z.object({
  status: z.enum(['OFFEN', 'IN_BEARBEITUNG', 'GESCHLOSSEN']),
})

/**
 * Helper: Employee Session aus Request extrahieren (uses SSR client)
 */
async function getEmployeeSession() {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  // Check if NOT a customer (employees don't have 'customer' role)
  const role = user.app_metadata?.role
  if (role === 'customer') return null

  return { user_id: user.id }
}

/**
 * Helper: Create service client for database operations
 */
function createDbClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

/**
 * GET /api/tickets/[id]
 * 
 * Holt Ticket-Details mit Nachrichten (für CRM)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params

    const session = await getEmployeeSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const supabase = createDbClient()

    // Get user's company_id via company_members
    const { data: companyMember } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user_id)
      .eq('is_active', true)
      .single()

    if (!companyMember?.company_id) {
      return NextResponse.json(
        { success: false, error: 'NO_COMPANY' },
        { status: 403 }
      )
    }

    // Get ticket with project info
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        id,
        project_id,
        subject,
        status,
        type,
        created_by,
        assigned_to,
        created_at,
        updated_at,
        company_id
      `)
      .eq('id', ticketId)
      .eq('company_id', companyMember.company_id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { success: false, error: 'TICKET_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Get project info
    const { data: project } = await supabase
      .from('projects')
      .select('id, customer_name, order_number, status')
      .eq('id', ticket.project_id)
      .single()

    // Get customer info
    const { data: customer } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email, phone')
      .eq('id', ticket.created_by)
      .single()

    // Get messages
    const { data: messages } = await supabase
      .from('ticket_messages')
      .select('id, message, file_url, is_customer, author_id, employee_id, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    return NextResponse.json({
      success: true,
      data: {
        ticket,
        project,
        customer: customer ? {
          id: customer.id,
          name: `${customer.first_name} ${customer.last_name}`.trim(),
          email: customer.email,
          phone: customer.phone,
        } : null,
        messages: messages || [],
      },
    })

  } catch (error) {
    console.error('Get ticket error:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tickets/[id]
 * 
 * Mitarbeiter antwortet auf ein Ticket
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params

    const session = await getEmployeeSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = ReplySchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { message } = parsed.data

    const supabase = createDbClient()

    // Get user's company_id via company_members
    const { data: companyMember } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user_id)
      .eq('is_active', true)
      .single()

    if (!companyMember?.company_id) {
      return NextResponse.json(
        { success: false, error: 'NO_COMPANY' },
        { status: 403 }
      )
    }

    // Get user's full_name from user_profiles
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', session.user_id)
      .single()

    // Verify ticket belongs to employee's company
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, company_id, status')
      .eq('id', ticketId)
      .eq('company_id', companyMember.company_id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { success: false, error: 'TICKET_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Create message
    const { data: ticketMessage, error: messageError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        author_id: null, // Not a customer
        employee_id: session.user_id,
        message,
        is_customer: false,
        author_type: 'employee',
      })
      .select('id, message, created_at')
      .single()

    if (messageError) {
      console.error('Message create error:', messageError)
      return NextResponse.json(
        { success: false, error: 'MESSAGE_CREATE_FAILED' },
        { status: 500 }
      )
    }

    // Update ticket status to IN_BEARBEITUNG if it was OFFEN
    if (ticket.status === 'OFFEN') {
      await supabase
        .from('tickets')
        .update({ status: 'IN_BEARBEITUNG' })
        .eq('id', ticketId)
    }

    // Update ticket updated_at
    await supabase
      .from('tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticketId)

    return NextResponse.json({
      success: true,
      message: {
        id: ticketMessage.id,
        message: ticketMessage.message,
        createdAt: ticketMessage.created_at,
        author: userProfile?.full_name || 'Mitarbeiter',
      },
    })

  } catch (error) {
    console.error('Reply error:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/tickets/[id]
 * 
 * Ticket-Status aktualisieren
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params

    const session = await getEmployeeSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = UpdateStatusSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { status } = parsed.data

    const supabase = createDbClient()

    // Get user's company_id via company_members
    const { data: companyMember } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user_id)
      .eq('is_active', true)
      .single()

    if (!companyMember?.company_id) {
      return NextResponse.json(
        { success: false, error: 'NO_COMPANY' },
        { status: 403 }
      )
    }

    // Update ticket
    const { data: ticket, error: updateError } = await supabase
      .from('tickets')
      .update({ status })
      .eq('id', ticketId)
      .eq('company_id', companyMember.company_id)
      .select('id, status')
      .single()

    if (updateError || !ticket) {
      return NextResponse.json(
        { success: false, error: 'UPDATE_FAILED' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      ticket,
    })

  } catch (error) {
    console.error('Update ticket error:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
