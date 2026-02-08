import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireCustomerSession } from '@/lib/auth/requireCustomerSession'

const ALLOWED_TYPES = [
  'PLANE',
  'INSTALLATIONSPLANE',
  'KAUFVERTRAG',
  'RECHNUNGEN',
  'LIEFERSCHEINE',
  'AUSMESSBERICHT',
  'KUNDEN_DOKUMENT',
]

async function isCustomerProject(
  supabase: SupabaseClient,
  customerId: string,
  projectId: string
) {
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('customer_id', customerId)
    .is('deleted_at', null)
    .single()

  return !error && !!data
}

/**
 * GET /api/customer/documents/[id]/download
 *
 * Returns a signed URL for the requested document.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params

    const result = await requireCustomerSession(request)
    if (result instanceof NextResponse) return result
    const { customer_id, supabase } = result

    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('id, project_id, type, file_path')
      .eq('id', documentId)
      .single()

    if (fetchError || !document || !document.project_id) {
      return NextResponse.json(
        { success: false, error: 'DOCUMENT_NOT_FOUND' },
        { status: 404 }
      )
    }

    const ownsProject = await isCustomerProject(supabase, customer_id, document.project_id)
    if (!ownsProject) {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    if (!document.type || !ALLOWED_TYPES.includes(document.type)) {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    if (!document.file_path) {
      return NextResponse.json(
        { success: false, error: 'FILE_NOT_FOUND' },
        { status: 404 }
      )
    }

    const { data, error: signedUrlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(document.file_path, 60)

    if (signedUrlError || !data?.signedUrl) {
      return NextResponse.json(
        { success: false, error: 'SIGNED_URL_FAILED' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      url: data.signedUrl,
      expiresIn: 60,
    })
  } catch (error) {
    console.error('Document download error:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
