'use client'

import { useCallback, useEffect, useState } from 'react'
import type { BankAccount, CompanySettings, Employee, Supplier } from '@/types'
import {
  deleteBankAccount,
  deleteEmployee,
  deleteSupplier,
  getBankAccounts,
  getCompanySettings,
  getEmployees,
  getSuppliers,
  saveBankAccount,
  saveCompanySettings,
  saveEmployee,
  saveSupplier,
} from '@/lib/supabase/services'
import { logger } from '@/lib/utils/logger'

interface UseCompanySettingsDataResult {
  loading: boolean
  saving: boolean
  companySettings: Partial<CompanySettings>
  setCompanySettings: React.Dispatch<React.SetStateAction<Partial<CompanySettings>>>
  bankAccounts: BankAccount[]
  editingBank: Partial<BankAccount> | null
  setEditingBank: React.Dispatch<React.SetStateAction<Partial<BankAccount> | null>>
  employees: Employee[]
  editingEmployee: Partial<Employee> | null
  setEditingEmployee: React.Dispatch<React.SetStateAction<Partial<Employee> | null>>
  suppliers: Supplier[]
  editingSupplier: Partial<Supplier> | null
  setEditingSupplier: React.Dispatch<React.SetStateAction<Partial<Supplier> | null>>
  reload: () => Promise<void>
  saveCompany: () => Promise<CompanySettings>
  saveBank: () => Promise<BankAccount | null>
  removeBank: (id: string) => Promise<void>
  saveEmployeeEntry: () => Promise<Employee | null>
  removeEmployee: (id: string) => Promise<void>
  saveSupplierEntry: () => Promise<Supplier | null>
  removeSupplier: (id: string) => Promise<void>
}

export function useCompanySettingsData(): UseCompanySettingsDataResult {
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
    inboundEmailAb: '',
    inboundEmailInvoices: '',
    voiceCaptureEnabled: false,
    voiceAutoExecuteEnabled: false,
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [editingBank, setEditingBank] = useState<Partial<BankAccount> | null>(null)
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null)
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const settings = await getCompanySettings()
      if (settings) {
        setCompanySettings(settings)
        const [banks, emps, supps] = await Promise.all([
          getBankAccounts(settings.id),
          getEmployees(settings.id),
          getSuppliers(settings.id),
        ])
        setBankAccounts(banks)
        setEmployees(emps)
        setSuppliers(supps)
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

  const saveSupplierEntry = useCallback(async () => {
    if (!editingSupplier || !companySettings.id) return null

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
      const saved = await saveSupplier({ ...editingSupplier, companyId })
      if (editingSupplier.id) setSuppliers(prev => prev.map(s => (s.id === saved.id ? saved : s)))
      else setSuppliers(prev => [...prev, saved])
      setEditingSupplier(null)
      return saved
    } finally {
      setSaving(false)
    }
  }, [editingSupplier, companySettings])

  const removeSupplier = useCallback(async (id: string) => {
    await deleteSupplier(id)
    setSuppliers(prev => prev.filter(s => s.id !== id))
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
    suppliers,
    editingSupplier,
    setEditingSupplier,
    reload: load,
    saveCompany,
    saveBank,
    removeBank,
    saveEmployeeEntry,
    removeEmployee,
    saveSupplierEntry,
    removeSupplier,
  }
}
