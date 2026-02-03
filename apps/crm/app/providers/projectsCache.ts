import type React from 'react'
import type { CustomerProject } from '@/types'
import { getProjects } from '@/lib/supabase/services'

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
    const data = await getProjects()
    opts.setProjects(data || [])
    opts.setLastRefresh(Date.now())
  } catch (error) {
    console.error('Error loading projects from Supabase:', error)
    opts.setProjects([])
  } finally {
    if (!silent) opts.setIsLoading(false)
    opts.isRefreshingRef.current = false
  }
}
