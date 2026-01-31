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
 * GET /api/customer/appliances
 * 
 * Lists all items marked as "show_in_portal" for the customer's project
 * Reads from invoice_items table
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getCustomerSession(request)
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { project_id } = session

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

    // Fetch invoice items that are marked as show_in_portal
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
        appliance_category
      `)
      .eq('project_id', project_id)
      .eq('show_in_portal', true)
      .order('appliance_category', { ascending: true })
      .order('manufacturer', { ascending: true })

    if (error) {
      console.error('Error fetching appliances:', error)
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
    console.error('Get appliances error:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
