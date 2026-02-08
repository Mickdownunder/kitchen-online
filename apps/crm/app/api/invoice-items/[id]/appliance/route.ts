import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiErrors } from '@/lib/utils/errorHandling'

// PATCH /api/invoice-items/[id]/appliance
// Updates appliance/warranty fields for an invoice item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return apiErrors.unauthorized()
    }

    if (user.app_metadata?.role === 'customer') {
      return apiErrors.forbidden({ component: 'api/invoice-items/appliance' })
    }

    const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
      p_permission_code: 'edit_projects',
    })
    if (permError || !hasPermission) {
      return apiErrors.forbidden({ component: 'api/invoice-items/appliance' })
    }

    const body = await request.json()
    
    // Map camelCase to snake_case for allowed appliance fields
    const updateData: Record<string, unknown> = {}
    
    if ('showInPortal' in body) updateData.show_in_portal = body.showInPortal
    if ('manufacturer' in body) updateData.manufacturer = body.manufacturer || null
    if ('modelNumber' in body) updateData.model_number = body.modelNumber || null
    if ('serialNumber' in body) updateData.serial_number = body.serialNumber || null
    if ('installationDate' in body) updateData.installation_date = body.installationDate || null
    if ('warrantyUntil' in body) updateData.warranty_until = body.warrantyUntil || null
    if ('applianceCategory' in body) updateData.appliance_category = body.applianceCategory || null
    if ('manufacturerSupportPhone' in body) updateData.manufacturer_support_phone = body.manufacturerSupportPhone || null
    if ('manufacturerSupportEmail' in body) updateData.manufacturer_support_email = body.manufacturerSupportEmail || null
    if ('manufacturerSupportUrl' in body) updateData.manufacturer_support_url = body.manufacturerSupportUrl || null

    // Update the invoice item
    const { data, error } = await supabase
      .from('invoice_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating invoice item appliance data:', error)
      return apiErrors.internal(error as unknown as Error, { component: 'api/invoice-items/appliance', itemId: id })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in appliance PATCH:', error)
    return apiErrors.internal(error as Error, { component: 'api/invoice-items/appliance' })
  }
}
