import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { CustomerDeliveryNotePDFDocumentServer } from '@/lib/pdf/DeliveryNotePDFServer'
import { getCompanySettings } from '@/lib/supabase/services/company'
import { apiErrors } from '@/lib/utils/errorHandling'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return apiErrors.unauthorized()
    }

    if (user.app_metadata?.role === 'customer') {
      return apiErrors.forbidden({ component: 'api/delivery-note/pdf' })
    }

    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      return apiErrors.forbidden({ component: 'api/delivery-note/pdf' })
    }

    const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
      p_permission_code: 'edit_projects',
    })
    if (permError || !hasPermission) {
      return apiErrors.forbidden({ component: 'api/delivery-note/pdf' })
    }

    const body = await request.json()
    const { deliveryNote, project } = body

    if (!deliveryNote || !project) {
      return apiErrors.badRequest({ component: 'api/delivery-note/pdf' })
    }

    // Lade Company Settings server-seitig
    const companySettings = await getCompanySettings()

    // Generiere PDF server-seitig

    const pdfElement = React.createElement(CustomerDeliveryNotePDFDocumentServer, {
      deliveryNote: {
        deliveryNoteNumber: deliveryNote.deliveryNoteNumber || deliveryNote.id || 'LS-001',
        deliveryDate: deliveryNote.deliveryDate || deliveryNote.date || new Date().toISOString(),
        deliveryAddress: deliveryNote.deliveryAddress,
        customerSignature: deliveryNote.customerSignature,
        signedBy: deliveryNote.signedBy,
        customerSignatureDate: deliveryNote.customerSignatureDate,
        items: deliveryNote.items || [],
      },
      // Pass the full project object to satisfy CustomerProject type
      project: project,
      company: companySettings,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any // React element type mismatch with renderToBuffer
    const pdfBuffer = await renderToBuffer(pdfElement)
    const pdfBase64 = pdfBuffer.toString('base64')

    const deliveryNoteNumber = deliveryNote.deliveryNoteNumber || deliveryNote.id || 'LS-001'
    const filename = `Lieferschein_${deliveryNoteNumber.replace(/\//g, '-')}_${project.customerName.replace(/\s/g, '_')}.pdf`

    return NextResponse.json({
      success: true,
      pdf: pdfBase64,
      filename,
    })
  } catch (error: unknown) {
    console.error('Error generating delivery note PDF:', error)
    return apiErrors.internal(error as Error, { component: 'api/delivery-note/pdf' })
  }
}
