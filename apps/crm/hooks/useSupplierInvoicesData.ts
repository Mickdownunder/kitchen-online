'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { PaymentMethod, SupplierInvoice } from '@/types'
import {
  addSupplierInvoiceCustomCategory,
  deleteSupplierInvoice,
  getSupplierInvoiceCustomCategories,
  getSupplierInvoices,
  markSupplierInvoicePaid,
  markSupplierInvoiceUnpaid,
  type SupplierInvoiceCustomCategory,
} from '@/lib/supabase/services/supplierInvoices'
import { logger } from '@/lib/utils/logger'

export interface SupplierInvoiceStats {
  total: number
  totalTax: number
  totalSkonto: number
  paidAmount: number
  openAmount: number
  overdueAmount: number
  count: number
  openCount: number
  overdueCount: number
}

export interface UseSupplierInvoicesDataOptions {
  onStatsChange?: (stats: { totalTax: number; count: number }) => void
}

export interface UseSupplierInvoicesDataResult {
  invoices: SupplierInvoice[]
  loading: boolean
  searchTerm: string
  setSearchTerm: Dispatch<SetStateAction<string>>
  filterCategory: string | 'all'
  setFilterCategory: Dispatch<SetStateAction<string | 'all'>>
  filterStatus: 'all' | 'paid' | 'open' | 'overdue'
  setFilterStatus: Dispatch<SetStateAction<'all' | 'paid' | 'open' | 'overdue'>>
  customCategories: { id: string; name: string }[]
  filteredInvoices: SupplierInvoice[]
  stats: SupplierInvoiceStats
  loadInvoices: () => Promise<void>
  addCustomCategory: (name: string) => Promise<SupplierInvoiceCustomCategory>
  removeInvoice: (invoiceId: string) => Promise<void>
  markUnpaid: (invoiceId: string) => Promise<void>
  payingInvoice: SupplierInvoice | null
  setPayingInvoice: Dispatch<SetStateAction<SupplierInvoice | null>>
  paidDate: string
  setPaidDate: Dispatch<SetStateAction<string>>
  paymentMethod: PaymentMethod
  setPaymentMethod: Dispatch<SetStateAction<PaymentMethod>>
  confirmMarkPaid: () => Promise<void>
}

export function useSupplierInvoicesData(
  options: UseSupplierInvoicesDataOptions = {},
): UseSupplierInvoicesDataResult {
  const { onStatsChange } = options

  const onStatsChangeRef = useRef(onStatsChange)
  onStatsChangeRef.current = onStatsChange

  const [invoices, setInvoices] = useState<SupplierInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string | 'all'>('all')
  const [customCategories, setCustomCategories] = useState<{ id: string; name: string }[]>([])
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'open' | 'overdue'>('all')

  const [payingInvoice, setPayingInvoice] = useState<SupplierInvoice | null>(null)
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank')

  const loadCustomCategories = useCallback(async () => {
    try {
      const data = await getSupplierInvoiceCustomCategories()
      setCustomCategories(data.map((category) => ({ id: category.id, name: category.name })))
    } catch {
      setCustomCategories([])
    }
  }, [])

  const loadInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const [data] = await Promise.all([getSupplierInvoices(), loadCustomCategories()])
      setInvoices(data)

      if (onStatsChangeRef.current) {
        const totalTax = data.reduce((sum, invoice) => sum + invoice.taxAmount, 0)
        onStatsChangeRef.current({ totalTax, count: data.length })
      }
    } catch (error) {
      logger.error(
        'Fehler beim Laden der Eingangsrechnungen',
        { component: 'SupplierInvoicesView' },
        error instanceof Error ? error : new Error(String(error)),
      )
    } finally {
      setLoading(false)
    }
  }, [loadCustomCategories])

  useEffect(() => {
    void loadInvoices()
  }, [loadInvoices])

  const filteredInvoices = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]

    return invoices.filter((invoice) => {
      if (searchTerm) {
        const normalizedSearchTerm = searchTerm.toLowerCase()
        if (
          !invoice.supplierName.toLowerCase().includes(normalizedSearchTerm) &&
          !invoice.invoiceNumber.toLowerCase().includes(normalizedSearchTerm)
        ) {
          return false
        }
      }

      if (filterCategory !== 'all' && invoice.category !== filterCategory) {
        return false
      }

      if (filterStatus === 'paid' && !invoice.isPaid) {
        return false
      }

      if (filterStatus === 'open' && invoice.isPaid) {
        return false
      }

      if (filterStatus === 'overdue') {
        if (invoice.isPaid) return false
        if (!invoice.dueDate || invoice.dueDate >= today) return false
      }

      return true
    })
  }, [filterCategory, filterStatus, invoices, searchTerm])

  const stats: SupplierInvoiceStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const paid = filteredInvoices.filter((invoice) => invoice.isPaid)
    const open = filteredInvoices.filter((invoice) => !invoice.isPaid)
    const overdue = open.filter((invoice) => invoice.dueDate && invoice.dueDate < today)

    return {
      total: filteredInvoices.reduce((sum, invoice) => sum + invoice.grossAmount, 0),
      totalTax: filteredInvoices.reduce((sum, invoice) => sum + invoice.taxAmount, 0),
      totalSkonto: filteredInvoices.reduce((sum, invoice) => sum + (invoice.skontoAmount ?? 0), 0),
      paidAmount: paid.reduce((sum, invoice) => sum + invoice.grossAmount, 0),
      openAmount: open.reduce((sum, invoice) => sum + invoice.grossAmount, 0),
      overdueAmount: overdue.reduce((sum, invoice) => sum + invoice.grossAmount, 0),
      count: filteredInvoices.length,
      openCount: open.length,
      overdueCount: overdue.length,
    }
  }, [filteredInvoices])

  const addCustomCategory = useCallback(async (name: string) => {
    const category = await addSupplierInvoiceCustomCategory(name)
    await loadCustomCategories()
    return category
  }, [loadCustomCategories])

  const removeInvoice = useCallback(async (invoiceId: string) => {
    await deleteSupplierInvoice(invoiceId)
    await loadInvoices()
  }, [loadInvoices])

  const markUnpaid = useCallback(async (invoiceId: string) => {
    await markSupplierInvoiceUnpaid(invoiceId)
    await loadInvoices()
  }, [loadInvoices])

  const confirmMarkPaid = useCallback(async () => {
    if (!payingInvoice) {
      return
    }

    await markSupplierInvoicePaid(payingInvoice.id, paidDate, paymentMethod)
    await loadInvoices()
    setPayingInvoice(null)
  }, [loadInvoices, paidDate, payingInvoice, paymentMethod])

  return {
    invoices,
    loading,
    searchTerm,
    setSearchTerm,
    filterCategory,
    setFilterCategory,
    filterStatus,
    setFilterStatus,
    customCategories,
    filteredInvoices,
    stats,
    loadInvoices,
    addCustomCategory,
    removeInvoice,
    markUnpaid,
    payingInvoice,
    setPayingInvoice,
    paidDate,
    setPaidDate,
    paymentMethod,
    setPaymentMethod,
    confirmMarkPaid,
  }
}
