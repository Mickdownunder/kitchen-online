import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { z } from 'zod'

const CreateApplianceSchema = z.object({
  projectId: z.string().uuid(),
  manufacturer: z.string().min(1).max(100),
  model: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  serialNumber: z.string().max(100).optional(),
  purchaseDate: z.string().optional(),
  installationDate: z.string().optional(),
  warrantyUntil: z.string().optional(),
  manufacturerSupportUrl: z.string().url().optional().or(z.literal('')),
  manufacturerSupportPhone: z.string().max(50).optional(),
  manufacturerSupportEmail: z.string().email().optional().or(z.literal('')),
  notes: z.string().max(1000).optional(),
})

/**
 * GET /api/appliances
 * List appliances (filtered by projectId)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
    }

    // Check not customer
    if (user.app_metadata?.role === 'customer') {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'PROJECT_ID_REQUIRED' }, { status: 400 })
    }

    // Use service client for database
    const db = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user's company
    const { data: companyMember } = await db
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!companyMember?.company_id) {
      return NextResponse.json({ success: false, error: 'NO_COMPANY' }, { status: 403 })
    }

    // Verify project belongs to company
    const { data: project } = await db
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .single()

    if (!project) {
      return NextResponse.json({ success: false, error: 'PROJECT_NOT_FOUND' }, { status: 404 })
    }

    // Get appliances
    const { data: appliances, error } = await db
      .from('project_appliances')
      .select('*')
      .eq('project_id', projectId)
      .eq('company_id', companyMember.company_id)
      .order('category', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching appliances:', error)
      return NextResponse.json({ success: false, error: 'FETCH_ERROR' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: appliances || [],
    })

  } catch (error) {
    console.error('Get appliances error:', error)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

/**
 * POST /api/appliances
 * Create a new appliance
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
    }

    if (user.app_metadata?.role === 'customer') {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = CreateApplianceSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'VALIDATION_ERROR',
        details: parsed.error.flatten().fieldErrors 
      }, { status: 400 })
    }

    const data = parsed.data

    // Use service client
    const db = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user's company
    const { data: companyMember } = await db
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!companyMember?.company_id) {
      return NextResponse.json({ success: false, error: 'NO_COMPANY' }, { status: 403 })
    }

    // Create appliance
    const { data: appliance, error } = await db
      .from('project_appliances')
      .insert({
        project_id: data.projectId,
        company_id: companyMember.company_id,
        manufacturer: data.manufacturer,
        model: data.model,
        category: data.category,
        serial_number: data.serialNumber || null,
        purchase_date: data.purchaseDate || null,
        installation_date: data.installationDate || null,
        warranty_until: data.warrantyUntil || null,
        manufacturer_support_url: data.manufacturerSupportUrl || null,
        manufacturer_support_phone: data.manufacturerSupportPhone || null,
        manufacturer_support_email: data.manufacturerSupportEmail || null,
        notes: data.notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating appliance:', error)
      return NextResponse.json({ success: false, error: 'CREATE_ERROR' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: appliance,
    })

  } catch (error) {
    console.error('Create appliance error:', error)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
