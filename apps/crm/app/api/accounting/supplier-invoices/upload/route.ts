import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
      p_permission_code: 'menu_accounting',
    })
    if (permError || !hasPermission) {
      return NextResponse.json(
        { error: 'Keine Berechtigung für Buchhaltung' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file || !file.size) {
      return NextResponse.json(
        { error: 'Bitte eine Datei auswählen (PDF oder Bild)' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Datei zu groß (max. 10 MB)' },
        { status: 400 }
      )
    }

    const mimeType = file.type || 'application/octet-stream'
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: 'Nur PDF oder Bild (JPG, PNG, WebP) erlaubt' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = mimeType === 'application/pdf' ? 'pdf' : mimeType.split('/')[1] || 'jpg'
    const sanitizedName = (file.name || `beleg.${ext}`).replace(/[^a-zA-Z0-9-_.]/g, '_')
    const storagePath = `supplier-invoices/${user.id}/${Date.now()}_${sanitizedName}`

    const serviceClient = await createServiceClient()
    const { error: uploadError } = await serviceClient.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      })

    if (uploadError) {
      logger.error('Supplier invoice upload error', { component: 'supplier-invoice-upload' }, uploadError as Error)
      return NextResponse.json(
        { error: 'Hochladen fehlgeschlagen: ' + uploadError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      documentUrl: storagePath,
      documentName: file.name || sanitizedName,
    })
  } catch (error) {
    logger.error('Supplier invoice upload error', { component: 'supplier-invoice-upload' }, error as Error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Hochladen fehlgeschlagen' },
      { status: 500 }
    )
  }
}
