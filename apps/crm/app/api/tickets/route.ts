import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getCompanyIdForUser } from '@/lib/supabase/services/company'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/tickets
 * 
 * Liste aller Tickets für CRM (gefiltert nach company_id)
 */
export async function GET(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user || user.app_metadata?.role === 'customer') {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // Optional filter
    const projectId = searchParams.get('projectId') // Optional filter

    // Use service client for database operations
    const supabase = await createServiceClient()

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/88795722-4a41-4d8b-9b7c-39ae75620258',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'tickets/route.ts:pre',message:'before getCompanyIdForUser',data:{userId:user.id,role:user.app_metadata?.role,hasServiceKey:!!process.env.SUPABASE_SERVICE_ROLE_KEY},timestamp:Date.now(),hypothesisId:'H3-H4'})}).catch(()=>{});
    // #endregion

    // #region agent log — direct queries for debug
    const { data: dbgMember, error: dbgMemberErr } = await supabase
      .from('company_members')
      .select('company_id, is_active, role')
      .eq('user_id', user.id)
    const { data: dbgSettings, error: dbgSettingsErr } = await supabase
      .from('company_settings')
      .select('id, company_name')
      .eq('user_id', user.id)
    // #endregion

    const companyId = await getCompanyIdForUser(user.id, supabase)

    if (!companyId) {
      logger.warn('Tickets NO_COMPANY', { component: 'api/tickets', userId: user.id })
      return NextResponse.json(
        {
          success: false,
          error: 'NO_COMPANY',
          debug: {
            userId: user.id,
            memberRows: dbgMember,
            memberError: dbgMemberErr?.message || null,
            settingsRows: dbgSettings,
            settingsError: dbgSettingsErr?.message || null,
            hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          },
        },
        { status: 403 }
      )
    }

    // Build query - fetch ALL tickets for this company
    let query = supabase
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
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: tickets, error: ticketsError } = await query

    logger.debug('Tickets query result', {
      component: 'api/tickets',
      companyId,
      ticketCount: tickets?.length || 0,
    })

    if (ticketsError) {
      logger.error('Tickets fetch error', { component: 'api/tickets' }, ticketsError)
      return NextResponse.json(
        { success: false, error: 'FETCH_ERROR' },
        { status: 500 }
      )
    }

    // Get project info for all tickets
    const projectIds = [...new Set(tickets?.map(t => t.project_id) || [])]
    const { data: projects } = await supabase
      .from('projects')
      .select('id, customer_name, order_number')
      .in('id', projectIds)

    const projectMap = new Map(projects?.map(p => [p.id, p]) || [])

    // Get customer info
    const customerIds = [...new Set(tickets?.map(t => t.created_by) || [])]
    const { data: customers } = await supabase
      .from('customers')
      .select('id, first_name, last_name')
      .in('id', customerIds)

    const customerMap = new Map(customers?.map(c => [c.id, c]) || [])

    // Count unread/open
    const stats = {
      total: tickets?.length || 0,
      open: tickets?.filter(t => t.status === 'OFFEN').length || 0,
      inProgress: tickets?.filter(t => t.status === 'IN_BEARBEITUNG').length || 0,
      closed: tickets?.filter(t => t.status === 'GESCHLOSSEN').length || 0,
    }

    // Enrich tickets with project and customer info
    const enrichedTickets = tickets?.map(ticket => {
      const project = projectMap.get(ticket.project_id)
      const customer = customerMap.get(ticket.created_by)
      return {
        ...ticket,
        project: project ? {
          id: project.id,
          customerName: project.customer_name,
          orderNumber: project.order_number,
        } : null,
        customer: customer ? {
          id: customer.id,
          name: `${customer.first_name} ${customer.last_name}`.trim(),
        } : null,
      }
    }) || []

    return NextResponse.json({
      success: true,
      data: {
        tickets: enrichedTickets,
        stats,
      },
    })

  } catch (error) {
    logger.error('Get tickets error', { component: 'api/tickets' }, error as Error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
