'use client'

import { useCallback, useEffect, useState } from 'react'
import type { BankAccount, CompanySettings, Employee } from '@/types'
import {
  deleteBankAccount,
  deleteEmployee,
  getBankAccounts,
  getCompanySettings,
  getEmployees,
  saveBankAccount,
  saveCompanySettings,
  saveEmployee,
} from '@/lib/supabase/services'
import { logger } from '@/lib/utils/logger'

export function useCompanySettingsData() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [companySettings, setCompanySettings] = useState<Partial<CompanySettings>>({
    companyName: '',
    legalForm: 'GmbH',
    street: '',
    postalCode: '',
    city: '',
    country: 'Österreich',
    phone: '',
    email: '',
    uid: '',
    defaultPaymentTerms: 14,
    defaultTaxRate: 20,
    invoicePrefix: 'R-',
    offerPrefix: 'A-',
    orderPrefix: 'K-',
    deliveryNotePrefix: 'LS-',
  })

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [editingBank, setEditingBank] = useState<Partial<BankAccount> | null>(null)
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const settings = await getCompanySettings()
      if (settings) {
        setCompanySettings(settings)
        const [banks, emps] = await Promise.all([
          getBankAccounts(settings.id),
          getEmployees(settings.id),
        ])
        setBankAccounts(banks)
        setEmployees(emps)
      }
    } catch (error: unknown) {
      // Ignore aborted requests (normal during page navigation)
      const err = error as { message?: string; name?: string }
      if (err?.message?.includes('aborted') || err?.name === 'AbortError') {
        return
      }
      logger.error('Error loading settings', { component: 'useCompanySettingsData' }, error as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const saveCompany = useCallback(async () => {
    setSaving(true)
    try {
      const saved = await saveCompanySettings(companySettings)
      setCompanySettings(saved)
      return saved
    } finally {
      setSaving(false)
    }
  }, [companySettings])

  const saveBank = useCallback(async () => {
    if (!editingBank || !companySettings.id) return null
    setSaving(true)
    try {
      const saved = await saveBankAccount({ ...editingBank, companyId: companySettings.id })
      if (editingBank.id) setBankAccounts(prev => prev.map(b => (b.id === saved.id ? saved : b)))
      else setBankAccounts(prev => [...prev, saved])
      setEditingBank(null)
      return saved
    } finally {
      setSaving(false)
    }
  }, [editingBank, companySettings.id])

  const removeBank = useCallback(async (id: string) => {
    await deleteBankAccount(id)
    setBankAccounts(prev => prev.filter(b => b.id !== id))
  }, [])

  const saveEmployeeEntry = useCallback(async () => {
    if (!editingEmployee) return null

    // Ensure company exists
    let companyId = companySettings.id
    if (!companyId) {
      const saved = await saveCompanySettings({
        ...companySettings,
        companyName: companySettings.companyName || 'Mein Unternehmen',
      })
      setCompanySettings(saved)
      companyId = saved.id
    }

    setSaving(true)
    try {
      const saved = await saveEmployee({ ...editingEmployee, companyId })
      if (editingEmployee.id) setEmployees(prev => prev.map(e => (e.id === saved.id ? saved : e)))
      else setEmployees(prev => [...prev, saved])
      setEditingEmployee(null)
      return saved
    } finally {
      setSaving(false)
    }
  }, [editingEmployee, companySettings])

  const removeEmployee = useCallback(async (id: string) => {
    await deleteEmployee(id)
    setEmployees(prev => prev.filter(e => e.id !== id))
  }, [])

  return {
    loading,
    saving,
    companySettings,
    setCompanySettings,
    bankAccounts,
    editingBank,
    setEditingBank,
    employees,
    editingEmployee,
    setEditingEmployee,
    reload: load,
    saveCompany,
    saveBank,
    removeBank,
    saveEmployeeEntry,
    removeEmployee,
  }
}
