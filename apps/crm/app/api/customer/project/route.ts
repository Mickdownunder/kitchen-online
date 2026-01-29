import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
 * GET /api/customer/project
 * 
 * Gibt aggregierte Dashboard-Daten für das Kunden-Projekt zurück.
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

    const { project_id, customer_id } = session

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

    // 3. Projekt-Daten laden
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        status,
        order_number,
        salesperson_id
      `)
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, error: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 4. Customer-Daten laden
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, email')
      .eq('id', customer_id)
      .single()

    // 5. Verkäufer-Daten laden (falls vorhanden)
    let salesperson = null
    if (project.salesperson_id) {
      const { data: sp } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, phone')
        .eq('id', project.salesperson_id)
        .single()
      
      if (sp) {
        salesperson = {
          name: sp.full_name,
          email: sp.email,
          phone: sp.phone,
        }
      }
    }

    // 6. Nächster Termin
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, title, start_time')
      .eq('project_id', project_id)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(1)

    const nextAppointment = appointments?.[0] 
      ? {
          title: appointments[0].title,
          startTime: appointments[0].start_time,
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
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project_id)
        .gte('start_time', new Date().toISOString()),
    ])

    // 8. Response zusammenstellen
    return NextResponse.json({
      success: true,
      data: {
        project: {
          name: project.name,
          status: project.status,
          orderNumber: project.order_number,
        },
        customer: {
          name: customer?.name || 'Unbekannt',
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
