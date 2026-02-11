import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { apiErrors } from '@/lib/utils/errorHandling'

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024
const ALLOWED_KINDS = new Set(['ab', 'supplier_delivery_note'])
const AB_DOCUMENT_MIGRATION_HINT =
  'AB-Dokumentfelder fehlen. Bitte Migration 20260211004000_supplier_order_ab_documents.sql ausführen.'

interface PostgrestErrorLike {
  code?: string
  message?: string
  details?: string
  hint?: string
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function isAbDocumentColumnMissing(error: unknown): boolean {
  const err = (error || {}) as PostgrestErrorLike
  const code = String(err.code || '').toUpperCase()
  const blob = [err.message, err.details, err.hint].filter(Boolean).join(' ').toLowerCase()
  return (
    code === '42703' ||
    ((blob.includes('ab_document_url') ||
      blob.includes('ab_document_name') ||
      blob.includes('ab_document_mime_type')) &&
      blob.includes('does not exist'))
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: supplierOrderId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return apiErrors.unauthorized({ component: 'api/supplier-orders/documents' })
    }

    if (user.app_metadata?.role === 'customer') {
      return apiErrors.forbidden({ component: 'api/supplier-orders/documents' })
    }

    const { data: hasPermission, error: permissionError } = await supabase.rpc('has_permission', {
      p_permission_code: 'edit_projects',
    })

    if (permissionError) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Berechtigungsprüfung fehlgeschlagen. Bitte Team-Rolle/Company-Mitgliedschaft prüfen oder Admin kontaktieren.',
          code: 'PERMISSION_CHECK_FAILED',
        },
        { status: 500 },
      )
    }

    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Fehlende Berechtigung `edit_projects`. Bitte Benutzer in Teamverwaltung aktivieren und Rolle mit Projektbearbeitung zuweisen.',
          code: 'FORBIDDEN',
        },
        { status: 403 },
      )
    }

    const formData = await request.formData()
    const kind = String(formData.get('kind') || '').trim()
    const file = formData.get('file')

    if (!ALLOWED_KINDS.has(kind)) {
      return NextResponse.json(
        { success: false, error: 'Ungültiger Dokumenttyp.' },
        { status: 400 },
      )
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Datei fehlt.' },
        { status: 400 },
      )
    }

    if (!file.size || file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Datei ist leer oder größer als 15 MB.' },
        { status: 400 },
      )
    }

    const { data: orderRow, error: orderError } = await supabase
      .from('supplier_orders')
      .select('id, project_id, user_id')
      .eq('id', supplierOrderId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (orderError) {
      return apiErrors.internal(new Error(orderError.message), {
        component: 'api/supplier-orders/documents',
      })
    }

    if (!orderRow?.id) {
      return apiErrors.notFound({
        component: 'api/supplier-orders/documents',
        supplierOrderId,
      })
    }

    const safeName = sanitizeFileName(file.name || 'dokument')
    const storagePath = `supplier-orders/${supplierOrderId}/${kind}/${Date.now()}_${safeName}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const serviceClient = await createServiceClient()
    const { error: uploadError } = await serviceClient.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      return apiErrors.internal(new Error(uploadError.message), {
        component: 'api/supplier-orders/documents',
      })
    }

    if (kind === 'ab') {
      const { error: updateError } = await serviceClient
        .from('supplier_orders')
        .update({
          ab_document_url: storagePath,
          ab_document_name: safeName,
          ab_document_mime_type: file.type || null,
        })
        .eq('id', supplierOrderId)
        .eq('user_id', user.id)

      if (updateError) {
        await serviceClient.storage.from('documents').remove([storagePath])
        if (isAbDocumentColumnMissing(updateError)) {
          return NextResponse.json(
            { success: false, error: AB_DOCUMENT_MIGRATION_HINT, code: 'VALIDATION_ERROR' },
            { status: 400 },
          )
        }
        return apiErrors.internal(new Error(updateError.message), {
          component: 'api/supplier-orders/documents',
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        kind,
        storagePath,
        fileName: safeName,
        mimeType: file.type || null,
      },
    })
  } catch (error) {
    return apiErrors.internal(error as Error, { component: 'api/supplier-orders/documents' })
  }
}
