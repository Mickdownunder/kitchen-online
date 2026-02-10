'use client'

import { useState, useEffect } from 'react'
import {
  Building2,
  CreditCard,
  FileText,
  Settings,
  Users,
  FileSearch,
  Scale,
  ClipboardList,
  Package,
} from 'lucide-react'
import AIAgentButton from '@/components/AIAgentButton'
import { useAuth } from '@/hooks/useAuth'
import { CompanyTab } from './components/CompanyTab'
import { BankTab } from './components/BankTab'
import { SuppliersTab } from './components/SuppliersTab'
import { EmployeesTab } from './components/EmployeesTab'
import { InvoiceTab } from './components/InvoiceTab'
import { AGBTab } from './components/AGBTab'
import { AuftragTab } from './components/AuftragTab'
import { UsersTab } from './components/UsersTab'
import AuditLogTab from './components/AuditLogTab'
import { useCompanySettingsData } from '@/hooks/useCompanySettingsData'
import { useUserManagement } from '@/hooks/useUserManagement'
import { useToast } from '@/components/providers/ToastProvider'
import { logger } from '@/lib/utils/logger'

type TabType = 'company' | 'bank' | 'suppliers' | 'employees' | 'invoice' | 'agb' | 'auftrag' | 'users' | 'audit'

type RoleKey = 'geschaeftsfuehrer' | 'administration' | 'buchhaltung' | 'verkaeufer' | 'monteur'

export default function SettingsPageClient() {
  const { hasPermission } = useAuth()
  const { success, error } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('company')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingMember, setEditingMember] = useState<any>(null) // Member type varies
  const canViewAuditLogs = hasPermission('menu_settings') // Nur User mit Settings-Zugriff können Audit-Logs sehen
  const {
    loading,
    saving,
    companySettings,
    setCompanySettings,
    bankAccounts,
    editingBank,
    setEditingBank,
    suppliers,
    editingSupplier,
    setEditingSupplier,
    employees,
    editingEmployee,
    setEditingEmployee,
    saveCompany,
    saveBank,
    removeBank,
    saveSupplierEntry,
    removeSupplier,
    saveEmployeeEntry,
    removeEmployee,
  } = useCompanySettingsData()

  // Load members and permissions when users tab is active
  const userMgmt = useUserManagement({ companyId: companySettings.id })
  useEffect(() => {
    if (activeTab === 'users' && companySettings.id) {
      userMgmt.loadMembersAndPermissions()
    }
  }, [activeTab, companySettings.id, userMgmt])
  const canManageUsers = userMgmt.canManageUsers

  const roleLabels: Record<RoleKey, string> = {
    geschaeftsfuehrer: 'Geschäftsführer',
    administration: 'Administration',
    buchhaltung: 'Buchhaltung',
    verkaeufer: 'Verkäufer',
    monteur: 'Monteur',
  }

  const roleColors: Record<RoleKey, string> = {
    geschaeftsfuehrer: 'bg-purple-100 text-purple-800',
    administration: 'bg-blue-100 text-blue-800',
    buchhaltung: 'bg-indigo-100 text-indigo-800',
    verkaeufer: 'bg-amber-100 text-amber-800',
    monteur: 'bg-green-100 text-green-800',
  }

  const handleSaveCompany = async () => {
    try {
      await saveCompany()
      success('Firmendaten erfolgreich gespeichert')
    } catch (err) {
      logger.error('Error saving company', { component: 'SettingsPageClient' }, err instanceof Error ? err : new Error(String(err)))
      error('Fehler beim Speichern der Firmendaten')
    }
  }

  const handleSaveBank = async () => {
    try {
      await saveBank()
      success('Bankverbindung erfolgreich gespeichert')
    } catch (err) {
      logger.error('Error saving bank', { component: 'SettingsPageClient' }, err instanceof Error ? err : new Error(String(err)))
      error('Fehler beim Speichern der Bankverbindung')
    }
  }

  const handleDeleteBank = async (id: string) => {
    if (!confirm('Bankverbindung wirklich löschen?')) return
    try {
      await removeBank(id)
      success('Bankverbindung erfolgreich gelöscht')
    } catch (err) {
      logger.error('Error deleting bank', { component: 'SettingsPageClient' }, err instanceof Error ? err : new Error(String(err)))
      error('Fehler beim Löschen der Bankverbindung')
    }
  }

  const handleSaveEmployee = async () => {
    try {
      await saveEmployeeEntry()
      success('Mitarbeiter erfolgreich gespeichert')
    } catch (err) {
      logger.error('Error saving employee', { component: 'SettingsPageClient' }, err instanceof Error ? err : new Error(String(err)))
      error('Fehler beim Speichern des Mitarbeiters')
    }
  }

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Mitarbeiter wirklich löschen?')) return
    try {
      await removeEmployee(id)
      success('Mitarbeiter erfolgreich gelöscht')
    } catch (err) {
      logger.error('Error deleting employee', { component: 'SettingsPageClient' }, err instanceof Error ? err : new Error(String(err)))
      error('Fehler beim Löschen des Mitarbeiters')
    }
  }

  const handleSaveSupplier = async () => {
    try {
      await saveSupplierEntry()
      success('Lieferant erfolgreich gespeichert')
    } catch (err) {
      logger.error('Error saving supplier', { component: 'SettingsPageClient' }, err instanceof Error ? err : new Error(String(err)))
      error('Fehler beim Speichern des Lieferanten')
    }
  }

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('Lieferant wirklich löschen?')) return
    try {
      await removeSupplier(id)
      success('Lieferant erfolgreich gelöscht')
    } catch (err) {
      logger.error('Error deleting supplier', { component: 'SettingsPageClient' }, err instanceof Error ? err : new Error(String(err)))
      error('Fehler beim Löschen des Lieferanten')
    }
  }

  const tabs = [
    { id: 'company' as TabType, label: 'Firmendaten', icon: Building2 },
    { id: 'bank' as TabType, label: 'Bankverbindungen', icon: CreditCard },
    { id: 'suppliers' as TabType, label: 'Lieferanten', icon: Package },
    { id: 'employees' as TabType, label: 'Mitarbeiter', icon: Users },
    { id: 'invoice' as TabType, label: 'Rechnungseinstellungen', icon: FileText },
    { id: 'agb' as TabType, label: 'AGB', icon: Scale },
    { id: 'auftrag' as TabType, label: 'Auftrag', icon: ClipboardList },
    ...(canManageUsers
      ? [{ id: 'users' as TabType, label: 'Benutzer & Rechte', icon: Settings }]
      : []),
    ...(canViewAuditLogs ? [{ id: 'audit' as TabType, label: 'Audit-Log', icon: FileSearch }] : []),
  ]

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in space-y-8 duration-700">
      {/* Header */}
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h2 className="mb-2 text-5xl font-black tracking-tighter text-slate-900">
            Firmenstammdaten
          </h2>
          <p className="font-medium text-slate-500">
            Verwalten Sie Ihre Unternehmensdaten, Bankverbindungen und Mitarbeiter
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-xl">
        {activeTab === 'company' && (
          <CompanyTab
            companySettings={companySettings}
            setCompanySettings={setCompanySettings}
            saving={saving}
            onSave={handleSaveCompany}
          />
        )}

        {activeTab === 'bank' && (
          <BankTab
            companySettings={companySettings}
            bankAccounts={bankAccounts}
            editingBank={editingBank}
            setEditingBank={setEditingBank}
            saving={saving}
            onSaveBank={handleSaveBank}
            onDeleteBank={handleDeleteBank}
          />
        )}

        {activeTab === 'suppliers' && (
          <SuppliersTab
            companySettings={companySettings}
            suppliers={suppliers}
            editingSupplier={editingSupplier}
            setEditingSupplier={setEditingSupplier}
            saving={saving}
            onSaveSupplier={handleSaveSupplier}
            onDeleteSupplier={handleDeleteSupplier}
          />
        )}

        {activeTab === 'employees' && (
          <EmployeesTab
            employees={employees}
            editingEmployee={editingEmployee}
            setEditingEmployee={setEditingEmployee}
            saving={saving}
            onSaveEmployee={handleSaveEmployee}
            onDeleteEmployee={handleDeleteEmployee}
          />
        )}

        {activeTab === 'invoice' && (
          <InvoiceTab
            companySettings={companySettings}
            setCompanySettings={setCompanySettings}
            saving={saving}
            onSave={handleSaveCompany}
          />
        )}

        {activeTab === 'agb' && (
          <AGBTab
            companySettings={companySettings}
            setCompanySettings={setCompanySettings}
            saving={saving}
            onSave={handleSaveCompany}
          />
        )}

        {activeTab === 'auftrag' && (
          <AuftragTab
            companySettings={companySettings}
            setCompanySettings={setCompanySettings}
            saving={saving}
            onSave={handleSaveCompany}
          />
        )}

        {activeTab === 'users' && (
          <UsersTab
            companySettings={companySettings}
            canManageUsers={canManageUsers}
            inviteEmail={userMgmt.inviteEmail}
            setInviteEmail={userMgmt.setInviteEmail}
            inviteRole={userMgmt.inviteRole}
            setInviteRole={userMgmt.setInviteRole}
            inviting={userMgmt.inviting}
            onInvite={userMgmt.inviteUser}
            pendingInvites={userMgmt.pendingInvites}
            onCancelInvite={userMgmt.cancelInvite}
            members={userMgmt.members}
            editingMember={editingMember}
            setEditingMember={setEditingMember}
            saving={saving || userMgmt.saving}
            onUpdateMember={async (memberId, role, isActive) => {
              await userMgmt.updateMember(memberId, role, isActive)
              setEditingMember(null)
            }}
            onRemoveMember={userMgmt.removeMember}
            roleColors={roleColors}
            roleLabels={roleLabels}
            permissions={userMgmt.permissions}
            getPermissionState={userMgmt.getPermissionState}
            onToggleRolePermission={userMgmt.toggleRolePermission}
          />
        )}

        {activeTab === 'audit' && <AuditLogTab />}
      </div>

      <AIAgentButton />
    </div>
  )
}
