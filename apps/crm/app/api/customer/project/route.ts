import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerSession } from '@/lib/auth/requireCustomerSession'
import { CUSTOMER_PORTAL_DOCUMENT_TYPES } from '@/lib/portal/documentVisibility'

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
    const result = await requireCustomerSession(request)
    if (result instanceof NextResponse) return result
    const { customer_id, supabase } = result

    // 3. Alle Projekte des Kunden laden (inkl. Termin-Daten)
    const { data: allProjects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        customer_name,
        status,
        order_number,
        salesperson_id,
        salesperson_name,
        created_at,
        measurement_date,
        measurement_time,
        delivery_date,
        delivery_time,
        installation_date,
        installation_time
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

    // 6. Nächster Termin (aus planning_appointments UND Projekt-Daten)
    const today = new Date().toISOString().slice(0, 10)
    
    // 6a. Planning Appointments laden
    const { data: appointments } = await supabase
      .from('planning_appointments')
      .select('id, type, date, time')
      .eq('project_id', project_id)
      .gte('date', today)
      .order('date', { ascending: true })
      .order('time', { ascending: true })

    // 6b. Alle möglichen Termine sammeln (Appointments + Projekt-Daten)
    interface UpcomingDate {
      type: string
      date: string
      time: string | null
    }
    
    const upcomingDates: UpcomingDate[] = []
    
    // Planning Appointments hinzufügen
    appointments?.forEach(apt => {
      if (apt.date >= today) {
        upcomingDates.push({
          type: apt.type,
          date: apt.date,
          time: apt.time,
        })
      }
    })
    
    // Projekt-Daten hinzufügen (falls vorhanden und in der Zukunft)
    // Verwende Type Assertion da wir die Felder jetzt laden
    const projectWithDates = project as typeof project & {
      measurement_date?: string | null
      measurement_time?: string | null
      delivery_date?: string | null
      delivery_time?: string | null
      installation_date?: string | null
      installation_time?: string | null
    }
    
    if (projectWithDates.measurement_date && projectWithDates.measurement_date >= today) {
      // Nur hinzufügen wenn nicht bereits als planning_appointment vorhanden
      const hasAppointment = upcomingDates.some(d => d.type === 'Aufmaß' || d.type === 'Measurement')
      if (!hasAppointment) {
        upcomingDates.push({
          type: 'Aufmaß',
          date: projectWithDates.measurement_date,
          time: projectWithDates.measurement_time || null,
        })
      }
    }
    
    if (projectWithDates.delivery_date && projectWithDates.delivery_date >= today) {
      const hasAppointment = upcomingDates.some(d => d.type === 'Lieferung' || d.type === 'Delivery')
      if (!hasAppointment) {
        upcomingDates.push({
          type: 'Lieferung',
          date: projectWithDates.delivery_date,
          time: projectWithDates.delivery_time || null,
        })
      }
    }
    
    if (projectWithDates.installation_date && projectWithDates.installation_date >= today) {
      const hasAppointment = upcomingDates.some(d => d.type === 'Montage' || d.type === 'Installation')
      if (!hasAppointment) {
        upcomingDates.push({
          type: 'Montage',
          date: projectWithDates.installation_date,
          time: projectWithDates.installation_time || null,
        })
      }
    }
    
    // Nach Datum sortieren und frühesten nehmen
    upcomingDates.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      // Bei gleichem Datum nach Zeit sortieren
      const timeA = a.time || '00:00'
      const timeB = b.time || '00:00'
      return timeA.localeCompare(timeB)
    })
    
    const nextAppointment = upcomingDates[0]
      ? {
          title: upcomingDates[0].type,
          startTime: upcomingDates[0].time
            ? `${upcomingDates[0].date}T${upcomingDates[0].time}`
            : `${upcomingDates[0].date}T00:00:00`,
        }
      : null

    // 7. Statistiken
    const [docsResult, ticketsResult, appointmentsResult] = await Promise.all([
      // Dokumente zählen (nur sichtbare Typen)
      supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project_id)
        .in('type', Array.from(CUSTOMER_PORTAL_DOCUMENT_TYPES)),
      
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
    console.warn('Project fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
