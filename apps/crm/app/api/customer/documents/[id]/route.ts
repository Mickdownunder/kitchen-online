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
 * DELETE /api/customer/documents/[id]
 * 
 * Löscht ein Kunden-Dokument.
 * Nur eigene KUNDEN_DOKUMENT Typen können gelöscht werden.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params

    // 1. Session prüfen
    const session = await getCustomerSession(request)
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { project_id, customer_id } = session

    // 2. Supabase Admin Client
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

    // 3. Dokument laden und Berechtigungen prüfen
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('id, project_id, type, uploaded_by, file_path')
      .eq('id', documentId)
      .single()

    if (fetchError || !document) {
      return NextResponse.json(
        { success: false, error: 'DOCUMENT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 4. Berechtigungen prüfen
    if (document.project_id !== project_id) {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    if (document.type !== 'KUNDEN_DOKUMENT') {
      return NextResponse.json(
        { success: false, error: 'CANNOT_DELETE_THIS_TYPE' },
        { status: 403 }
      )
    }

    if (document.uploaded_by !== customer_id) {
      return NextResponse.json(
        { success: false, error: 'NOT_YOUR_DOCUMENT' },
        { status: 403 }
      )
    }

    // 5. Aus Storage löschen
    if (document.file_path) {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.file_path])

      if (storageError) {
        console.error('Storage delete error:', storageError)
        // Weitermachen - DB-Eintrag trotzdem löschen
      }
    }

    // 6. Aus DB löschen
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (deleteError) {
      console.error('DB delete error:', deleteError)
      return NextResponse.json(
        { success: false, error: 'DELETE_FAILED' },
        { status: 500 }
      )
    }

    // 7. Erfolg
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Document delete error:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
