import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { z } from 'zod'

const UpdateApplianceSchema = z.object({
  manufacturer: z.string().min(1).max(100).optional(),
  model: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(100).optional(),
  serialNumber: z.string().max(100).optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  installationDate: z.string().optional().nullable(),
  warrantyUntil: z.string().optional().nullable(),
  manufacturerSupportUrl: z.string().url().optional().nullable().or(z.literal('')),
  manufacturerSupportPhone: z.string().max(50).optional().nullable(),
  manufacturerSupportEmail: z.string().email().optional().nullable().or(z.literal('')),
  notes: z.string().max(1000).optional().nullable(),
})

/**
 * GET /api/appliances/[id]
 * Get a single appliance
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
    }

    if (user.app_metadata?.role === 'customer') {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 })
    }

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

    const { data: appliance, error } = await db
      .from('project_appliances')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyMember.company_id)
      .single()

    if (error || !appliance) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: appliance })

  } catch (error) {
    console.error('Get appliance error:', error)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

/**
 * PATCH /api/appliances/[id]
 * Update an appliance
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
    }

    if (user.app_metadata?.role === 'customer') {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = UpdateApplianceSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'VALIDATION_ERROR',
        details: parsed.error.flatten().fieldErrors 
      }, { status: 400 })
    }

    const data = parsed.data

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

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (data.manufacturer !== undefined) updateData.manufacturer = data.manufacturer
    if (data.model !== undefined) updateData.model = data.model
    if (data.category !== undefined) updateData.category = data.category
    if (data.serialNumber !== undefined) updateData.serial_number = data.serialNumber || null
    if (data.purchaseDate !== undefined) updateData.purchase_date = data.purchaseDate || null
    if (data.installationDate !== undefined) updateData.installation_date = data.installationDate || null
    if (data.warrantyUntil !== undefined) updateData.warranty_until = data.warrantyUntil || null
    if (data.manufacturerSupportUrl !== undefined) updateData.manufacturer_support_url = data.manufacturerSupportUrl || null
    if (data.manufacturerSupportPhone !== undefined) updateData.manufacturer_support_phone = data.manufacturerSupportPhone || null
    if (data.manufacturerSupportEmail !== undefined) updateData.manufacturer_support_email = data.manufacturerSupportEmail || null
    if (data.notes !== undefined) updateData.notes = data.notes || null

    const { data: appliance, error } = await db
      .from('project_appliances')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', companyMember.company_id)
      .select()
      .single()

    if (error || !appliance) {
      console.error('Error updating appliance:', error)
      return NextResponse.json({ success: false, error: 'UPDATE_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: appliance })

  } catch (error) {
    console.error('Update appliance error:', error)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

/**
 * DELETE /api/appliances/[id]
 * Delete an appliance
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
    }

    if (user.app_metadata?.role === 'customer') {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 })
    }

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

    const { error } = await db
      .from('project_appliances')
      .delete()
      .eq('id', id)
      .eq('company_id', companyMember.company_id)

    if (error) {
      console.error('Error deleting appliance:', error)
      return NextResponse.json({ success: false, error: 'DELETE_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete appliance error:', error)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
