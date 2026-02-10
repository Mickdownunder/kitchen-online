import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireCustomerSession } from '@/lib/auth/requireCustomerSession'

// Types for database queries
interface ProjectIdRow {
  id: string
}

interface DocumentRow {
  id: string
  name: string
  uploaded_at: string
}

// Upload Limits
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic']

async function resolveProjectId(
  supabase: SupabaseClient,
  customerId: string,
  requestedProjectId?: string | null
) {
  if (requestedProjectId) {
    const { data: project, error } = await supabase
      .from('projects')
      .select('id')
      .eq('id', requestedProjectId)
      .eq('customer_id', customerId)
      .is('deleted_at', null)
      .single() as { data: ProjectIdRow | null; error: unknown }

    if (error || !project) return null
    return project.id
  }

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id')
    .eq('customer_id', customerId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1) as { data: ProjectIdRow[] | null; error: unknown }

  if (error || !projects || projects.length === 0) return null
  return projects[0].id
}

/**
 * POST /api/customer/documents
 * 
 * Upload eines Kunden-Dokuments.
 * Nur Typ KUNDEN_DOKUMENT erlaubt.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Session prüfen
    const result = await requireCustomerSession(request)
    if (result instanceof NextResponse) return result
    const { customer_id, supabase } = result

    // 2. FormData parsen
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const requestedProjectId = formData.get('projectId')?.toString() ?? null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'NO_FILE_PROVIDED' },
        { status: 400 }
      )
    }

    // 3. File validieren
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'FILE_TOO_LARGE' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'INVALID_FILE_TYPE' },
        { status: 400 }
      )
    }

    const projectId = await resolveProjectId(supabase, customer_id, requestedProjectId)
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 5. File zu Supabase Storage hochladen
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const storagePath = `documents/${projectId}/customer/${fileName}`

    const fileBuffer = await file.arrayBuffer()
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.warn('Upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: 'UPLOAD_FAILED' },
        { status: 500 }
      )
    }

    // 6. Document in DB speichern
    const uploadedAt = new Date().toISOString()
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        project_id: projectId,
        type: 'KUNDEN_DOKUMENT',
        name: file.name,
        file_path: storagePath,
        uploaded_by: customer_id,
        file_size: file.size,
        mime_type: file.type,
        uploaded_at: uploadedAt,
      })
      .select('id, name, uploaded_at')
      .single() as { data: DocumentRow | null; error: unknown }

    if (dbError || !document) {
      console.warn('DB error:', dbError)
      // Cleanup: File aus Storage löschen
      await supabase.storage.from('documents').remove([storagePath])
      
      return NextResponse.json(
        { success: false, error: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    // 8. Erfolg
    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        createdAt: document.uploaded_at,
      },
    })

  } catch (error) {
    console.warn('Document upload error:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
