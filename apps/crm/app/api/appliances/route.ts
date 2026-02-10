import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { apiErrors } from '@/lib/utils/errorHandling'

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
      return apiErrors.unauthorized()
    }

    // Check not customer
    if (user.app_metadata?.role === 'customer') {
      return apiErrors.forbidden()
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return apiErrors.badRequest()
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
      return apiErrors.forbidden()
    }

    // Verify project belongs to company
    const { data: project } = await db
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .single()

    if (!project) {
      return apiErrors.notFound()
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
      console.warn('Error fetching appliances:', error)
      return apiErrors.internal(new Error('FETCH_ERROR'), { component: 'api/appliances' })
    }

    return NextResponse.json({
      success: true,
      data: appliances || [],
    })

  } catch (error) {
    console.warn('Get appliances error:', error)
    return apiErrors.internal(error as Error, { component: 'api/appliances' })
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
      return apiErrors.unauthorized()
    }

    if (user.app_metadata?.role === 'customer') {
      return apiErrors.forbidden()
    }

    const body = await request.json()
    const parsed = CreateApplianceSchema.safeParse(body)
    
    if (!parsed.success) {
      return apiErrors.validation()
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
      return apiErrors.forbidden()
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
      console.warn('Error creating appliance:', error)
      return apiErrors.internal(new Error('CREATE_ERROR'), { component: 'api/appliances' })
    }

    return NextResponse.json({
      success: true,
      data: appliance,
    })

  } catch (error) {
    console.warn('Create appliance error:', error)
    return apiErrors.internal(error as Error, { component: 'api/appliances' })
  }
}
