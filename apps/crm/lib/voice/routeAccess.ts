import type { User } from '@supabase/supabase-js'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getCompanySettingsById } from '@/lib/supabase/services/company'
import { rateLimit } from '@/lib/middleware/rateLimit'
import { apiErrors } from '@/lib/utils/errorHandling'

interface VoiceRouteContext {
  authSupabase: Awaited<ReturnType<typeof createClient>>
  serviceSupabase: Awaited<ReturnType<typeof createServiceClient>>
  user: User
  companyId: string
  companySettings: Awaited<ReturnType<typeof getCompanySettingsById>>
}

interface VoiceRouteAccessOptions {
  request: Request
  requireManageCompany?: boolean
  requireInboxPermission?: boolean
}

export async function requireVoiceRouteAccess(
  options: VoiceRouteAccessOptions,
): Promise<VoiceRouteContext | Response> {
  const authSupabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await authSupabase.auth.getUser()

  if (authError || !user) {
    return apiErrors.unauthorized({ component: 'voice-route-access' })
  }

  if (user.app_metadata?.role === 'customer') {
    return apiErrors.forbidden({ component: 'voice-route-access', reason: 'customer_user' })
  }

  const limitCheck = await rateLimit(options.request, user.id)
  if (limitCheck && !limitCheck.allowed) {
    return apiErrors.rateLimit(limitCheck.resetTime)
  }

  const { data: companyId, error: companyError } = await authSupabase.rpc('get_current_company_id')
  if (companyError || !companyId) {
    return apiErrors.forbidden({ component: 'voice-route-access', reason: 'no_company' })
  }

  if (options.requireManageCompany) {
    const { data: canManageCompany, error: canManageError } = await authSupabase.rpc('has_permission', {
      p_permission_code: 'manage_company',
    })

    if (canManageError || !canManageCompany) {
      return apiErrors.forbidden({ component: 'voice-route-access', reason: 'missing_manage_company' })
    }
  }

  if (options.requireInboxPermission) {
    const [projectPermission, accountingPermission] = await Promise.all([
      authSupabase.rpc('has_permission', { p_permission_code: 'edit_projects' }),
      authSupabase.rpc('has_permission', { p_permission_code: 'menu_accounting' }),
    ])

    if (projectPermission.error || accountingPermission.error) {
      return apiErrors.forbidden({ component: 'voice-route-access', reason: 'permission_check_failed' })
    }

    if (!projectPermission.data && !accountingPermission.data) {
      return apiErrors.forbidden({ component: 'voice-route-access', reason: 'missing_inbox_permission' })
    }
  }

  const serviceSupabase = await createServiceClient()
  const companySettings = await getCompanySettingsById(companyId, serviceSupabase)

  if (!companySettings) {
    return apiErrors.forbidden({ component: 'voice-route-access', reason: 'missing_company_settings' })
  }

  return {
    authSupabase,
    serviceSupabase,
    user,
    companyId,
    companySettings,
  }
}
