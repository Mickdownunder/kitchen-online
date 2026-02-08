/**
 * Custom hook that encapsulates all data loading, date range management,
 * UVA calculations, and export logic for AccountingView.
 */

'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { CustomerProject, Invoice, SupplierInvoice } from '@/types'
import {
  getCompanySettings,
  getInvoicesWithProject,
  getSupplierInvoicesByDateRange,
  getInputTaxForUVA,
} from '@/lib/supabase/services'
import { calculateNetFromGross, roundTo2Decimals } from '@/lib/utils/priceCalculations'
import { logger } from '@/lib/utils/logger'
import {
  exportUVAExcel,
  exportInvoicesExcel,
  exportDATEV,
  exportAccountingPDF,
} from './AccountingExports'

// ============================================
// Types (exported for use in the component)
// ============================================

export type TimeRange = 'month' | 'quarter' | 'year' | 'custom'
export type ExportType = 'uva' | 'invoices' | 'datev' | 'all'
export type AccountingTab = 'overview' | 'outgoing' | 'incoming' | 'bank'

export interface UVAEntry {
  taxRate: number
  netAmount: number
  taxAmount: number
  grossAmount: number
  invoiceCount: number
}

export interface InvoiceData {
  invoiceNumber: string
  date: string
  customerName: string
  netAmount: number
  taxRate: number
  taxAmount: number
  grossAmount: number
  isPaid: boolean
  paidDate?: string
  projectId: string
  orderNumber: string
  type: 'partial' | 'final' | 'credit'
}

export interface MissingInvoice {
  projectId: string
  orderNumber: string
  customerName: string
  kind: 'deposit' | 'final'
  date: string
  amountGross: number
}

// ============================================
// Utility
// ============================================

export function formatCurrency(value: number): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ============================================
// Hook
// ============================================

export function useAccountingData(projects: CustomerProject[]) {
  // ── Tab state ─────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<AccountingTab>('overview')

  // ── Date range state ──────────────────────────────────────────
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedQuarter, setSelectedQuarter] = useState(() => {
    const now = new Date()
    const quarter = Math.floor(now.getMonth() / 3) + 1
    return `${now.getFullYear()}-Q${quarter}`
  })
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [timeRange, setTimeRange] = useState<TimeRange>('month')
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0])

  // ── Data state ────────────────────────────────────────────────
  const [dbInvoices, setDbInvoices] = useState<Invoice[]>([])
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([])
  const [inputTaxData, setInputTaxData] = useState<
    { taxRate: number; netAmount: number; taxAmount: number }[]
  >([])
  const [isExporting, setIsExporting] = useState(false)
  const [showDetails, setShowDetails] = useState(true)

  // ── Data loading ──────────────────────────────────────────────

  const loadInvoices = useCallback(async () => {
    const result = await getInvoicesWithProject()
    if (result.ok) setDbInvoices(result.data)
  }, [])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  // ── Date range computation ────────────────────────────────────

  const getDateRange = useCallback(() => {
    if (timeRange === 'month') {
      const [year, month] = selectedMonth.split('-').map(Number)
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0, 23, 59, 59)
      return {
        startDate,
        endDate,
        label: new Date(year, month - 1).toLocaleDateString('de-DE', {
          month: 'long',
          year: 'numeric',
        }),
      }
    } else if (timeRange === 'quarter') {
      const parts = selectedQuarter.split('-Q')
      const year = Number(parts[0])
      const quarter = Number(parts[1])
      const startMonth = (quarter - 1) * 3
      const startDate = new Date(year, startMonth, 1)
      const endDate = new Date(year, startMonth + 3, 0, 23, 59, 59)
      return { startDate, endDate, label: `${quarter}. Quartal ${year}` }
    } else if (timeRange === 'custom') {
      const startDate = new Date(customStartDate)
      const endDate = new Date(customEndDate)
      endDate.setHours(23, 59, 59, 999)
      return { startDate, endDate, label: `${customStartDate} – ${customEndDate}` }
    } else {
      const startDate = new Date(selectedYear, 0, 1)
      const endDate = new Date(selectedYear, 11, 31, 23, 59, 59)
      return { startDate, endDate, label: `Jahr ${selectedYear}` }
    }
  }, [timeRange, selectedMonth, selectedQuarter, selectedYear, customStartDate, customEndDate])

  // ── Load supplier invoices ────────────────────────────────────

  const loadSupplierInvoices = useCallback(async () => {
    try {
      const { startDate, endDate } = getDateRange()
      const startStr = startDate.toISOString().split('T')[0]
      const endStr = endDate.toISOString().split('T')[0]

      const [invoices, inputTax] = await Promise.all([
        getSupplierInvoicesByDateRange(startStr, endStr),
        getInputTaxForUVA(startStr, endStr),
      ])

      setSupplierInvoices(invoices)
      setInputTaxData(inputTax)
    } catch (error) {
      logger.error('Fehler beim Laden der Eingangsrechnungen', { component: 'AccountingView' }, error as Error)
    }
  }, [getDateRange])

  useEffect(() => {
    loadSupplierInvoices()
  }, [loadSupplierInvoices])

  // ── Derived: project map ──────────────────────────────────────

  const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects])

  // ── Derived: tax rate from project ────────────────────────────

  const getProjectTaxRate = useCallback((project: CustomerProject): number => {
    if (!project.items || project.items.length === 0) return 20
    const taxRates = project.items.map(item => item.taxRate || 20)
    const counts: { [key: number]: number } = {}
    taxRates.forEach(rate => { counts[rate] = (counts[rate] || 0) + 1 })
    return parseInt(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0])
  }, [])

  // ── Derived: filtered invoices ────────────────────────────────

  const filteredInvoices = useMemo(() => {
    const { startDate, endDate } = getDateRange()
    const invoices: InvoiceData[] = []

    dbInvoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.invoiceDate)
      if (invoiceDate >= startDate && invoiceDate <= endDate) {
        const project = invoice.project || projectMap.get(invoice.projectId)
        if (!project) return

        const taxRate = invoice.taxRate || getProjectTaxRate(project as CustomerProject)
        const grossAmount = invoice.amount
        const netAmount = invoice.netAmount || calculateNetFromGross(grossAmount, taxRate)
        const taxAmount = invoice.taxAmount || grossAmount - netAmount

        invoices.push({
          invoiceNumber: invoice.invoiceNumber,
          date: invoice.invoiceDate,
          customerName: (project as CustomerProject).customerName || 'Unbekannt',
          netAmount,
          taxRate,
          taxAmount,
          grossAmount,
          isPaid: invoice.isPaid,
          paidDate: invoice.paidDate,
          projectId: invoice.projectId,
          orderNumber: (project as CustomerProject).orderNumber || '',
          type: invoice.type,
        })
      }
    })

    return invoices.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [dbInvoices, projectMap, getDateRange, getProjectTaxRate])

  // ── Derived: missing invoices ─────────────────────────────────

  const missingInvoices = useMemo(() => {
    const { startDate, endDate } = getDateRange()
    const missing: MissingInvoice[] = []
    const projectsWithInvoices = new Set(dbInvoices.map(inv => inv.projectId))

    projects.forEach(project => {
      if (projectsWithInvoices.has(project.id)) return

      if ((project.depositAmount || 0) > 0 && project.paymentSchedule) {
        const depositDate = project.orderDate || project.measurementDate
        if (depositDate) {
          const d = new Date(depositDate)
          if (d >= startDate && d <= endDate) {
            missing.push({
              projectId: project.id,
              orderNumber: project.orderNumber,
              customerName: project.customerName,
              kind: 'deposit',
              date: depositDate,
              amountGross: project.depositAmount || 0,
            })
          }
        }
      }

      const hasInvoices = dbInvoices.some(inv => inv.projectId === project.id && inv.type === 'final')
      const isFinished = Boolean(project.completionDate || project.installationDate)
      const hasRemainingAmount = (project.totalAmount || 0) > (project.depositAmount || 0)

      if (!hasInvoices && isFinished && hasRemainingAmount && project.isFinalPaid) {
        const finalDate = project.completionDate || project.installationDate || project.deliveryDate
        if (finalDate) {
          const d = new Date(finalDate)
          if (d >= startDate && d <= endDate) {
            const remaining = (project.totalAmount || 0) - (project.depositAmount || 0)
            missing.push({
              projectId: project.id,
              orderNumber: project.orderNumber,
              customerName: project.customerName,
              kind: 'final',
              date: finalDate,
              amountGross: remaining,
            })
          }
        }
      }
    })

    return missing.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [projects, dbInvoices, getDateRange])

  // ── Derived: UVA data ─────────────────────────────────────────

  const uvaData = useMemo(() => {
    const uva: { [key: number]: UVAEntry } = {}

    filteredInvoices.forEach(invoice => {
      const rate = invoice.taxRate
      if (!uva[rate]) {
        uva[rate] = { taxRate: rate, netAmount: 0, taxAmount: 0, grossAmount: 0, invoiceCount: 0 }
      }
      const entry = uva[rate]
      entry.netAmount += invoice.netAmount
      entry.taxAmount += invoice.taxAmount
      entry.grossAmount += invoice.grossAmount
      entry.invoiceCount += 1
    })

    Object.values(uva).forEach(entry => {
      entry.netAmount = roundTo2Decimals(entry.netAmount)
      entry.taxAmount = roundTo2Decimals(entry.taxAmount)
      entry.grossAmount = roundTo2Decimals(entry.grossAmount)
    })

    return Object.values(uva)
      .filter(entry => entry.invoiceCount > 0 || entry.grossAmount > 0)
      .sort((a, b) => b.taxRate - a.taxRate)
  }, [filteredInvoices])

  // ── Derived: totals ───────────────────────────────────────────

  const totals = useMemo(() => {
    const totalNet = uvaData.reduce((sum, entry) => sum + entry.netAmount, 0)
    const totalTax = uvaData.reduce((sum, entry) => sum + entry.taxAmount, 0)
    const totalGross = uvaData.reduce((sum, entry) => sum + entry.grossAmount, 0)
    const totalPaid = filteredInvoices
      .filter(inv => inv.isPaid)
      .reduce((sum, inv) => sum + inv.grossAmount, 0)
    const totalOutstanding = totalGross - totalPaid

    return {
      totalNet,
      totalTax,
      totalGross,
      totalPaid,
      totalOutstanding,
      invoiceCount: filteredInvoices.length,
      paidCount: filteredInvoices.filter(inv => inv.isPaid).length,
    }
  }, [uvaData, filteredInvoices])

  const inputTaxTotals = useMemo(() => {
    const totalNet = inputTaxData.reduce((sum, entry) => sum + entry.netAmount, 0)
    const totalTax = inputTaxData.reduce((sum, entry) => sum + entry.taxAmount, 0)
    return {
      totalNet: roundTo2Decimals(totalNet),
      totalTax: roundTo2Decimals(totalTax),
      count: supplierInvoices.length,
    }
  }, [inputTaxData, supplierInvoices])

  const zahllast = useMemo(
    () => roundTo2Decimals(totals.totalTax - inputTaxTotals.totalTax),
    [totals.totalTax, inputTaxTotals.totalTax]
  )

  // ── Derived: available months/years ───────────────────────────

  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    dbInvoices.forEach(inv => {
      if (inv.invoiceDate) {
        const date = new Date(inv.invoiceDate)
        months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
      }
    })
    if (months.size === 0) {
      projects.forEach(p => {
        const dateStr = p.orderDate || p.measurementDate || p.offerDate
        if (dateStr) {
          const date = new Date(dateStr)
          months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
        }
      })
    }
    const now = new Date()
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
    return Array.from(months).sort().reverse()
  }, [dbInvoices, projects])

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    dbInvoices.forEach(inv => {
      if (inv.invoiceDate) years.add(new Date(inv.invoiceDate).getFullYear())
    })
    if (years.size === 0) {
      projects.forEach(p => {
        const dateStr = p.orderDate || p.measurementDate || p.offerDate
        if (dateStr) years.add(new Date(dateStr).getFullYear())
      })
    }
    years.add(new Date().getFullYear())
    return Array.from(years).sort((a, b) => b - a)
  }, [dbInvoices, projects])

  // ── Export ────────────────────────────────────────────────────

  const handleExport = async (type: ExportType) => {
    setIsExporting(true)
    try {
      const compSettings = await getCompanySettings()
      const { startDate, endDate, label } = getDateRange()

      if (type === 'uva' || type === 'all') {
        await exportUVAExcel(uvaData, totals, label, compSettings, inputTaxData, inputTaxTotals)
      }
      if (type === 'invoices' || type === 'all') {
        await exportInvoicesExcel(filteredInvoices, label, compSettings, supplierInvoices)
      }
      if (type === 'datev' || type === 'all') {
        await exportDATEV(filteredInvoices, uvaData, label, compSettings, supplierInvoices)
      }
      if (type === 'all') {
        await exportAccountingPDF({
          title: `Buchhaltung ${label}`,
          period: label,
          startDate,
          endDate,
          uvaData,
          totals,
          invoices: filteredInvoices,
          companySettings: compSettings || undefined,
          inputTaxData,
          inputTaxTotals,
          supplierInvoices,
        })
      }
    } catch (error) {
      logger.error('Export error', { component: 'AccountingView' }, error as Error)
      alert('Fehler beim Export. Bitte versuchen Sie es erneut.')
    } finally {
      setIsExporting(false)
    }
  }

  const periodLabel = getDateRange().label

  return {
    // Tab
    activeTab,
    setActiveTab,

    // Date range
    timeRange,
    setTimeRange,
    selectedMonth,
    setSelectedMonth,
    selectedQuarter,
    setSelectedQuarter,
    selectedYear,
    setSelectedYear,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    periodLabel,
    availableMonths,
    availableYears,

    // Data
    filteredInvoices,
    supplierInvoices,
    missingInvoices,
    uvaData,
    totals,
    inputTaxData,
    inputTaxTotals,
    zahllast,
    showDetails,
    setShowDetails,

    // Actions
    handleExport,
    isExporting,
    loadSupplierInvoices,
  }
}
