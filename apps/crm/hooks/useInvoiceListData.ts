'use client'

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import type { CompanySettings, CustomerProject, Invoice as DBInvoice } from '@/types'
import { getInvoicesWithProject, markInvoicePaid, markInvoiceUnpaid } from '@/lib/supabase/services'
import { getCompanySettings } from '@/lib/supabase/services/company'
import { useInvoiceFilters, type ListInvoice, toListInvoice } from '@/hooks/useInvoiceFilters'
import { useGroupedInvoices } from '@/hooks/useGroupedInvoices'
import { logger } from '@/lib/utils/logger'

export type InvoiceListSortField = 'invoiceNumber' | 'customer' | 'amount' | 'date'

interface InvoiceListStats {
  total: number
  paid: number
  outstanding: number
  depositCount: number
  finalCount: number
  creditCount: number
  totalCount: number
  invoicedRevenue: number
  depositRevenue: number
  creditAmount: number
}

interface UseInvoiceListDataOptions {
  projects: CustomerProject[]
  onProjectUpdate?: () => void
}

interface UseInvoiceListDataResult {
  sortField: InvoiceListSortField
  sortDirection: 'asc' | 'desc'
  searchTerm: string
  setSearchTerm: Dispatch<SetStateAction<string>>
  filterType: 'all' | 'deposit' | 'final' | 'credit'
  setFilterType: Dispatch<SetStateAction<'all' | 'deposit' | 'final' | 'credit'>>
  filterStatus: 'all' | 'paid' | 'sent'
  setFilterStatus: Dispatch<SetStateAction<'all' | 'paid' | 'sent'>>
  selectedYear: number | 'all'
  setSelectedYear: Dispatch<SetStateAction<number | 'all'>>
  selectedMonth: number | 'all'
  setSelectedMonth: Dispatch<SetStateAction<number | 'all'>>
  selectedInvoice: ListInvoice | null
  setSelectedInvoice: Dispatch<SetStateAction<ListInvoice | null>>
  viewMode: 'list' | 'invoice'
  setViewMode: Dispatch<SetStateAction<'list' | 'invoice'>>
  markingPaidId: string | null
  setMarkingPaidId: Dispatch<SetStateAction<string | null>>
  paidDateInput: string
  setPaidDateInput: Dispatch<SetStateAction<string>>
  saving: boolean
  visibleRows: number
  setVisibleRows: Dispatch<SetStateAction<number>>
  companySettings: CompanySettings | null
  activeTab: 'invoices' | 'reminders' | 'missing'
  setActiveTab: Dispatch<SetStateAction<'invoices' | 'reminders' | 'missing'>>
  showDuePayments: boolean
  setShowDuePayments: Dispatch<SetStateAction<boolean>>
  showOverview: boolean
  setShowOverview: Dispatch<SetStateAction<boolean>>
  dbInvoices: DBInvoice[]
  loadingInvoices: boolean
  invoices: ListInvoice[]
  filteredInvoices: ListInvoice[]
  availableYears: number[]
  sortedInvoices: ListInvoice[]
  groupedInvoices: [string, ListInvoice[]][]
  expandedGroups: Set<string>
  toggleGroup: (groupKey: string) => void
  invoicesByMonth: Map<number, ListInvoice[]>
  currentPage: number
  setCurrentPage: Dispatch<SetStateAction<number>>
  itemsPerPage: number
  totalPages: number
  paginatedInvoices: ListInvoice[]
  currentMonthInvoices: ListInvoice[]
  displayInvoices: ListInvoice[]
  stats: InvoiceListStats
  loadInvoices: (silent?: boolean) => Promise<void>
  handleMarkAsPaid: (invoice: ListInvoice) => Promise<void>
  handleUnmarkAsPaid: (invoice: ListInvoice) => Promise<void>
  handleInvoiceSort: (field: InvoiceListSortField) => void
}

export function useInvoiceListData({
  projects,
  onProjectUpdate,
}: UseInvoiceListDataOptions): UseInvoiceListDataResult {
  const [sortField, setSortField] = useState<InvoiceListSortField>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'deposit' | 'final' | 'credit'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'sent'>('all')
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(new Date().getMonth() + 1)
  const [selectedInvoice, setSelectedInvoice] = useState<ListInvoice | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'invoice'>('list')
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null)
  const [paidDateInput, setPaidDateInput] = useState<string>(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [visibleRows, setVisibleRows] = useState(200)
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [activeTab, setActiveTab] = useState<'invoices' | 'reminders' | 'missing'>('invoices')
  const [showDuePayments, setShowDuePayments] = useState(false)
  const [showOverview, setShowOverview] = useState(false)
  const [dbInvoices, setDbInvoices] = useState<DBInvoice[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(true)

  const loadInvoices = useCallback(async (silent = false): Promise<void> => {
    if (!silent) {
      setLoadingInvoices(true)
    }

    try {
      const result = await getInvoicesWithProject()
      if (result.ok) {
        setDbInvoices(result.data)
      } else {
        logger.error(
          'Fehler beim Laden der Rechnungen',
          { component: 'useInvoiceListData' },
          new Error(result.message),
        )
      }
    } finally {
      if (!silent) {
        setLoadingInvoices(false)
      }
    }
  }, [])

  useEffect(() => {
    void loadInvoices()
  }, [loadInvoices])

  useEffect(() => {
    getCompanySettings().then((settings) => setCompanySettings(settings))
  }, [])

  useEffect(() => {
    setVisibleRows(200)
  }, [searchTerm, filterType, filterStatus, selectedYear, selectedMonth])

  const invoices = useMemo(() => {
    const projectMap = new Map(projects.map((project) => [project.id, project]))

    return dbInvoices
      .map((invoice) => {
        const project = invoice.project || projectMap.get(invoice.projectId)
        if (!project) {
          return null
        }
        return toListInvoice(invoice, project as CustomerProject)
      })
      .filter((invoice): invoice is ListInvoice => invoice !== null)
      .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())
  }, [dbInvoices, projects])

  useEffect(() => {
    if (!selectedInvoice) {
      return
    }

    const updatedInvoice = invoices.find((invoice) => invoice.id === selectedInvoice.id)
    if (!updatedInvoice) {
      return
    }

    if (
      updatedInvoice.isPaid !== selectedInvoice.isPaid ||
      updatedInvoice.paidDate !== selectedInvoice.paidDate
    ) {
      setSelectedInvoice(updatedInvoice)
    }
  }, [invoices, selectedInvoice])

  const handleMarkAsPaid = useCallback(
    async (invoice: ListInvoice): Promise<void> => {
      setSaving(true)
      try {
        const result = await markInvoicePaid(invoice.id, paidDateInput)
        if (!result.ok) {
          throw new Error(result.message)
        }
        setMarkingPaidId(null)
        await loadInvoices(true)
        onProjectUpdate?.()
      } catch (error) {
        logger.error(
          'Fehler beim Markieren als bezahlt',
          { component: 'useInvoiceListData' },
          error instanceof Error ? error : new Error(String(error)),
        )
      } finally {
        setSaving(false)
      }
    },
    [loadInvoices, onProjectUpdate, paidDateInput],
  )

  const handleUnmarkAsPaid = useCallback(
    async (invoice: ListInvoice): Promise<void> => {
      setSaving(true)
      try {
        const result = await markInvoiceUnpaid(invoice.id)
        if (!result.ok) {
          throw new Error(result.message)
        }
        await loadInvoices(true)
        onProjectUpdate?.()
      } catch (error) {
        logger.error(
          'Fehler beim Zurücksetzen des Zahlungsstatus',
          { component: 'useInvoiceListData' },
          error instanceof Error ? error : new Error(String(error)),
        )
      } finally {
        setSaving(false)
      }
    },
    [loadInvoices, onProjectUpdate],
  )

  const { filteredInvoices, availableYears } = useInvoiceFilters({
    invoices,
    searchTerm,
    filterType,
    filterStatus,
    selectedYear,
    selectedMonth,
  })

  // Für Monats-Tab-Zählung: nur nach Jahr filtern (nicht nach Monat), damit alle 12 Monate die richtige Anzahl anzeigen
  const { filteredInvoices: invoicesForMonthCounts } = useInvoiceFilters({
    invoices,
    searchTerm,
    filterType,
    filterStatus,
    selectedYear,
    selectedMonth: 'all',
  })

  const handleInvoiceSort = useCallback((field: InvoiceListSortField): void => {
    setSortDirection((direction) => {
      if (sortField === field) {
        return direction === 'asc' ? 'desc' : 'asc'
      }
      return 'asc'
    })

    if (sortField !== field) {
      setSortField(field)
    }
  }, [sortField])

  const sortedInvoices = useMemo(() => {
    const sorted = [...filteredInvoices]
    sorted.sort((a, b) => {
      let comparison = 0
      if (sortField === 'invoiceNumber') {
        comparison = (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '')
      } else if (sortField === 'customer') {
        const aCustomerName = a.project?.customerName || ''
        const bCustomerName = b.project?.customerName || ''
        comparison = aCustomerName.localeCompare(bCustomerName)
      } else if (sortField === 'amount') {
        comparison = (a.amount || 0) - (b.amount || 0)
      } else {
        const aDate = new Date(a.invoiceDate || a.date || 0).getTime()
        const bDate = new Date(b.invoiceDate || b.date || 0).getTime()
        comparison = aDate - bDate
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
    return sorted
  }, [filteredInvoices, sortDirection, sortField])

  const { groupedInvoices, expandedGroups, toggleGroup } = useGroupedInvoices(sortedInvoices)

  const invoicesByMonth = useMemo(() => {
    const months = new Map<number, ListInvoice[]>()
    for (let month = 1; month <= 12; month += 1) {
      months.set(month, [])
    }

    if (selectedYear === 'all') {
      return months
    }

    invoicesForMonthCounts.forEach((invoice) => {
      const dateSource = invoice.invoiceDate || invoice.date
      const date = dateSource ? new Date(dateSource) : new Date()
      if (date.getFullYear() === selectedYear) {
        const month = date.getMonth() + 1
        months.get(month)?.push(invoice)
      }
    })

    return months
  }, [selectedYear, invoicesForMonthCounts])

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedMonth, selectedYear, searchTerm])

  const currentMonthInvoices = useMemo(() => {
    if (selectedYear === 'all' || selectedMonth === 'all') {
      return sortedInvoices
    }
    return invoicesByMonth.get(selectedMonth as number) || []
  }, [invoicesByMonth, selectedMonth, selectedYear, sortedInvoices])

  // Bei aktiver Suche: Suchtreffer aus allen Jahren anzeigen; sonst Monatsliste
  const displayInvoices = useMemo(() => {
    if (searchTerm.trim().length > 0) return sortedInvoices
    return currentMonthInvoices
  }, [searchTerm, sortedInvoices, currentMonthInvoices])

  const totalPages = Math.ceil(displayInvoices.length / itemsPerPage)

  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return displayInvoices.slice(start, start + itemsPerPage)
  }, [displayInvoices, currentPage])

  const stats = useMemo((): InvoiceListStats => {
    const total = filteredInvoices.reduce((accumulator, invoice) => accumulator + invoice.amount, 0)
    const paid = filteredInvoices
      .filter((invoice) => invoice.isPaid)
      .reduce((accumulator, invoice) => accumulator + invoice.amount, 0)
    const outstanding = total - paid
    const depositCount = filteredInvoices.filter((invoice) => invoice.type === 'partial').length
    const finalCount = filteredInvoices.filter((invoice) => invoice.type === 'final').length
    const creditCount = filteredInvoices.filter((invoice) => invoice.type === 'credit').length
    const invoicedRevenue = filteredInvoices
      .filter((invoice) => invoice.type === 'final')
      .reduce(
        (accumulator, invoice) =>
          accumulator +
          (invoice.project?.totalAmount != null && invoice.project.totalAmount > 0
            ? invoice.project.totalAmount
            : invoice.amount),
        0,
      )
    const depositRevenue = filteredInvoices
      .filter((invoice) => invoice.type === 'partial')
      .reduce((accumulator, invoice) => accumulator + invoice.amount, 0)
    const creditAmount = filteredInvoices
      .filter((invoice) => invoice.type === 'credit')
      .reduce((accumulator, invoice) => accumulator + Math.abs(invoice.amount), 0)

    return {
      total,
      paid,
      outstanding,
      depositCount,
      finalCount,
      creditCount,
      totalCount: filteredInvoices.length,
      invoicedRevenue,
      depositRevenue,
      creditAmount,
    }
  }, [filteredInvoices])

  return {
    sortField,
    sortDirection,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    selectedInvoice,
    setSelectedInvoice,
    viewMode,
    setViewMode,
    markingPaidId,
    setMarkingPaidId,
    paidDateInput,
    setPaidDateInput,
    saving,
    visibleRows,
    setVisibleRows,
    companySettings,
    activeTab,
    setActiveTab,
    showDuePayments,
    setShowDuePayments,
    showOverview,
    setShowOverview,
    dbInvoices,
    loadingInvoices,
    invoices,
    filteredInvoices,
    availableYears,
    sortedInvoices,
    groupedInvoices,
    expandedGroups,
    toggleGroup,
    invoicesByMonth,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    totalPages,
    paginatedInvoices,
    currentMonthInvoices,
    displayInvoices,
    stats,
    loadInvoices,
    handleMarkAsPaid,
    handleUnmarkAsPaid,
    handleInvoiceSort,
  }
}
