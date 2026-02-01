import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getAuditLogs } from '@/lib/supabase/services/audit'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/middleware/rateLimit'

// GET - Read audit logs (nur für authentifizierte CRM-User mit Admin-Rolle)
export async function GET(request: NextRequest) {
  const apiLogger = logger.api('/api/audit-logs', 'GET')
  apiLogger.start()

  try {
    // Auth-Check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      apiLogger.error(new Error('Not authenticated'), 401)
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // Keine Kunden
    if (user.app_metadata?.role === 'customer') {
      apiLogger.error(new Error('No permission - customer role'), 403)
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Company-Check
    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      apiLogger.error(new Error('No company assigned'), 403)
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 403 })
    }

    // Permission-Check: Nur Admin-Rollen dürfen Audit-Logs lesen
    const { data: member } = await supabase
      .from('company_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single() as { data: { role: string } | null }

    if (!member || !['geschaeftsfuehrer', 'administration'].includes(member.role)) {
      apiLogger.error(new Error('No permission - insufficient role'), 403)
      return NextResponse.json({ error: 'Keine Berechtigung für Audit-Logs' }, { status: 403 })
    }

    // Rate Limiting
    const limitCheck = await rateLimit(request, user.id)
    if (!limitCheck?.allowed) {
      return NextResponse.json(
        { error: 'Zu viele Anfragen', resetTime: limitCheck?.resetTime },
        { status: 429 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500) // Max 500
    const offset = parseInt(searchParams.get('offset') || '0')
    const action = searchParams.get('action') || undefined
    const entityType = searchParams.get('entityType') || undefined
    const entityId = searchParams.get('entityId') || undefined
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined

    const logs = await getAuditLogs({
      limit,
      offset,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
    })

    apiLogger.complete({ logCount: logs.length })
    return NextResponse.json({ logs })
  } catch (error) {
    apiLogger.error(error as Error)
    logger.error(
      'Audit logs API error',
      {
        component: 'api/audit-logs',
      },
      error as Error
    )
    return NextResponse.json({ error: 'Fehler beim Laden der Audit-Logs' }, { status: 500 })
  }
}

// POST - Create audit log entry (nur für authentifizierte CRM-User)
export async function POST(request: NextRequest) {
  const apiLogger = logger.api('/api/audit-logs', 'POST')
  apiLogger.start()

  try {
    // Auth-Check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      apiLogger.error(new Error('Not authenticated'), 401)
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // Keine Kunden
    if (user.app_metadata?.role === 'customer') {
      apiLogger.error(new Error('No permission - customer role'), 403)
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Company-Check
    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      apiLogger.error(new Error('No company assigned'), 403)
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 403 })
    }

    const body = await request.json()
    const { action, entityType, entityId, changes, metadata } = body

    if (!action || !entityType) {
      return NextResponse.json(
        { error: 'action und entityType sind erforderlich' },
        { status: 400 }
      )
    }

    // Direkt in audit_logs schreiben mit Service-Client, damit company_id garantiert gesetzt ist
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const serviceSupabase = await createServiceClient()
    const { data: row, error: insertError } = await serviceSupabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        company_id: companyId,
        action: String(action),
        entity_type: String(entityType),
        entity_id: entityId || null,
        changes: changes ?? null,
        ip_address: ipAddress,
        user_agent: userAgent,
        request_id: null,
        metadata: metadata ?? null,
      })
      .select('id')
      .single()

    if (insertError) {
      logger.error('Audit log insert failed', { component: 'api/audit-logs', action }, insertError)
      return NextResponse.json({ error: 'Fehler beim Schreiben des Audit-Logs' }, { status: 500 })
    }

    apiLogger.complete({ logId: row?.id })
    return NextResponse.json({ success: true, logId: row?.id })
  } catch (error) {
    apiLogger.error(error as Error)
    logger.error(
      'Audit log creation API error',
      {
        component: 'api/audit-logs',
      },
      error as Error
    )
    return NextResponse.json({ error: 'Fehler beim Erstellen des Audit-Logs' }, { status: 500 })
  }
}
