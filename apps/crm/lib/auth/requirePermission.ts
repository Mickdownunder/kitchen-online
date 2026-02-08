import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}

export async function requirePermission(permissionCode: string) {
  const { supabase, user } = await requireUser()

  const { data: rpcResult, error: rpcError } = await supabase.rpc('has_permission', {
    p_permission_code: permissionCode,
  })

  if (!rpcError && rpcResult === true) {
    return { supabase, user }
  }

  logger.warn('Access denied', {
    component: 'requirePermission',
    permissionCode,
    error: rpcError?.message,
  })
  redirect('/dashboard')
}
