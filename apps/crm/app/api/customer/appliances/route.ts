import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerSession } from '@/lib/auth/requireCustomerSession'

/**
 * GET /api/customer/appliances
 * 
 * Lists all items marked as "show_in_portal" for the customer's project
 * Optional: ?projectId=xxx to filter by specific project
 * Reads from invoice_items table
 */
export async function GET(request: NextRequest) {
  try {
    const result = await requireCustomerSession(request)
    if (result instanceof NextResponse) return result
    const { customer_id, supabase } = result

    const requestedProjectId = request.nextUrl.searchParams.get('projectId')

    // 1. Get project IDs for this customer
    let projectIds: string[] = []
    
    if (requestedProjectId) {
      // Verify the requested project belongs to this customer
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', requestedProjectId)
        .eq('customer_id', customer_id)
        .is('deleted_at', null)
        .single()

      if (projectError || !project) {
        return NextResponse.json({
          success: true,
          data: { appliances: [], groupedByCategory: {}, totalCount: 0 },
        })
      }
      projectIds = [project.id]
    } else {
      // Get all projects for this customer
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('customer_id', customer_id)
        .is('deleted_at', null)

      if (projectsError || !projects || projects.length === 0) {
        return NextResponse.json({
          success: true,
          data: { appliances: [], groupedByCategory: {}, totalCount: 0 },
        })
      }
      projectIds = projects.map(p => p.id)
    }

    // 2. Fetch invoice items that are marked as show_in_portal
    const { data: items, error } = await supabase
      .from('invoice_items')
      .select(`
        id,
        description,
        model_number,
        manufacturer,
        show_in_portal,
        serial_number,
        installation_date,
        warranty_until,
        manufacturer_support_url,
        manufacturer_support_phone,
        manufacturer_support_email,
        appliance_category,
        project_id
      `)
      .in('project_id', projectIds)
      .eq('show_in_portal', true)
      .order('appliance_category', { ascending: true })
      .order('manufacturer', { ascending: true })

    if (error) {
      console.warn('Error fetching appliances:', error)
      return NextResponse.json(
        { success: false, error: 'FETCH_ERROR' },
        { status: 500 }
      )
    }

    // Transform to appliance format expected by frontend
    const appliances = (items || []).map(item => ({
      id: item.id,
      manufacturer: item.manufacturer || 'Unbekannt',
      model: item.model_number || item.description || 'Unbekannt',
      category: item.appliance_category || 'Sonstiges',
      serial_number: item.serial_number,
      purchase_date: null,
      installation_date: item.installation_date,
      warranty_until: item.warranty_until,
      manufacturer_support_url: item.manufacturer_support_url,
      manufacturer_support_phone: item.manufacturer_support_phone,
      manufacturer_support_email: item.manufacturer_support_email,
      notes: null,
    }))

    // Group by category for better display
    const groupedByCategory: Record<string, typeof appliances> = {}
    for (const appliance of appliances) {
      if (!groupedByCategory[appliance.category]) {
        groupedByCategory[appliance.category] = []
      }
      groupedByCategory[appliance.category].push(appliance)
    }

    return NextResponse.json({
      success: true,
      data: {
        appliances,
        groupedByCategory,
        totalCount: appliances.length,
      },
    })

  } catch (error) {
    console.warn('Get appliances error:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
