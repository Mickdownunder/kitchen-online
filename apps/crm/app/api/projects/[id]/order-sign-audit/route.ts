/**
 * GET /api/projects/[id]/order-sign-audit
 *
 * Liefert Audit-Daten zur Auftrags-Unterschrift (IP, User-Agent, Geodaten).
 * Nur für authentifizierte CRM-User mit Zugriff auf das Projekt.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getProject } from '@/lib/supabase/services/projects'
import { apiErrors } from '@/lib/utils/errorHandling'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    if (!projectId) {
      return apiErrors.badRequest({ component: 'api/projects/order-sign-audit' })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return apiErrors.unauthorized()
    }

    if (user.app_metadata?.role === 'customer') {
      return apiErrors.forbidden({ component: 'api/projects/order-sign-audit' })
    }

    // Prüfen ob User Zugriff auf Projekt hat
    const projectResult = await getProject(projectId, supabase)
    if (!projectResult.ok) {
      return apiErrors.notFound({ component: 'api/projects/order-sign-audit', projectId })
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
      console.warn('Order sign audit fetch error:', error)
      return apiErrors.internal(error as unknown as Error, { component: 'api/projects/order-sign-audit', projectId })
    }

    return NextResponse.json(data || null)
  } catch (error) {
    console.warn('Order sign audit API error:', error)
    return apiErrors.internal(error as Error, { component: 'api/projects/order-sign-audit' })
  }
}
