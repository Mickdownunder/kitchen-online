import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
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
    const limitParam = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 500)
    const offsetParam = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)
    const action = searchParams.get('action') || undefined
    const entityType = searchParams.get('entityType') || undefined
    const entityId = searchParams.get('entityId') || undefined
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined

    // Eine durchgängige Abfrage-Kette (company_id als String sicherstellen)
    const companyIdStr = typeof companyId === 'string' ? companyId : String(companyId ?? '')
    const serviceSupabase = await createServiceClient()

    const rangeFrom = offsetParam
    const rangeTo = offsetParam + limitParam - 1

    const { data: rows, error: fetchError } = await serviceSupabase
      .from('audit_logs')
      .select('id, user_id, action, entity_type, entity_id, changes, metadata, created_at')
      .eq('company_id', companyIdStr)
      .order('created_at', { ascending: false })
      .range(rangeFrom, rangeTo)

    if (fetchError) {
      logger.error('Audit logs fetch failed', { component: 'api/audit-logs', message: fetchError.message }, fetchError)
      return NextResponse.json({ error: 'Fehler beim Laden der Audit-Logs' }, { status: 500 })
    }

    const list = (rows || []) as { id: string; user_id: string | null; action: string; entity_type: string; entity_id: string | null; changes: unknown; metadata: unknown; created_at: string }[]

    // Optionale Filter clientseitig anwenden (Abfrage liefert bereits paginiert)
    const filtered = list.filter(row => {
      if (action && row.action !== action) return false
      if (entityType && row.entity_type !== entityType) return false
      if (entityId && row.entity_id !== entityId) return false
      if (startDate && new Date(row.created_at) < startDate) return false
      if (endDate && new Date(row.created_at) > endDate) return false
      return true
    })

    const userIds = [...new Set(filtered.map(r => r.user_id).filter(Boolean))] as string[]
    if (filtered.length === 0) {
      apiLogger.complete({ logCount: 0 })
      return NextResponse.json({ logs: [] })
    }
    const profilesMap: Record<string, { email: string | null; full_name: string | null }> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await serviceSupabase
        .from('user_profiles')
        .select('id, email, full_name')
        .in('id', userIds)
      ;(profiles || []).forEach((p: { id: string; email: string | null; full_name: string | null }) => {
        profilesMap[p.id] = { email: p.email ?? null, full_name: p.full_name ?? null }
      })
    }

    const logs = filtered.map(row => {
      const profile = row.user_id ? profilesMap[row.user_id] : null
      return {
        id: row.id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        createdAt: row.created_at,
        userName: profile?.full_name ?? null,
        userEmail: profile?.email ?? null,
        changes: row.changes,
        metadata: row.metadata ?? null,
      }
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
