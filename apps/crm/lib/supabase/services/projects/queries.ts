import { fail, ok, type ServiceResult } from '@/lib/types/service'
import type { CustomerProject } from '@/types'
import { supabase } from '../../client'
import { getCurrentUser } from '../auth'
import { mapProjectFromDB } from './mappers'
import type { ProjectClient } from './types'
import {
  ensureAuthenticatedUserId,
  isNotFoundError,
  toInternalErrorResult,
} from './validators'

export async function getProjects(): Promise<ServiceResult<CustomerProject[]>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const { data, error } = await supabase
    .from('projects')
    .select(`*, invoice_items (*)`)
    .order('created_at', { ascending: false })

  if (error) {
    return toInternalErrorResult(error)
  }

  return ok((data || []).map(mapProjectFromDB))
}

export async function getProject(
  id: string,
  client?: ProjectClient,
): Promise<ServiceResult<CustomerProject>> {
  const sb = client ?? supabase
  const { data, error } = await sb
    .from('projects')
    .select(`*, invoice_items (*)`)
    .eq('id', id)
    .single()

  if (error) {
    if (isNotFoundError(error)) {
      return fail('NOT_FOUND', `Project ${id} not found`)
    }

    return toInternalErrorResult(error)
  }

  if (!data) {
    return fail('NOT_FOUND', `Project ${id} not found`)
  }

  return ok(mapProjectFromDB(data))
}
