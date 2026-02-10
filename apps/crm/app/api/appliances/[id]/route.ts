import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { apiErrors } from '@/lib/utils/errorHandling'

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
      return apiErrors.unauthorized()
    }

    if (user.app_metadata?.role === 'customer') {
      return apiErrors.forbidden()
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
      return apiErrors.forbidden()
    }

    const { data: appliance, error } = await db
      .from('project_appliances')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyMember.company_id)
      .single()

    if (error || !appliance) {
      return apiErrors.notFound()
    }

    return NextResponse.json({ success: true, data: appliance })

  } catch (error) {
    console.warn('Get appliance error:', error)
    return apiErrors.internal(error as Error, { component: 'api/appliances/[id]' })
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
      return apiErrors.unauthorized()
    }

    if (user.app_metadata?.role === 'customer') {
      return apiErrors.forbidden()
    }

    const body = await request.json()
    const parsed = UpdateApplianceSchema.safeParse(body)
    
    if (!parsed.success) {
      return apiErrors.validation()
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
      return apiErrors.forbidden()
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
      console.warn('Error updating appliance:', error)
      return apiErrors.internal(new Error('UPDATE_ERROR'), { component: 'api/appliances/[id]' })
    }

    return NextResponse.json({ success: true, data: appliance })

  } catch (error) {
    console.warn('Update appliance error:', error)
    return apiErrors.internal(error as Error, { component: 'api/appliances/[id]' })
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
      return apiErrors.unauthorized()
    }

    if (user.app_metadata?.role === 'customer') {
      return apiErrors.forbidden()
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
      return apiErrors.forbidden()
    }

    const { error } = await db
      .from('project_appliances')
      .delete()
      .eq('id', id)
      .eq('company_id', companyMember.company_id)

    if (error) {
      console.warn('Error deleting appliance:', error)
      return apiErrors.internal(new Error('DELETE_ERROR'), { component: 'api/appliances/[id]' })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.warn('Delete appliance error:', error)
    return apiErrors.internal(error as Error, { component: 'api/appliances/[id]' })
  }
}
