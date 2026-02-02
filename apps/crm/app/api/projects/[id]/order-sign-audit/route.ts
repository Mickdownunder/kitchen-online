/**
 * GET /api/projects/[id]/order-sign-audit
 *
 * Liefert Audit-Daten zur Auftrags-Unterschrift (IP, User-Agent, Geodaten).
 * Nur für authentifizierte CRM-User mit Zugriff auf das Projekt.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getProject } from '@/lib/supabase/services/projects'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    if (!projectId) {
      return NextResponse.json({ error: 'Projekt-ID fehlt' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    if (user.app_metadata?.role === 'customer') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Prüfen ob User Zugriff auf Projekt hat
    const project = await getProject(projectId, supabase)
    if (!project) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

    const serviceSupabase = await createServiceClient()
    const { data, error } = await serviceSupabase
      .from('order_sign_audit')
      .select('project_id, signed_at, signed_by, ip_address, user_agent, geodata')
      .eq('project_id', projectId)
      .order('signed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Order sign audit fetch error:', error)
      return NextResponse.json(
        { error: 'Keine Audit-Daten gefunden' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || null)
  } catch (error) {
    console.error('Order sign audit API error:', error)
    return NextResponse.json(
      { error: 'Ein unerwarteter Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}
