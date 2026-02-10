'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage } from '@/lib/utils/errorHandling'
import { logger } from '@/lib/utils/logger'

/** Role keys for company members */
export type RoleKey = 'geschaeftsfuehrer' | 'administration' | 'buchhaltung' | 'verkaeufer' | 'monteur'

/** Company member data structure */
export interface CompanyMember {
  id: string
  user_id: string
  email: string
  full_name: string | null
  role: RoleKey
  is_active: boolean
  created_at: string
}

/** Pending invite data structure */
export interface PendingInvite {
  id: string
  email: string
  role: RoleKey
  invited_by_name: string
  expires_at: string
  created_at: string
}

/** Permission definition */
export interface Permission {
  code: string
  label: string
  description: string
  category: string
  sort_order: number
}

/** Role permission mapping */
export interface RolePermission {
  id: string
  company_id: string
  role: string
  permission_code: string
  allowed: boolean
}

interface UseUserManagementResult {
  canManageUsers: boolean
  members: CompanyMember[]
  pendingInvites: PendingInvite[]
  permissions: Permission[]
  rolePermissions: RolePermission[]
  inviteEmail: string
  setInviteEmail: React.Dispatch<React.SetStateAction<string>>
  inviteRole: RoleKey
  setInviteRole: React.Dispatch<React.SetStateAction<RoleKey>>
  inviting: boolean
  saving: boolean
  loadMembersAndPermissions: () => Promise<void>
  getPermissionState: (role: string, permCode: string) => boolean
  toggleRolePermission: (role: string, permCode: string, next: boolean) => Promise<void>
  inviteUser: () => Promise<void>
  updateMember: (memberId: string, role: RoleKey, isActive: boolean) => Promise<void>
  removeMember: (memberId: string) => Promise<void>
  cancelInvite: (inviteId: string) => Promise<void>
}

export function useUserManagement(opts: { companyId?: string }): UseUserManagementResult {
  const { hasPermission, canManageUsers: authCanManageUsers, refreshPermissions } = useAuth()
  const canManageUsers = useMemo(
    () => authCanManageUsers?.() || hasPermission('manage_users'),
    [authCanManageUsers, hasPermission]
  )

  const [members, setMembers] = useState<CompanyMember[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([])

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<RoleKey>('verkaeufer')
  const [inviting, setInviting] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadMembersAndPermissions = useCallback(async () => {
    if (!opts.companyId) return
    try {
      const membersRes = await fetch('/api/users/members')
      if (membersRes.ok) {
        const data = await membersRes.json()
        setMembers(data.members || [])
        setPendingInvites(data.pendingInvites || [])
      }

      const permsRes = await fetch('/api/users/permissions')
      if (permsRes.ok) {
        const data = await permsRes.json()
        setPermissions(data.permissions || [])
        setRolePermissions(data.rolePermissions || [])
      }
    } catch (error) {
      logger.error('Error loading members/permissions', { component: 'useUserManagement' }, error as Error)
    }
  }, [opts.companyId])

  useEffect(() => {
    // Lazy-load; caller can also call manually on tab open.
    // No-op if companyId missing.
  }, [])

  const getPermissionState = useCallback(
    (role: string, permCode: string): boolean => {
      const rp = rolePermissions.find(r => r.role === role && r.permission_code === permCode)
      return rp?.allowed ?? false
    },
    [rolePermissions]
  )

  const toggleRolePermission = useCallback(
    async (role: string, permCode: string, next: boolean) => {
      if (!opts.companyId || !canManageUsers) return

      setRolePermissions(prev => {
        const existing = prev.find(r => r.role === role && r.permission_code === permCode)
        if (existing) {
          return prev.map(r =>
            r.role === role && r.permission_code === permCode ? { ...r, allowed: next } : r
          )
        }
        return [
          ...prev,
          { id: '', company_id: opts.companyId!, role, permission_code: permCode, allowed: next },
        ]
      })

      try {
        const res = await fetch('/api/users/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: opts.companyId,
            role,
            permissionCode: permCode,
            allowed: next,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Fehler')
        }
        // Reload permissions after successful save to ensure UI is in sync with database
        await loadMembersAndPermissions()
      } catch (error: unknown) {
        logger.error('Error saving permission', { component: 'useUserManagement' }, error as Error)
        alert(`Fehler beim Speichern: ${getErrorMessage(error)}`)
        setRolePermissions(prev =>
          prev.map(r =>
            r.role === role && r.permission_code === permCode ? { ...r, allowed: !next } : r
          )
        )
      }
    },
    [opts.companyId, canManageUsers, loadMembersAndPermissions]
  )

  const inviteUser = useCallback(async () => {
    if (!inviteEmail || !inviteRole) return
    setInviting(true)
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Einladen')

      alert(data.message || 'Einladung gesendet!')
      setInviteEmail('')
      setInviteRole('verkaeufer')
      await loadMembersAndPermissions()
    } catch (error: unknown) {
      alert(getErrorMessage(error))
    } finally {
      setInviting(false)
    }
  }, [inviteEmail, inviteRole, loadMembersAndPermissions])

  const updateMember = useCallback(
    async (memberId: string, role: RoleKey, isActive: boolean) => {
      try {
        setSaving(true)
        const res = await fetch('/api/users/members', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId, role, isActive }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Fehler')
        }
        await loadMembersAndPermissions()
        refreshPermissions?.()
      } catch (error: unknown) {
        alert(getErrorMessage(error))
      } finally {
        setSaving(false)
      }
    },
    [loadMembersAndPermissions, refreshPermissions]
  )

  const removeMember = useCallback(
    async (memberId: string) => {
      if (!confirm('Benutzer wirklich deaktivieren?')) return
      try {
        const res = await fetch(`/api/users/members?memberId=${memberId}`, { method: 'DELETE' })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Fehler')
        }
        await loadMembersAndPermissions()
      } catch (error: unknown) {
        alert(getErrorMessage(error))
      }
    },
    [loadMembersAndPermissions]
  )

  const cancelInvite = useCallback(
    async (inviteId: string) => {
      if (!confirm('Einladung wirklich löschen?')) return
      try {
        const res = await fetch(`/api/users/members?inviteId=${inviteId}`, { method: 'DELETE' })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Fehler')
        }
        await loadMembersAndPermissions()
      } catch (error: unknown) {
        alert(getErrorMessage(error))
      }
    },
    [loadMembersAndPermissions]
  )

  return {
    canManageUsers,
    members,
    pendingInvites,
    permissions,
    rolePermissions,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    inviting,
    saving,
    loadMembersAndPermissions,
    getPermissionState,
    toggleRolePermission,
    inviteUser,
    updateMember,
    removeMember,
    cancelInvite,
  }
}
