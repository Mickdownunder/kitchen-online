import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/accounting/supplier-invoices/[id]/document
 * Liefert eine signierte URL zum Anzeigen des Belegs (PDF/Bild).
 * Nur für eigene Eingangsrechnungen mit document_url.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'ID fehlt' }, { status: 400 })
  }

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

  const { data: row, error } = await supabase
    .from('supplier_invoices')
    .select('document_url')
    .eq('id', id)
    .single()

  if (error || !row?.document_url) {
    return NextResponse.json(
      { error: 'Rechnung oder Beleg nicht gefunden' },
      { status: 404 }
    )
  }

  const serviceClient = await createServiceClient()
  const { data: signed, error: signError } = await serviceClient.storage
    .from('documents')
    .createSignedUrl(row.document_url, 300) // 5 Min gültig

  if (signError || !signed?.signedUrl) {
    return NextResponse.json(
      { error: 'Beleg konnte nicht geladen werden' },
      { status: 500 }
    )
  }

  return NextResponse.redirect(signed.signedUrl)
}
