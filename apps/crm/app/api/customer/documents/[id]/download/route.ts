import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const ALLOWED_TYPES = [
  'PLANE',
  'INSTALLATIONSPLANE',
  'KAUFVERTRAG',
  'RECHNUNGEN',
  'LIEFERSCHEINE',
  'AUSMESSBERICHT',
  'KUNDEN_DOKUMENT',
]

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

  const customer_id = user.app_metadata?.customer_id
  const role = user.app_metadata?.role

  if (!customer_id || role !== 'customer') {
    return null
  }

  return { customer_id }
}

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

    const session = await getCustomerSession(request)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

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

    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('id, project_id, type, file_path')
      .eq('id', documentId)
      .single()

    if (fetchError || !document) {
      return NextResponse.json(
        { success: false, error: 'DOCUMENT_NOT_FOUND' },
        { status: 404 }
      )
    }

    const ownsProject = await isCustomerProject(supabase, session.customer_id, document.project_id)
    if (!ownsProject) {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    if (!ALLOWED_TYPES.includes(document.type)) {
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
