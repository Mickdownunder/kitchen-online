import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * GET: List team members for calendar (id + full_name)
 * Used for employee color coding in calendar.
 * Requires menu_calendar permission.
 */
export async function GET() {
  const apiLogger = logger.api('/api/calendar/team', 'GET')
  const startTime = apiLogger.start()

  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      apiLogger.error(new Error('Not authenticated'), 401)
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
      p_permission_code: 'menu_calendar',
    })
    if (permError || !hasPermission) {
      apiLogger.error(new Error('No permission'), 403)
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const { data: members, error: membersError } = await supabase.rpc('get_company_members')
    if (membersError) {
      logger.error(
        'RPC get_company_members failed',
        { component: 'api/calendar/team' },
        membersError as Error
      )
      apiLogger.end(startTime, 500)
      return NextResponse.json({ error: 'Fehler beim Laden des Teams' }, { status: 500 })
    }

    const team = (members || [])
      .filter((m: { is_active?: boolean }) => m.is_active !== false)
      .map((m: { user_id: string; full_name: string | null }) => ({
        id: m.user_id,
        fullName: m.full_name || '',
      }))

    apiLogger.end(startTime, 200)
    return NextResponse.json({ team })
  } catch (error: unknown) {
    apiLogger.error(error as Error, 500)
    logger.error(
      'Calendar team API error',
      { component: 'api/calendar/team' },
      error as Error
    )
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Serverfehler' },
      { status: 500 }
    )
  }
}
