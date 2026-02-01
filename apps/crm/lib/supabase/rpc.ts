/**
 * Type-safe RPC helper functions
 *
 * Diese Funktionen bieten typisierte Wrapper für Supabase RPC-Aufrufe.
 * Sie umgehen Type-Inference-Probleme zwischen dem generierten Database-Type
 * und dem Supabase SDK.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

type TypedSupabase = SupabaseClient<Database>

/**
 * Prüft, ob der aktuelle Benutzer eine bestimmte Berechtigung hat
 */
export async function hasPermission(
  supabase: TypedSupabase,
  permissionCode: string
): Promise<{ data: boolean | null; error: Error | null }> {
  const result = await supabase.rpc('has_permission', {
    p_permission_code: permissionCode,
  } as Database['public']['Functions']['has_permission']['Args'])

  return {
    data: result.data as boolean | null,
    error: result.error,
  }
}

/**
 * Holt die aktuelle Company-ID des Benutzers
 */
export async function getCurrentCompanyId(
  supabase: TypedSupabase
): Promise<{ data: string | null; error: Error | null }> {
  const result = await supabase.rpc('get_current_company_id')
  return {
    data: result.data as string | null,
    error: result.error,
  }
}

/**
 * Holt die aktuelle Rolle des Benutzers
 */
export async function getCurrentRole(
  supabase: TypedSupabase
): Promise<{ data: string | null; error: Error | null }> {
  const result = await supabase.rpc('get_current_role')
  return {
    data: result.data as string | null,
    error: result.error,
  }
}

/**
 * Prüft, ob der aktuelle Benutzer Geschäftsführer ist
 */
export async function isCurrentUserGeschaeftsfuehrer(
  supabase: TypedSupabase
): Promise<{ data: boolean | null; error: Error | null }> {
  const result = await supabase.rpc('is_current_user_geschaeftsfuehrer')
  return {
    data: result.data as boolean | null,
    error: result.error,
  }
}

/**
 * Prüft, ob der aktuelle Benutzer Benutzer verwalten kann
 */
export async function canManageUsers(
  supabase: TypedSupabase
): Promise<{ data: boolean | null; error: Error | null }> {
  const result = await supabase.rpc('can_manage_users')
  return {
    data: result.data as boolean | null,
    error: result.error,
  }
}

/**
 * Holt die effektiven Berechtigungen für eine Rolle
 */
export async function getEffectivePermissions(
  supabase: TypedSupabase,
  role: string
): Promise<{ data: Array<{ permission_code: string; allowed: boolean }> | null; error: Error | null }> {
  const result = await supabase.rpc('get_effective_permissions', {
    p_role: role,
  } as Database['public']['Functions']['get_effective_permissions']['Args'])

  return {
    data: result.data as Array<{ permission_code: string; allowed: boolean }> | null,
    error: result.error,
  }
}

/**
 * Erstellt eine ausstehende Einladung
 */
export async function createPendingInvite(
  supabase: TypedSupabase,
  companyId: string,
  email: string,
  role: string,
  invitedBy: string
): Promise<{ data: string | null; error: Error | null }> {
  const result = await supabase.rpc('create_pending_invite', {
    p_company_id: companyId,
    p_email: email,
    p_role: role,
    p_invited_by: invitedBy,
  } as Database['public']['Functions']['create_pending_invite']['Args'])

  return {
    data: result.data as string | null,
    error: result.error,
  }
}

/**
 * Löscht eine ausstehende Einladung
 */
export async function deletePendingInvite(
  supabase: TypedSupabase,
  inviteId: string
): Promise<{ data: unknown; error: Error | null }> {
  const result = await supabase.rpc('delete_pending_invite', {
    p_invite_id: inviteId,
  } as Database['public']['Functions']['delete_pending_invite']['Args'])

  return {
    data: result.data,
    error: result.error,
  }
}
