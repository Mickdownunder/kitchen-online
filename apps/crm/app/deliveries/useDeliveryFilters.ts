/**
 * Custom hook that encapsulates all filtering, sorting, pagination,
 * and date range management for the DeliveriesClient component.
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DeliveryNote, CustomerDeliveryNote, CustomerProject } from '@/types'
import { useApp } from '../providers'

// ============================================
// Types
// ============================================

export type DeliverySortField = 'date' | 'number' | 'status'

type SortMode =
  | 'date_desc'
  | 'date_asc'
  | 'number_asc'
  | 'number_desc'
  | 'status_asc'
  | 'status_desc'

// ============================================
// Utility functions
// ============================================

export function sortNotes(
  mode: SortMode,
  dateA: string,
  dateB: string,
  numA?: string,
  numB?: string,
  statusA?: string,
  statusB?: string,
) {
  const dA = new Date(dateA).getTime()
  const dB = new Date(dateB).getTime()
  const nA = (numA || '').toLowerCase()
  const nB = (numB || '').toLowerCase()
  const sA = (statusA || '').toLowerCase()
  const sB = (statusB || '').toLowerCase()

  if (mode === 'date_desc') return dB - dA
  if (mode === 'date_asc') return dA - dB
  if (mode === 'number_asc') return nA.localeCompare(nB)
  if (mode === 'number_desc') return nB.localeCompare(nA)
  if (mode === 'status_asc') return sA.localeCompare(sB)
  return sB.localeCompare(sA)
}

export function formatGroupLabel(key: string) {
  const [y, m] = key.split('-')
  const month = Number(m)
  const monthNames = [
    'Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
  ]
  return `${monthNames[month - 1]} ${y}`
}

export const supplierStatuses = [
  { value: 'all', label: 'Alle Status' },
  { value: 'received', label: 'Erhalten' },
  { value: 'matched', label: 'Zugeordnet' },
  { value: 'processed', label: 'Verarbeitet' },
  { value: 'completed', label: 'Abgeschlossen' },
]

export const customerStatuses = [
  { value: 'all', label: 'Alle Status' },
  { value: 'draft', label: 'Entwurf' },
  { value: 'sent', label: 'Versendet' },
  { value: 'delivered', label: 'Geliefert' },
  { value: 'completed', label: 'Abgeschlossen' },
]

// ============================================
// Hook
// ============================================

export function useDeliveryFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    projects,
    supplierDeliveryNotes,
    customerDeliveryNotes,
    refreshDeliveryNotes,
    isLoadingDeliveryNotes,
    isLoading: isLoadingProjects,
  } = useApp()

  // ── Tab state ─────────────────────────────────────────────────

  const initialTab = (searchParams.get('type') as 'supplier' | 'customer' | null) || 'supplier'
  const [activeTab, setActiveTab] = useState<'supplier' | 'customer'>(initialTab)

  // ── Filter state ──────────────────────────────────────────────

  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(new Date().getMonth() + 1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  // ── Sort state ────────────────────────────────────────────────

  const [sortField, setSortField] = useState<DeliverySortField>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const handleSort = (field: DeliverySortField) => {
    if (sortField === field) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sort: SortMode =
    sortField === 'date'
      ? sortDirection === 'desc' ? 'date_desc' : 'date_asc'
      : sortField === 'number'
        ? sortDirection === 'asc' ? 'number_asc' : 'number_desc'
        : sortDirection === 'asc' ? 'status_asc' : 'status_desc'

  // ── Pagination / visibility state ─────────────────────────────

  const [showUpload, setShowUpload] = useState(false)
  const [visibleCount, setVisibleCount] = useState(120)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [expandedYears, setExpandedYears] = useState<Set<number>>(
    () => new Set([new Date().getFullYear()])
  )

  // ── Detail modals ─────────────────────────────────────────────

  const [selectedSupplierNote, setSelectedSupplierNote] = useState<DeliveryNote | null>(null)
  const [selectedCustomerNote, setSelectedCustomerNote] = useState<CustomerDeliveryNote | null>(null)

  // ── Project index ─────────────────────────────────────────────

  const projectsIndex = useMemo(() => {
    const map = new Map<string, CustomerProject>()
    projects.forEach(p => map.set(p.id, p))
    return map
  }, [projects])

  // ── URL sync ──────────────────────────────────────────────────

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('type', activeTab)
    const target = `/deliveries?${params.toString()}`
    if (typeof window !== 'undefined' && `${window.location.pathname}${window.location.search}` !== target) {
      router.replace(target)
    }
  }, [activeTab, router, searchParams])

  // Reset pagination on filter changes
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisibleCount(120)
      setCurrentPage(1)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [activeTab, selectedYear, selectedMonth, statusFilter, sortField, sortDirection, search])

  // ── Derived: available years ──────────────────────────────────

  const yearsAvailable = useMemo(() => {
    const years = new Set<number>()
    const allDates: string[] = []
    supplierDeliveryNotes.forEach((n: { deliveryDate: string }) => allDates.push(n.deliveryDate))
    customerDeliveryNotes.forEach((n: { deliveryDate: string }) => allDates.push(n.deliveryDate))
    allDates.forEach(d => { if (d) years.add(new Date(d).getFullYear()) })
    return Array.from(years).sort((a, b) => b - a)
  }, [supplierDeliveryNotes, customerDeliveryNotes])

  // ── Derived: filtered lists ───────────────────────────────────

  const filteredSupplier = useMemo(() => {
    const q = search.trim().toLowerCase()
    const hasSearch = q.length > 0
    return supplierDeliveryNotes
      .filter(n => {
        const d = new Date(n.deliveryDate)
        // Bei aktiver Suche: Jahr/Monat ignorieren – Treffer aus allen Jahren anzeigen
        if (!hasSearch) {
          if (selectedYear !== 'all' && d.getFullYear() !== selectedYear) return false
          if (selectedMonth !== 'all' && d.getMonth() + 1 !== selectedMonth) return false
        }
        if (statusFilter !== 'all' && n.status !== statusFilter) return false
        if (!q) return true
        return (
          n.supplierName?.toLowerCase().includes(q) ||
          n.supplierDeliveryNoteNumber?.toLowerCase().includes(q) ||
          (n.matchedProjectId || '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) =>
        sortNotes(sort, a.deliveryDate, b.deliveryDate, a.supplierDeliveryNoteNumber, b.supplierDeliveryNoteNumber, a.status, b.status)
      )
  }, [supplierDeliveryNotes, search, selectedYear, selectedMonth, statusFilter, sort])

  const filteredSupplierForCounts = useMemo(() => {
    const q = search.trim().toLowerCase()
    const hasSearch = q.length > 0
    return supplierDeliveryNotes.filter(n => {
      const d = new Date(n.deliveryDate)
      if (!hasSearch && selectedYear !== 'all' && d.getFullYear() !== selectedYear) return false
      if (statusFilter !== 'all' && n.status !== statusFilter) return false
      if (!q) return true
      return (
        n.supplierName?.toLowerCase().includes(q) ||
        n.supplierDeliveryNoteNumber?.toLowerCase().includes(q) ||
        (n.matchedProjectId || '').toLowerCase().includes(q)
      )
    })
  }, [supplierDeliveryNotes, search, selectedYear, statusFilter])

  const filteredCustomer = useMemo(() => {
    const q = search.trim().toLowerCase()
    const hasSearch = q.length > 0
    return customerDeliveryNotes
      .filter(n => {
        const d = new Date(n.deliveryDate)
        // Bei aktiver Suche: Jahr/Monat ignorieren – Treffer aus allen Jahren anzeigen
        if (!hasSearch) {
          if (selectedYear !== 'all' && d.getFullYear() !== selectedYear) return false
          if (selectedMonth !== 'all' && d.getMonth() + 1 !== selectedMonth) return false
        }
        if (statusFilter !== 'all' && n.status !== statusFilter) return false
        if (!q) return true
        const project = projectsIndex.get(n.projectId)
        const customerName = project?.customerName?.toLowerCase() || ''
        return (
          n.deliveryNoteNumber?.toLowerCase().includes(q) ||
          (n.projectId || '').toLowerCase().includes(q) ||
          customerName.includes(q)
        )
      })
      .sort((a, b) =>
        sortNotes(sort, a.deliveryDate, b.deliveryDate, a.deliveryNoteNumber, b.deliveryNoteNumber, a.status, b.status)
      )
  }, [customerDeliveryNotes, search, selectedYear, selectedMonth, statusFilter, sort, projectsIndex])

  const filteredCustomerForCounts = useMemo(() => {
    const q = search.trim().toLowerCase()
    const hasSearch = q.length > 0
    return customerDeliveryNotes.filter(n => {
      const d = new Date(n.deliveryDate)
      if (!hasSearch && selectedYear !== 'all' && d.getFullYear() !== selectedYear) return false
      if (statusFilter !== 'all' && n.status !== statusFilter) return false
      if (!q) return true
      const project = projectsIndex.get(n.projectId)
      const customerName = project?.customerName?.toLowerCase() || ''
      return (
        n.deliveryNoteNumber?.toLowerCase().includes(q) ||
        (n.projectId || '').toLowerCase().includes(q) ||
        customerName.includes(q)
      )
    })
  }, [customerDeliveryNotes, search, selectedYear, statusFilter, projectsIndex])

  // ── Derived: deliveries by month (for month tab counts) ───────

  const deliveriesByMonth = useMemo(() => {
    const months: Map<number, (DeliveryNote | CustomerDeliveryNote)[]> = new Map()
    for (let i = 1; i <= 12; i++) months.set(i, [])
    const list = activeTab === 'supplier' ? filteredSupplierForCounts : filteredCustomerForCounts
    if (selectedYear !== 'all') {
      list.forEach((n: DeliveryNote | CustomerDeliveryNote) => {
        const d = new Date(n.deliveryDate)
        if (d.getFullYear() === selectedYear) {
          const month = d.getMonth() + 1
          months.get(month)!.push(n)
        }
      })
    }
    return months
  }, [activeTab, filteredSupplierForCounts, filteredCustomerForCounts, selectedYear])

  // ── Derived: current month view ───────────────────────────────

  const currentMonthDeliveries = useMemo(() => {
    if (selectedYear === 'all' || selectedMonth === 'all') return []
    return activeTab === 'supplier' ? filteredSupplier : filteredCustomer
  }, [activeTab, filteredSupplier, filteredCustomer, selectedYear, selectedMonth])

  const totalPages = Math.ceil(currentMonthDeliveries.length / itemsPerPage)
  const paginatedDeliveries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return currentMonthDeliveries.slice(start, start + itemsPerPage)
  }, [currentMonthDeliveries, currentPage, itemsPerPage])

  // ── Derived: grouped (year > month) view ──────────────────────

  const grouped = useMemo(() => {
    const list = (activeTab === 'supplier' ? filteredSupplier : filteredCustomer).slice(0, visibleCount)
    const byYear = new Map<number, Map<string, (DeliveryNote | CustomerDeliveryNote)[]>>()

    list.forEach((n: DeliveryNote | CustomerDeliveryNote) => {
      const d = new Date(n.deliveryDate)
      const year = d.getFullYear()
      const monthKey = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!byYear.has(year)) byYear.set(year, new Map())
      const m = byYear.get(year)!
      if (!m.has(monthKey)) m.set(monthKey, [])
      m.get(monthKey)!.push(n)
    })

    const years = Array.from(byYear.keys()).sort((a, b) => b - a)
    return years.map(year => {
      const monthMap = byYear.get(year)!
      const months = Array.from(monthMap.entries())
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .map(([key, items]) => ({ key, items }))
      const count = months.reduce((sum, m) => sum + m.items.length, 0)
      return { year, months, count }
    })
  }, [activeTab, filteredSupplier, filteredCustomer, visibleCount])

  const totalFilteredCount = activeTab === 'supplier' ? filteredSupplier.length : filteredCustomer.length

  // ── Actions ───────────────────────────────────────────────────

  const openProject = (projectId?: string | null) => {
    if (!projectId) return
    router.push(`/projects?projectId=${projectId}`)
  }

  const loading = isLoadingProjects || isLoadingDeliveryNotes

  return {
    // Global app data
    projects,
    supplierDeliveryNotes,
    customerDeliveryNotes,
    refreshDeliveryNotes,
    projectsIndex,

    // Tab
    activeTab,
    setActiveTab,

    // Filters
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    yearsAvailable,

    // Sort
    sortField,
    sortDirection,
    handleSort,

    // Pagination
    showUpload,
    setShowUpload,
    visibleCount,
    setVisibleCount,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    totalPages,
    expandedYears,
    setExpandedYears,

    // Modals
    selectedSupplierNote,
    setSelectedSupplierNote,
    selectedCustomerNote,
    setSelectedCustomerNote,

    // Derived
    filteredSupplier,
    filteredCustomer,
    deliveriesByMonth,
    currentMonthDeliveries,
    paginatedDeliveries,
    grouped,
    totalFilteredCount,

    // Actions
    openProject,
    loading,
  }
}
