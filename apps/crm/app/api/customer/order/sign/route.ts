/**
 * POST /api/customer/order/sign
 *
 * Kunde unterschreibt Auftrag online (token-basiert, kein Login nötig).
 * Validiert Token, speichert Unterschrift + Widerrufsverzicht.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, signature, signedBy, withdrawalWaived } = body

    if (!token || !signature || !signedBy) {
      return NextResponse.json(
        { error: 'Token, Unterschrift und Name sind erforderlich' },
        { status: 400 }
      )
    }

    if (withdrawalWaived !== true) {
      return NextResponse.json(
        { error: 'Bitte bestätigen Sie den Verzicht auf das Widerrufsrecht' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    // Token validieren
    const { data: tokenRow, error: tokenError } = await supabase
      .from('order_sign_tokens')
      .select('project_id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (tokenError || !tokenRow) {
      return NextResponse.json(
        { error: 'Ungültiger oder abgelaufener Link. Bitte fordern Sie einen neuen Link an.' },
        { status: 400 }
      )
    }

    const projectId = tokenRow.project_id

    // Projekt updaten
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        customer_signature: signature,
        customer_signature_date: new Date().toISOString().split('T')[0],
        order_contract_signed_at: new Date().toISOString(),
        order_contract_signed_by: signedBy,
        withdrawal_waived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)

    if (updateError) {
      console.error('Order sign update error:', updateError)
      return NextResponse.json(
        { error: 'Fehler beim Speichern der Unterschrift' },
        { status: 500 }
      )
    }

    // Token löschen (Einmalnutzung)
    await supabase.from('order_sign_tokens').delete().eq('token', token)

    return NextResponse.json({ success: true, message: 'Auftrag erfolgreich unterschrieben' })
  } catch (error) {
    console.error('Order sign error:', error)
    return NextResponse.json(
      { error: 'Ein unerwarteter Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/customer/order/sign?token=xxx
 *
 * Validiert Token und gibt Projekt-Infos für die Anzeige zurück.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'Token fehlt' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    const { data: tokenRow, error: tokenError } = await supabase
      .from('order_sign_tokens')
      .select('project_id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (tokenError || !tokenRow) {
      return NextResponse.json(
        { error: 'Ungültiger oder abgelaufener Link' },
        { status: 400 }
      )
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, order_number, customer_name, customer_signature, order_contract_signed_at')
      .eq('id', tokenRow.project_id)
      .is('deleted_at', null)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

    // Bereits unterschrieben?
    if (project.order_contract_signed_at) {
      return NextResponse.json({
        alreadySigned: true,
        orderNumber: project.order_number,
        customerName: project.customer_name,
      })
    }

    return NextResponse.json({
      projectId: project.id,
      orderNumber: project.order_number,
      customerName: project.customer_name,
    })
  } catch (error) {
    console.error('Order sign GET error:', error)
    return NextResponse.json(
      { error: 'Ein unerwarteter Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}
