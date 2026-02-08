import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireCustomerSession } from '@/lib/auth/requireCustomerSession'

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
    const result = await requireCustomerSession(request)
    if (result instanceof NextResponse) return result
    const { customer_id, supabase } = result

    // 3. Dokument laden und Berechtigungen prüfen
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('id, project_id, type, uploaded_by, file_path')
      .eq('id', documentId)
      .single()

    if (fetchError || !document || !document.project_id) {
      return NextResponse.json(
        { success: false, error: 'DOCUMENT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 4. Berechtigungen prüfen
    const ownsProject = await isCustomerProject(supabase, customer_id, document.project_id)
    if (!ownsProject) {
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
