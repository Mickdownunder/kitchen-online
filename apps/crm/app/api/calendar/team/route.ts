import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { apiErrors } from '@/lib/utils/errorHandling'

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
      return apiErrors.unauthorized()
    }

    const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
      p_permission_code: 'menu_calendar',
    })
    if (permError || !hasPermission) {
      apiLogger.error(new Error('No permission'), 403)
      return apiErrors.forbidden()
    }

    const { data: members, error: membersError } = await supabase.rpc('get_company_members')
    if (membersError) {
      logger.error(
        'RPC get_company_members failed',
        { component: 'api/calendar/team' },
        membersError as Error
      )
      apiLogger.end(startTime, 500)
      return apiErrors.internal(membersError as Error, { component: 'api/calendar/team' })
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
    return apiErrors.internal(error as Error, { component: 'api/calendar/team' })
  }
}
