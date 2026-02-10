'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import type { CustomerProject, Invoice, SupplierInvoice } from '@/types'
import {
  getCompanySettings,
  getInvoicesWithProject,
  getSupplierInvoicesByDateRange,
  getInputTaxForUVA,
} from '@/lib/supabase/services'
import { roundTo2Decimals } from '@/lib/utils/priceCalculations'
import { logger } from '@/lib/utils/logger'
import {
  exportUVAExcel,
  exportInvoicesExcel,
  exportDATEV,
  exportAccountingPDF,
} from './AccountingExports'
import { useAccountingDateRange } from './accounting/accountingDateRange'
import {
  calculateUvaData,
  calculateTotals,
  calculateInputTaxTotals,
  calculateAvailableMonths,
  calculateAvailableYears,
  createProjectMap,
  mapFilteredInvoices,
  mapMissingInvoices,
} from './accounting/accountingCalculations'
import type {
  AccountingTab,
  ExportType,
  InputTaxEntry,
} from './accounting/accounting.types'

export { formatCurrency } from './accounting/accountingCalculations'
export type {
  AccountingTab,
  ExportType,
  InvoiceData,
  MissingInvoice,
  TimeRange,
  UVAEntry,
} from './accounting/accounting.types'

export function useAccountingData(projects: CustomerProject[]) {
  const [activeTab, setActiveTab] = useState<AccountingTab>('overview')
  const [dbInvoices, setDbInvoices] = useState<Invoice[]>([])
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([])
  const [inputTaxData, setInputTaxData] = useState<InputTaxEntry[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [showDetails, setShowDetails] = useState(true)

  const {
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
    dateRange,
  } = useAccountingDateRange()

  const loadInvoices = useCallback(async () => {
    const result = await getInvoicesWithProject()
    if (result.ok) {
      setDbInvoices(result.data)
    }
  }, [])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  const loadSupplierInvoices = useCallback(async () => {
    try {
      const startDate = dateRange.startDate.toISOString().split('T')[0]
      const endDate = dateRange.endDate.toISOString().split('T')[0]

      const [invoices, inputTax] = await Promise.all([
        getSupplierInvoicesByDateRange(startDate, endDate),
        getInputTaxForUVA(startDate, endDate),
      ])

      setSupplierInvoices(invoices)
      setInputTaxData(inputTax)
    } catch (error) {
      logger.error(
        'Fehler beim Laden der Eingangsrechnungen',
        { component: 'AccountingView' },
        error as Error,
      )
    }
  }, [dateRange.endDate, dateRange.startDate])

  useEffect(() => {
    loadSupplierInvoices()
  }, [loadSupplierInvoices])

  const projectMap = useMemo(() => createProjectMap(projects), [projects])

  const filteredInvoices = useMemo(
    () => mapFilteredInvoices(dbInvoices, projectMap, dateRange),
    [dbInvoices, dateRange, projectMap],
  )

  const missingInvoices = useMemo(
    () => mapMissingInvoices(projects, dbInvoices, dateRange),
    [projects, dbInvoices, dateRange],
  )

  const uvaData = useMemo(() => calculateUvaData(filteredInvoices), [filteredInvoices])
  const totals = useMemo(() => calculateTotals(filteredInvoices, uvaData), [filteredInvoices, uvaData])
  const inputTaxTotals = useMemo(
    () => calculateInputTaxTotals(inputTaxData, supplierInvoices.length),
    [inputTaxData, supplierInvoices.length],
  )
  const zahllast = useMemo(
    () => roundTo2Decimals(totals.totalTax - inputTaxTotals.totalTax),
    [totals.totalTax, inputTaxTotals.totalTax],
  )

  const availableMonths = useMemo(
    () => calculateAvailableMonths(dbInvoices, projects),
    [dbInvoices, projects],
  )
  const availableYears = useMemo(
    () => calculateAvailableYears(dbInvoices, projects),
    [dbInvoices, projects],
  )

  const handleExport = useCallback(
    async (type: ExportType) => {
      setIsExporting(true)
      try {
        const companySettings = await getCompanySettings()
        const { startDate, endDate, label } = dateRange

        if (type === 'uva' || type === 'all') {
          await exportUVAExcel(uvaData, totals, label, companySettings, inputTaxData, inputTaxTotals)
        }

        if (type === 'invoices' || type === 'all') {
          await exportInvoicesExcel(filteredInvoices, label, companySettings, supplierInvoices)
        }

        if (type === 'datev' || type === 'all') {
          await exportDATEV(filteredInvoices, uvaData, label, companySettings, supplierInvoices)
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
            companySettings: companySettings || undefined,
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
    },
    [dateRange, filteredInvoices, inputTaxData, inputTaxTotals, supplierInvoices, totals, uvaData],
  )

  return {
    activeTab,
    setActiveTab,
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
    periodLabel: dateRange.label,
    availableMonths,
    availableYears,
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
    handleExport,
    isExporting,
    loadSupplierInvoices,
  }
}

export type AccountingDataState = ReturnType<typeof useAccountingData>
