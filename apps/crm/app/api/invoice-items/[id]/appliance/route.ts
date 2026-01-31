import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const body = await request.json()
    
    // Map camelCase to snake_case for allowed appliance fields
    const updateData: Record<string, unknown> = {}
    
    if ('showInPortal' in body) updateData.show_in_portal = body.showInPortal
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
      return NextResponse.json(
        { error: 'Fehler beim Speichern' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in appliance PATCH:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
