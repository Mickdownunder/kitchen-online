import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { NextResponse } from 'next/server'
import { apiErrors } from '@/lib/utils/errorHandling'
import type { Database } from '@/types/database.types'

type DbClient = SupabaseClient<Database>

interface AccessGranted {
  ok: true
  user: User
}

interface AccessDenied {
  ok: false
  response: NextResponse
}

export async function requireInboxAccess(supabase: DbClient): Promise<AccessGranted | AccessDenied> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      ok: false,
      response: apiErrors.unauthorized({ component: 'inbound-access' }),
    }
  }

  if (user.app_metadata?.role === 'customer') {
    return {
      ok: false,
      response: apiErrors.forbidden({ component: 'inbound-access' }),
    }
  }

  const [projectPermission, accountingPermission] = await Promise.all([
    supabase.rpc('has_permission', { p_permission_code: 'edit_projects' }),
    supabase.rpc('has_permission', { p_permission_code: 'menu_accounting' }),
  ])

  if (projectPermission.error || accountingPermission.error) {
    return {
      ok: false,
      response: apiErrors.forbidden({ component: 'inbound-access', reason: 'permission_check_failed' }),
    }
  }

  if (!projectPermission.data && !accountingPermission.data) {
    return {
      ok: false,
      response: apiErrors.forbidden({ component: 'inbound-access', reason: 'missing_permission' }),
    }
  }

  return {
    ok: true,
    user,
  }
}
