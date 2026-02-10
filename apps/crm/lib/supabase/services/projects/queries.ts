import { supabase } from '../../client'
import type { CustomerProject } from '@/types'
import { getCurrentUser } from '../auth'
import { logger } from '@/lib/utils/logger'
import { mapProjectFromDB } from './mappers'
import type { ProjectClient } from './types'

export async function getProjects(): Promise<CustomerProject[]> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      logger.warn('getProjects: No user authenticated, returning empty array', {
        component: 'projects',
      })
      return []
    }

    const { data, error } = await supabase
      .from('projects')
      .select(`*, invoice_items (*)`)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('getProjects error', { component: 'projects' }, error as Error)
      throw error
    }

    return (data || []).map(mapProjectFromDB)
  } catch (error: unknown) {
    const err = error as { message?: string; name?: string }
    if (err?.message?.includes('aborted') || err?.name === 'AbortError') {
      return []
    }

    logger.error('getProjects failed', { component: 'projects' }, error as Error)
    return []
  }
}

export async function getProject(
  id: string,
  client?: ProjectClient,
): Promise<CustomerProject | null> {
  const sb = client ?? supabase
  const { data, error } = await sb
    .from('projects')
    .select(`*, invoice_items (*)`)
    .eq('id', id)
    .single()

  if (error) {
    throw error
  }

  return data ? mapProjectFromDB(data) : null
}
