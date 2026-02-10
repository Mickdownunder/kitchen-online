import type React from 'react'
import type { CustomerProject } from '@/types'
import { getProjects } from '@/lib/supabase/services'
import { logger } from '@/lib/utils/logger'

export const CACHE_DURATION_MS = 5 * 60 * 1000

export async function refreshProjectsWithCache(opts: {
  force?: boolean
  silent?: boolean
  lastRefresh: number
  setLastRefresh: React.Dispatch<React.SetStateAction<number>>
  isRefreshingRef: React.MutableRefObject<boolean>
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  setProjects: React.Dispatch<React.SetStateAction<CustomerProject[]>>
}): Promise<void> {
  const now = Date.now()
  const force = Boolean(opts.force)
  const silent = Boolean(opts.silent)

  if (opts.isRefreshingRef.current) return
  if (!force && opts.lastRefresh > 0 && now - opts.lastRefresh < CACHE_DURATION_MS) return

  try {
    opts.isRefreshingRef.current = true
    if (!silent) opts.setIsLoading(true)
    const dataResult = await getProjects()
    opts.setProjects(dataResult.ok ? dataResult.data : [])
    opts.setLastRefresh(Date.now())
    if (!dataResult.ok) {
      logger.error(
        'Error loading projects from Supabase',
        { component: 'projectsCache', code: dataResult.code },
        new Error(dataResult.message),
      )
    }
  } catch (error) {
    logger.error('Error loading projects from Supabase', { component: 'projectsCache' }, error instanceof Error ? error : new Error(String(error)))
    opts.setProjects([])
  } finally {
    if (!silent) opts.setIsLoading(false)
    opts.isRefreshingRef.current = false
  }
}
