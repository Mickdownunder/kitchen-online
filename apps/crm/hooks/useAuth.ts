'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { UserProfile } from '@/types'
import {
  getCurrentUserProfile,
  getEffectivePermissions,
  type PermissionCode,
} from '@/lib/supabase/services'
import { logger } from '@/lib/utils/logger'

export function useAuth() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [permissions, setPermissions] = useState<Record<string, boolean> | null>(null)
  const [companyRole, setCompanyRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const processedInviteRef = useRef(false)

  useEffect(() => {
    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          loadProfile(session.user)
        } else {
          setLoading(false)
        }
      })
      .catch((error: any) => {
        // Ignore aborted requests (normal during page navigation or component unmount)
        if (error?.message?.includes('aborted') || error?.name === 'AbortError') {
          return
        }
        console.error('Error getting session:', error)
        setLoading(false)
      })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        setUser(session?.user ?? null)
        if (session?.user) {
          // On sign in, check for pending invites
          if (event === 'SIGNED_IN' && !processedInviteRef.current) {
            processedInviteRef.current = true
            await processPendingInvite()
          }
          loadProfile(session.user)
        } else {
          setProfile(null)
          setPermissions(null)
          setCompanyRole(null)
          processedInviteRef.current = false
          setLoading(false)
        }
      } catch (error: any) {
        // Ignore aborted requests
        if (error?.message?.includes('aborted') || error?.name === 'AbortError') {
          return
        }
        console.error('Error in auth state change:', error)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Process pending invites for newly signed in users
  const processPendingInvite = async () => {
    try {
      const response = await fetch('/api/users/process-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      // Check if response is OK and content-type is JSON
      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json()
          console.error('[useAuth] Process invite error:', errorData)
        } else {
          // HTML error page - don't try to parse as JSON
          const text = await response.text()
          console.error(
            '[useAuth] Process invite failed with non-JSON response:',
            text.substring(0, 100)
          )
        }
        return
      }

      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json()
        if (result.processed) {
          logger.info('[useAuth] Invite processed', {
            component: 'useAuth',
            message: result.message,
          })
        }
      } else {
        console.warn('[useAuth] Process invite returned non-JSON response')
      }
    } catch (error: any) {
      // Ignore network errors or JSON parse errors
      if (error?.message?.includes('JSON') || error?.name === 'SyntaxError') {
        console.warn('[useAuth] Failed to parse invite response (likely HTML error page)')
      } else {
        console.error('[useAuth] Error processing invite:', error)
      }
    }
  }

  const loadProfile = async (authUser?: any) => {
    try {
      const userProfile = await getCurrentUserProfile()
      if (userProfile) {
        setProfile(userProfile)
      }

      // Load company role and permissions from Supabase RPCs
      const { data: role } = await supabase.rpc('get_current_role')
      setCompanyRole(role || null)

      // Load effective permissions from DB
      const { data: permsData, error: permsError } = await supabase.rpc('get_effective_permissions')

      // If RPC fails (function doesn't exist or error), use fallback
      if (permsError || !permsData || !Array.isArray(permsData) || permsData.length === 0) {
        // Fallback: use role-based defaults if RPCs not available or returned empty
        // Use companyRole if available, otherwise fall back to userProfile.role
        const roleToUse = role || userProfile?.role || 'viewer'
        const perms = await getEffectivePermissions(roleToUse as any)
        setPermissions(perms)
      } else {
        // Convert array to object { code: allowed }
        const permsMap: Record<string, boolean> = {}
        permsData.forEach((p: { permission_code: string; allowed: boolean }) => {
          permsMap[p.permission_code] = p.allowed
        })
        setPermissions(permsMap)
      }
    } catch (error: any) {
      // Ignore aborted requests (normal during page navigation)
      if (error?.message?.includes('aborted') || error?.name === 'AbortError') {
        return
      }
      console.error('Unexpected error loading profile:', error?.message || error)

      // Fallback to basic permissions
      setPermissions(null)
    } finally {
      setLoading(false)
    }
  }

  // Refresh permissions (call after permission changes)
  const refreshPermissions = async () => {
    if (user) {
      await loadProfile(user)
    }
  }

  return {
    user,
    profile,
    permissions,
    companyRole, // 'geschaeftsfuehrer' | 'administration' | 'buchhaltung' | 'verkaeufer' | 'monteur'
    loading,
    refreshPermissions,
    // Role checks based on company_members role (not user_profiles role)
    isOwner: companyRole === 'geschaeftsfuehrer',
    isAdmin: companyRole === 'administration' || companyRole === 'geschaeftsfuehrer',
    isManager: ['geschaeftsfuehrer', 'administration'].includes(companyRole || ''),
    isEmployee: [
      'geschaeftsfuehrer',
      'administration',
      'buchhaltung',
      'verkaeufer',
      'monteur',
    ].includes(companyRole || ''),
    // Permission check - uses effective permissions from DB
    hasPermission: (code: PermissionCode | string) => Boolean(permissions?.[code]),
    // Check if user can manage other users
    canManageUsers: () =>
      Boolean(permissions?.['manage_users']) ||
      companyRole === 'geschaeftsfuehrer' ||
      companyRole === 'administration',
  }
}
