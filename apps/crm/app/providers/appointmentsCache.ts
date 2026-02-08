import { PlanningAppointment } from '@/types'
import { getAppointments } from '@/lib/supabase/services/appointments'
import { logger } from '@/lib/utils/logger'

export const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

export async function refreshAppointmentsWithCache(opts: {
  force?: boolean
  lastRefresh: number
  setLastRefresh: React.Dispatch<React.SetStateAction<number>>
  isRefreshingRef: React.MutableRefObject<boolean>
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  setAppointments: React.Dispatch<React.SetStateAction<PlanningAppointment[]>>
}): Promise<void> {
  const now = Date.now()
  const force = Boolean(opts.force)

  if (opts.isRefreshingRef.current) return
  if (!force && opts.lastRefresh > 0 && now - opts.lastRefresh < CACHE_DURATION_MS) return

  try {
    opts.isRefreshingRef.current = true
    opts.setIsLoading(true)
    const data = await getAppointments()
    opts.setAppointments(data || [])
    opts.setLastRefresh(Date.now())
  } catch (error) {
    logger.error('Error loading appointments from Supabase', { component: 'appointmentsCache' }, error instanceof Error ? error : new Error(String(error)))
    opts.setAppointments([])
  } finally {
    opts.setIsLoading(false)
    opts.isRefreshingRef.current = false
  }
}
