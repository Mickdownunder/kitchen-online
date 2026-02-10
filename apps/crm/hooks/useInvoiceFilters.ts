import { useMemo } from 'react'
import { Invoice as DBInvoice, CustomerProject } from '@/types'

export type InvoiceFilterType = 'all' | 'deposit' | 'final' | 'partial' | 'credit'
export type InvoiceFilterStatus = 'all' | 'paid' | 'sent'

/**
 * ListInvoice - erweiterte Invoice-Darstellung für die UI
 * Enthält zusätzliche Felder für Kompatibilität mit bestehenden Komponenten
 */
export interface ListInvoice extends DBInvoice {
  /** Alias für invoiceDate (Kompatibilität) */
  date: string
  /** Status für UI-Anzeige */
  status: 'draft' | 'sent' | 'paid'
  /** Vollständiges Projekt-Objekt (für Anzeige) */
  project: CustomerProject
}

interface UseInvoiceFiltersOptions {
  invoices: ListInvoice[]
  searchTerm: string
  filterType: InvoiceFilterType
  filterStatus: InvoiceFilterStatus
  selectedYear: number | 'all'
  selectedMonth: number | 'all'
}

interface UseInvoiceFiltersResult {
  filteredInvoices: ListInvoice[]
  availableYears: number[]
}

/**
 * Konvertiert eine DB-Invoice in eine ListInvoice für die UI
 */
export function toListInvoice(invoice: DBInvoice, project: CustomerProject): ListInvoice {
  return {
    ...invoice,
    date: invoice.invoiceDate,
    status: invoice.isPaid ? 'paid' : 'sent',
    project,
  }
}

export function useInvoiceFilters(opts: UseInvoiceFiltersOptions): UseInvoiceFiltersResult {
  const filteredInvoices = useMemo(() => {
    const q = opts.searchTerm.trim().toLowerCase()
    return opts.invoices.filter(inv => {
      // Search filter
      const customerName = inv.project?.customerName?.toLowerCase() || ''
      const orderNumber = inv.project?.orderNumber?.toLowerCase() || ''
      const invoiceNumber = inv.invoiceNumber?.toLowerCase() || ''

      const matchesSearch =
        customerName.includes(q) || invoiceNumber.includes(q) || orderNumber.includes(q)
      if (!matchesSearch) return false

      // Type filter (deposit = partial für Kompatibilität)
      const normalizedType = opts.filterType === 'deposit' ? 'partial' : opts.filterType
      if (normalizedType !== 'all' && inv.type !== normalizedType) return false

      // Status filter
      if (opts.filterStatus === 'paid' && !inv.isPaid) return false
      if (opts.filterStatus === 'sent' && inv.isPaid) return false

      // Year/Month filter
      const dateStr = inv.invoiceDate || inv.date
      if (dateStr) {
        const d = new Date(dateStr)
        if (opts.selectedYear !== 'all' && d.getFullYear() !== opts.selectedYear) return false
        if (opts.selectedMonth !== 'all' && d.getMonth() + 1 !== opts.selectedMonth) return false
      }

      return true
    })
  }, [
    opts.invoices,
    opts.searchTerm,
    opts.filterType,
    opts.filterStatus,
    opts.selectedYear,
    opts.selectedMonth,
  ])

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    opts.invoices.forEach(inv => {
      const dateStr = inv.invoiceDate || inv.date
      if (dateStr) {
        years.add(new Date(dateStr).getFullYear())
      }
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [opts.invoices])

  return { filteredInvoices, availableYears }
}

// Re-export für Kompatibilität
export type Invoice = ListInvoice
