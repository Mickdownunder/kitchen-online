'use client'

import React from 'react'
import {
  AlertCircle,
  Check,
  Clock,
  Loader2,
  Mail,
  Pencil,
  Shield,
  Trash2,
  UserPlus,
  X,
  Users,
} from 'lucide-react'
import { CompanySettings } from '@/types'

export function UsersTab(props: {
  companySettings: Partial<CompanySettings>
  canManageUsers: boolean
  inviteEmail: string
  setInviteEmail: (v: string) => void
  inviteRole: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setInviteRole: (v: any) => void
  inviting: boolean
  onInvite: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pendingInvites: any[]
  onCancelInvite: (id: string) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  members: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editingMember: any | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setEditingMember: (m: any | null) => void
  saving: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdateMember: (memberId: string, role: any, isActive: boolean) => void
  onRemoveMember: (memberId: string) => void
  roleColors: Record<string, string>
  roleLabels: Record<string, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  permissions: any[]
  getPermissionState: (role: string, permCode: string) => boolean
  onToggleRolePermission: (role: string, permCode: string, next: boolean) => void
}) {
  const {
    companySettings,
    canManageUsers,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    inviting,
    onInvite,
    pendingInvites,
    onCancelInvite,
    members,
    editingMember,
    setEditingMember,
    saving,
    onUpdateMember,
    onRemoveMember,
    roleColors,
    roleLabels,
    permissions,
    getPermissionState,
    onToggleRolePermission,
  } = props

  if (!companySettings.id) {
    return (
      <div className="text-sm text-slate-500">
        Bitte zuerst Firmendaten speichern (Company-ID fehlt).
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Invite User Section */}
      {canManageUsers && (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
            <UserPlus className="h-5 w-5 text-amber-500" />
            Benutzer einladen
          </h3>
          <div className="flex flex-wrap gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="E-Mail-Adresse"
              className="min-w-[250px] flex-1 rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-500"
            >
              <option value="geschaeftsfuehrer">Geschäftsführer</option>
              <option value="administration">Administration</option>
              <option value="buchhaltung">Buchhaltung</option>
              <option value="verkaeufer">Verkäufer</option>
              <option value="monteur">Monteur</option>
            </select>
            <button
              onClick={onInvite}
              disabled={inviting || !inviteEmail}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-white transition-all hover:bg-amber-600 disabled:opacity-50"
            >
              {inviting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Einladen
            </button>
          </div>
          <p className="mt-2 text-xs text-amber-700">
            Eine Einladungs-E-Mail wird an die angegebene Adresse gesendet.
          </p>
        </div>
      )}

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
            <Clock className="h-5 w-5 text-orange-500" />
            Ausstehende Einladungen ({pendingInvites.length})
          </h3>
          <div className="grid gap-2">
            {pendingInvites.map(invite => (
              <div
                key={invite.id}
                className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 p-4"
              >
                <div>
                  <div className="font-bold text-slate-900">{invite.email}</div>
                  <div className="text-xs text-slate-500">
                    Eingeladen von {invite.invited_by_name} · Läuft ab:{' '}
                    {new Date(invite.expires_at).toLocaleDateString('de-AT')}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${roleColors[invite.role]}`}
                  >
                    {roleLabels[invite.role]}
                  </span>
                  {canManageUsers && (
                    <button
                      onClick={() => onCancelInvite(invite.id)}
                      className="rounded-lg p-2 text-red-500 transition-all hover:bg-red-100"
                      title="Einladung löschen"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
          <Users className="h-5 w-5 text-amber-500" />
          Team-Mitglieder ({members.filter((m: { is_active: boolean }) => m.is_active).length})
        </h3>

        {members.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            Noch keine Mitglieder. Führe das SQL-Script{' '}
            <code className="rounded bg-slate-200 px-1 font-mono">supabase/rbac_complete.sql</code>{' '}
            aus, um RBAC zu aktivieren.
          </div>
        ) : (
          <div className="grid gap-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {members.map((member: any) => (
              <div
                key={member.id}
                className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
                  member.is_active
                    ? 'border-slate-200 bg-white hover:border-amber-300'
                    : 'border-slate-200 bg-slate-50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 font-bold text-white">
                    {(member.full_name || member.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">
                      {member.full_name || member.email}
                      {!member.is_active && (
                        <span className="ml-2 text-xs text-red-500">(deaktiviert)</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">{member.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {editingMember?.id === member.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={editingMember.role}
                        onChange={e => setEditingMember({ ...editingMember, role: e.target.value })}
                        className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
                        disabled={member.role === 'geschaeftsfuehrer'}
                      >
                        <option value="geschaeftsfuehrer" disabled>
                          Geschäftsführer
                        </option>
                        <option value="administration">Administration</option>
                        <option value="buchhaltung">Buchhaltung</option>
                        <option value="verkaeufer">Verkäufer</option>
                        <option value="monteur">Monteur</option>
                      </select>
                      <button
                        onClick={() =>
                          onUpdateMember(member.id, editingMember.role, editingMember.is_active)
                        }
                        disabled={saving}
                        className="rounded-lg bg-emerald-100 p-2 transition-all hover:bg-emerald-200"
                      >
                        <Check className="h-4 w-4 text-emerald-700" />
                      </button>
                      <button
                        onClick={() => setEditingMember(null)}
                        className="rounded-lg bg-slate-100 p-2 transition-all hover:bg-slate-200"
                      >
                        <X className="h-4 w-4 text-slate-600" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${roleColors[member.role]}`}
                      >
                        {roleLabels[member.role]}
                      </span>
                      {canManageUsers && member.role !== 'geschaeftsfuehrer' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingMember(member)}
                            className="rounded-lg bg-blue-100 p-2 transition-all hover:bg-blue-200"
                            title="Bearbeiten"
                          >
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => onRemoveMember(member.id)}
                            className="rounded-lg bg-red-100 p-2 transition-all hover:bg-red-200"
                            title="Deaktivieren"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Permission Matrix */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
          <Shield className="h-5 w-5 text-amber-500" />
          Rechte-Matrix (pro Rolle)
        </h3>

        {permissions.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <div className="mb-1 font-black">SQL-Script erforderlich</div>
                <div>
                  Führe{' '}
                  <code className="rounded bg-amber-100 px-1 font-mono">
                    supabase/rbac_complete.sql
                  </code>{' '}
                  im Supabase SQL-Editor aus, um das Rechte-System zu aktivieren.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full overflow-hidden rounded-2xl border border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="sticky left-0 w-48 bg-slate-50 p-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                    Rolle
                  </th>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {permissions.map((p: any) => (
                    <th
                      key={p.code}
                      className="min-w-[100px] p-3 text-center text-xs font-black uppercase tracking-widest text-slate-500"
                    >
                      <div>{p.label}</div>
                      <div className="mt-0.5 text-[9px] font-normal normal-case text-slate-400">
                        {p.description}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {(
                  [
                    'geschaeftsfuehrer',
                    'administration',
                    'buchhaltung',
                    'verkaeufer',
                    'monteur',
                  ] as const
                ).map(role => (
                  <tr key={role} className="hover:bg-slate-50">
                    <td className="sticky left-0 bg-white p-3 text-sm font-black text-slate-900">
                      <span className={`rounded-lg px-2 py-1 text-xs ${roleColors[role]}`}>
                        {roleLabels[role]}
                      </span>
                    </td>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {permissions.map((perm: any) => {
                      const allowed = getPermissionState(role, perm.code)
                      return (
                        <td key={`${role}-${perm.code}`} className="p-3 text-center">
                          <label className="inline-flex cursor-pointer items-center justify-center">
                            <input
                              type="checkbox"
                              checked={allowed}
                              disabled={saving || !canManageUsers || role === 'geschaeftsfuehrer'}
                              onChange={e =>
                                onToggleRolePermission(role, perm.code, e.target.checked)
                              }
                              className="h-5 w-5 cursor-pointer rounded accent-amber-500 disabled:cursor-not-allowed"
                            />
                          </label>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!canManageUsers && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <AlertCircle className="h-3 w-3" />
            Du hast keine Berechtigung zur Rechteverwaltung.
          </div>
        )}
      </div>
    </div>
  )
}
