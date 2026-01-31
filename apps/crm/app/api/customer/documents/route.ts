import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Upload Limits
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic']

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
 * POST /api/customer/documents
 * 
 * Upload eines Kunden-Dokuments.
 * Nur Typ KUNDEN_DOKUMENT erlaubt.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Session prüfen
    const session = await getCustomerSession(request)
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { project_id, customer_id } = session

    // 2. FormData parsen
    const formData = await request.formData()
    const file = formData.get('file') as File | null

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

    // 4. Supabase Admin Client
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

    // 5. File zu Supabase Storage hochladen
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const storagePath = `documents/${project_id}/customer/${fileName}`

    const fileBuffer = await file.arrayBuffer()
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
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
        project_id,
        type: 'KUNDEN_DOKUMENT',
        name: file.name,
        file_path: storagePath,
        uploaded_by: customer_id,
        file_size: file.size,
        mime_type: file.type,
        uploaded_at: uploadedAt,
      })
      .select('id, name, uploaded_at')
      .single()

    if (dbError) {
      console.error('DB error:', dbError)
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
    console.error('Document upload error:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
