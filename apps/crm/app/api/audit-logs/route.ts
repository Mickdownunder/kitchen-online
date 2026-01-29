import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuditLogs } from '@/lib/supabase/services/audit'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  const apiLogger = logger.api('/api/audit-logs', 'GET')
  const startTime = apiLogger.start()

  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      apiLogger.error(new Error('Not authenticated'), 401)
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { data: canManage, error: canManageError } = await supabase.rpc('can_manage_users')
    if (canManageError || !canManage) {
      apiLogger.error(new Error('No permission'), 403)
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      apiLogger.error(new Error('No company assigned'), 403)
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const action = searchParams.get('action') || undefined
    const entityType = searchParams.get('entityType') || undefined

    const logs = await getAuditLogs({
      limit,
      action,
      entityType,
    })

    apiLogger.end(startTime, 200)
    return NextResponse.json({ logs })
  } catch (error: unknown) {
    apiLogger.error(error as Error, 500)
    logger.error(
      'Audit logs API error',
      {
        component: 'api/audit-logs',
      },
      error as Error
    )
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Serverfehler' },
      { status: 500 }
    )
  }
}
