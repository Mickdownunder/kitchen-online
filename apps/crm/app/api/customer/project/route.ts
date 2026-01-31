import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Helper: Customer Session aus Request extrahieren
 * Nur noch customer_id erforderlich (kein project_id mehr!)
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

  const customer_id = user.app_metadata?.customer_id
  const role = user.app_metadata?.role

  // Nur customer_id und role=customer erforderlich
  if (!customer_id || role !== 'customer') {
    return null
  }

  return { customer_id, user_id: user.id }
}

/**
 * GET /api/customer/project
 * 
 * Gibt aggregierte Dashboard-Daten für den Kunden zurück.
 * Optional: ?projectId=xxx für ein bestimmtes Projekt
 * Ohne projectId: Erstes/aktives Projekt wird verwendet
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Session prüfen
    const session = await getCustomerSession(request)
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { customer_id } = session

    // 2. Supabase Admin Client
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

    // 3. Alle Projekte des Kunden laden
    const { data: allProjects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        customer_name,
        status,
        order_number,
        salesperson_id,
        salesperson_name,
        created_at
      `)
      .eq('customer_id', customer_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (projectsError || !allProjects || allProjects.length === 0) {
      return NextResponse.json(
        { success: false, error: 'NO_PROJECTS_FOUND' },
        { status: 404 }
      )
    }

    // 4. Bestimmtes Projekt oder erstes aktives wählen
    const requestedProjectId = request.nextUrl.searchParams.get('projectId')
    let project = requestedProjectId 
      ? allProjects.find(p => p.id === requestedProjectId)
      : allProjects[0] // Neuestes Projekt als Default
    
    if (!project) {
      project = allProjects[0]
    }
    
    const project_id = project.id

    // 4. Customer-Daten laden
    const { data: customer } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email')
      .eq('id', customer_id)
      .single()

    let salesperson = null as null | { name: string; email: string; phone: string | null }
    if (project.salesperson_id) {
      const { data: sp } = await supabase
        .from('employees')
        .select('first_name, last_name, email, phone')
        .eq('id', project.salesperson_id)
        .single()

      if (sp?.email) {
        salesperson = {
          name: `${sp.first_name} ${sp.last_name}`.trim(),
          email: sp.email,
          phone: sp.phone ?? null,
        }
      }
    }

    // 6. Nächster Termin
    const today = new Date().toISOString().slice(0, 10)
    const { data: appointments } = await supabase
      .from('planning_appointments')
      .select('id, type, date, time')
      .eq('project_id', project_id)
      .gte('date', today)
      .order('date', { ascending: true })
      .order('time', { ascending: true })
      .limit(1)

    const nextAppointment = appointments?.[0]
      ? {
          title: appointments[0].type,
          startTime: appointments[0].time
            ? `${appointments[0].date}T${appointments[0].time}`
            : `${appointments[0].date}T00:00:00`,
        }
      : null

    // 7. Statistiken
    const [docsResult, ticketsResult, appointmentsResult] = await Promise.all([
      // Dokumente zählen (nur sichtbare Typen)
      supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project_id)
        .in('type', [
          'PLANE',
          'INSTALLATIONSPLANE',
          'KAUFVERTRAG',
          'RECHNUNGEN',
          'LIEFERSCHEINE',
          'AUSMESSBERICHT',
          'KUNDEN_DOKUMENT',
        ]),
      
      // Offene Tickets zählen
      supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project_id)
        .in('status', ['OFFEN', 'IN_BEARBEITUNG']),
      
      // Kommende Termine zählen
      supabase
        .from('planning_appointments')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project_id)
        .gte('date', today),
    ])

    // 8. Response zusammenstellen
    return NextResponse.json({
      success: true,
      data: {
        project: {
          id: project.id,
          name: project.customer_name,
          status: project.status,
          orderNumber: project.order_number,
        },
        // Alle Projekte des Kunden (für Projekt-Auswahl)
        allProjects: allProjects.map(p => ({
          id: p.id,
          name: p.customer_name,
          status: p.status,
          orderNumber: p.order_number,
        })),
        customer: {
          name: customer ? `${customer.first_name} ${customer.last_name}`.trim() : 'Unbekannt',
        },
        salesperson,
        nextAppointment,
        stats: {
          documentsCount: docsResult.count || 0,
          openTicketsCount: ticketsResult.count || 0,
          upcomingAppointmentsCount: appointmentsResult.count || 0,
        },
      },
    })

  } catch (error) {
    console.error('Project fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
