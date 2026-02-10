import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { apiErrors } from '@/lib/utils/errorHandling'
import type { DocumentType } from './schema'
import { getPermissionCode } from './helpers'
import type { AuthorizationContext } from './types'

export async function authorizePublish(
  documentType: DocumentType,
  projectId: string,
): Promise<AuthorizationContext | NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiErrors.unauthorized({ component: 'api/portal/publish-document' })
  }

  if (user.app_metadata?.role === 'customer') {
    return apiErrors.forbidden({ component: 'api/portal/publish-document' })
  }

  const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
  if (companyError || !companyId) {
    return apiErrors.forbidden({ component: 'api/portal/publish-document' })
  }

  const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
    p_permission_code: getPermissionCode(documentType),
  })
  if (permError || !hasPermission) {
    return apiErrors.forbidden({ component: 'api/portal/publish-document' })
  }

  const serviceClient = await createServiceClient()

  const { data: projectRow, error: projectError } = await serviceClient
    .from('projects')
    .select('id, user_id')
    .eq('id', projectId)
    .single()

  if (projectError || !projectRow) {
    return apiErrors.notFound({ component: 'api/portal/publish-document', projectId })
  }

  const { data: ownerMembership, error: membershipError } = await serviceClient
    .from('company_members')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', projectRow.user_id || '')
    .eq('is_active', true)
    .single()

  if (membershipError || !ownerMembership) {
    return apiErrors.forbidden({ component: 'api/portal/publish-document', projectId })
  }

  return {
    user,
    companyId,
    serviceClient,
  }
}
