import { supabase } from '../client'
import { UserRole } from '@/types'
import { getCurrentUser } from './auth'

export type PermissionCode =
  | 'menu_dashboard'
  | 'menu_projects'
  | 'menu_customers'
  | 'menu_articles'
  | 'menu_deliveries'
  | 'menu_calendar'
  | 'menu_complaints'
  | 'menu_invoices'
  | 'menu_statistics'
  | 'menu_accounting'
  | 'menu_settings'
  | 'view_purchase_prices'
  | 'edit_purchase_prices'
  | 'view_margins'
  | 'edit_projects'
  | 'delete_projects'
  | 'create_invoices'
  | 'mark_payments'
  | 'manage_users'
  | 'manage_company'
  | 'export_data'

export type CompanyMemberRole =
  | 'geschaeftsfuehrer'
  | 'administration'
  | 'buchhaltung'
  | 'verkaeufer'
  | 'monteur'

export interface CompanyMember {
  id: string
  companyId: string
  userId: string
  role: CompanyMemberRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Deny-all permission set for fail-closed behavior
const denyAll: Record<PermissionCode, boolean> = {
  menu_dashboard: false,
  menu_projects: false,
  menu_customers: false,
  menu_articles: false,
  menu_deliveries: false,
  menu_calendar: false,
  menu_complaints: false,
  menu_invoices: false,
  menu_statistics: false,
  menu_accounting: false,
  menu_settings: false,
  view_purchase_prices: false,
  edit_purchase_prices: false,
  view_margins: false,
  edit_projects: false,
  delete_projects: false,
  create_invoices: false,
  mark_payments: false,
  manage_users: false,
  manage_company: false,
  export_data: false,
}

function defaultPermissionsForRole(
  role: UserRole | CompanyMemberRole | undefined
): Record<PermissionCode, boolean> {
  // FAIL-CLOSED: If role is missing or undefined, deny all access
  if (!role) return { ...denyAll }

  const allowAll: Record<PermissionCode, boolean> = {
    menu_dashboard: true,
    menu_projects: true,
    menu_customers: true,
    menu_articles: true,
    menu_deliveries: true,
    menu_calendar: true,
    menu_complaints: true,
    menu_invoices: true,
    menu_statistics: true,
    menu_accounting: true,
    menu_settings: true,
    view_purchase_prices: true,
    edit_purchase_prices: true,
    view_margins: true,
    edit_projects: true,
    delete_projects: true,
    create_invoices: true,
    mark_payments: true,
    manage_users: true,
    manage_company: true,
    export_data: true,
  }

  const buchhaltungDefaults: Record<PermissionCode, boolean> = {
    menu_dashboard: true,
    menu_projects: false,
    menu_customers: false,
    menu_articles: false,
    menu_deliveries: false,
    menu_calendar: false,
    menu_complaints: false,
    menu_invoices: true,
    menu_statistics: true,
    menu_accounting: true,
    menu_settings: false,
    view_purchase_prices: true,
    edit_purchase_prices: false,
    view_margins: true,
    edit_projects: false,
    delete_projects: false,
    create_invoices: true,
    mark_payments: true,
    manage_users: false,
    manage_company: false,
    export_data: true,
  }

  const verkaeuferDefaults: Record<PermissionCode, boolean> = {
    menu_dashboard: true,
    menu_projects: true,
    menu_customers: true,
    menu_articles: true,
    menu_deliveries: true,
    menu_calendar: true,
    menu_complaints: true,
    menu_invoices: false,
    menu_statistics: false,
    menu_accounting: false,
    menu_settings: false,
    view_purchase_prices: false,
    edit_purchase_prices: false,
    view_margins: false,
    edit_projects: true,
    delete_projects: false,
    create_invoices: false,
    mark_payments: false,
    manage_users: false,
    manage_company: false,
    export_data: false,
  }

  const monteurDefaults: Record<PermissionCode, boolean> = {
    menu_dashboard: true,
    menu_projects: true,
    menu_customers: false,
    menu_articles: false,
    menu_deliveries: true,
    menu_calendar: true,
    menu_complaints: true,
    menu_invoices: false,
    menu_statistics: false,
    menu_accounting: false,
    menu_settings: false,
    view_purchase_prices: false,
    edit_purchase_prices: false,
    view_margins: false,
    edit_projects: true,
    delete_projects: false,
    create_invoices: false,
    mark_payments: false,
    manage_users: false,
    manage_company: false,
    export_data: false,
  }

  // Known roles with explicit permissions
  if (role === 'geschaeftsfuehrer') return allowAll
  if (role === 'administration') return allowAll
  if (role === 'buchhaltung') return buchhaltungDefaults
  if (role === 'verkaeufer') return verkaeuferDefaults
  if (role === 'monteur') return monteurDefaults

  // Legacy roles mapped to equivalent new roles
  if (role === 'owner' || role === 'admin') return allowAll
  if (role === 'manager') return { ...allowAll, manage_users: false, manage_company: false }
  if (role === 'employee') return verkaeuferDefaults

  // FAIL-CLOSED: Unknown role gets no permissions
  return { ...denyAll }
}

export async function getCurrentCompanyId(): Promise<string | null> {
  try {
    // Versuche RPC-Funktion zuerst (schneller wenn vorhanden)
    try {
      const { data, error } = await supabase.rpc('get_current_company_id')
      if (!error && data) {
        return String(data)
      }
      // RPC fehlgeschlagen - kein Logging nötig, Fallback wird verwendet
    } catch {
      // RPC-Funktion existiert möglicherweise nicht - Fallback verwenden
    }

    // Fallback: Hole company_id direkt aus company_members
    const user = await getCurrentUser()
    if (!user) {
      console.warn('getCurrentCompanyId: No user found')
      return null
    }

    // Versuche zuerst mit is_active Filter
    let { data: memberData, error: memberError } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    // Falls kein aktives Mitglied gefunden, versuche ohne is_active Filter
    if (!memberData && !memberError) {
      const result = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()
      memberData = result.data
      memberError = result.error
    }

    if (memberError) {
      // PGRST116 = no rows returned (not an error, just no data)
      const errorCode = (memberError as Error & { code?: string }).code
      if (errorCode === 'PGRST116') {
        console.warn('getCurrentCompanyId: User not found in company_members')
        return null
      }
      console.error('getCurrentCompanyId: Error fetching from company_members', {
        error: memberError.message,
        code: errorCode,
        userId: user.id,
      })
      return null
    }

    if (!memberData?.company_id) {
      console.warn('getCurrentCompanyId: No company_id found for user', { userId: user.id })
      return null
    }

    return memberData.company_id
  } catch (error: unknown) {
    console.error('getCurrentCompanyId: Unexpected error', {
      message: error instanceof Error ? error.message : 'Unknown',
    })
    return null
  }
}

export async function getEffectivePermissions(
  profileRole?: UserRole | CompanyMemberRole
): Promise<Record<PermissionCode, boolean>> {
  // FAIL-CLOSED: Tries server-side RBAC first; falls back to role-based defaults.
  // If role is missing and RPC fails, returns deny-all.
  try {
    const { data, error } = await supabase.rpc('get_effective_permissions')

    // If RPC fails, fall back to role-based permissions (which is deny-all if no role)
    if (error) {
      if (error.code !== 'P0001') {
        console.warn('[getEffectivePermissions] RPC error (using role fallback):', error.message)
      }
      return defaultPermissionsForRole(profileRole)
    }

    // If no data or empty array, fall back to role-based permissions
    if (!data || !Array.isArray(data) || data.length === 0) {
      return defaultPermissionsForRole(profileRole)
    }

    // FAIL-CLOSED: Start with deny-all, then explicitly grant only what RPC returns
    const result = { ...denyAll }
    data.forEach((row: { permission_code: string; allowed: boolean }) => {
      const code = row.permission_code as PermissionCode
      if (code && code in result) {
        result[code] = Boolean(row.allowed)
      }
    })
    return result
  } catch (error: unknown) {
    // FAIL-CLOSED: On unexpected errors, use role fallback (deny-all if no role)
    console.warn(
      '[getEffectivePermissions] Unexpected error (using role fallback):',
      error instanceof Error ? error.message : 'Unknown'
    )
    return defaultPermissionsForRole(profileRole)
  }
}

export async function getCompanyMembers(companyId: string): Promise<CompanyMember[]> {
  const { data, error } = await supabase
    .from('company_members')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(
    (m: {
      id: string
      company_id: string
      role: string
      user_id: string
      is_active: boolean
      created_at: string
      updated_at: string
    }) => ({
      id: m.id,
      companyId: m.company_id,
      userId: m.user_id,
      role: m.role as CompanyMemberRole,
      isActive: m.is_active,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    })
  )
}

export async function upsertRolePermission(
  companyId: string,
  role: CompanyMemberRole,
  code: PermissionCode,
  allowed: boolean
) {
  // Security enforced in RPC (manage_users permission)
  const { error } = await supabase.rpc('upsert_role_permission', {
    p_company_id: companyId,
    p_role: role,
    p_permission_code: code,
    p_allowed: allowed,
  })
  if (error) throw error
}

export async function upsertUserPermission(
  companyId: string,
  userId: string,
  code: PermissionCode,
  allowed: boolean
) {
  const { error } = await supabase.rpc('upsert_user_permission', {
    p_company_id: companyId,
    p_user_id: userId,
    p_permission_code: code,
    p_allowed: allowed,
  })
  if (error) throw error
}
