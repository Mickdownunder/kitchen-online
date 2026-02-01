'use client'

import React, { useMemo, useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Filter, Download, Eye, EyeOff, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react'
import { CustomerProject, Invoice } from '@/types'
// PDF function is dynamically imported when needed to reduce initial bundle size
import {
  exportStatisticsToExcel,
  exportTabToExcel,
} from '@/components/statistics/exports/ExcelExporter'
import { getCompanySettings, getInvoices } from '@/lib/supabase/services'
import {
  DateFilter,
  calculateSoldRevenue,
  calculateProjectStats,
  // New invoice-based functions
  calculateInvoicedRevenueFromInvoices,
  calculateReceivedMoneyFromInvoices,
  calculateOutstandingFromInvoices,
  calculateInvoiceStatsFromInvoices,
  calculateMonthlyInvoiceDataFromInvoices,
} from '@/components/statistics/utils/revenueCalculations'
import dynamic from 'next/dynamic'
import StatisticsTabs, { StatisticsTab } from '@/components/statistics/StatisticsTabs'
import { useApp } from '@/app/providers'
import { logger } from '@/lib/utils/logger'

// ==========================================================================
// Dynamic imports for Statistics Tabs (each includes recharts ~300KB)
// Only the active tab's code is loaded, significantly reducing initial bundle
// ==========================================================================
const OverviewTab = dynamic(() => import('@/components/statistics/OverviewTab'), {
  loading: () => <TabLoadingSpinner />,
})
const ProjectsTab = dynamic(() => import('@/components/statistics/ProjectsTab'), {
  loading: () => <TabLoadingSpinner />,
})
const InvoicesTab = dynamic(() => import('@/components/statistics/InvoicesTab'), {
  loading: () => <TabLoadingSpinner />,
})
const DeliveriesTab = dynamic(() => import('@/components/statistics/DeliveriesTab'), {
  loading: () => <TabLoadingSpinner />,
})
const CustomersTab = dynamic(() => import('@/components/statistics/CustomersTab'), {
  loading: () => <TabLoadingSpinner />,
})

// Loading spinner for tab content
function TabLoadingSpinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-amber-500" />
    </div>
  )
}

interface StatisticsViewProps {
  projects: CustomerProject[]
}

type TimeRange = 'month' | 'quarter' | 'year' | 'all'

function StatisticsViewContent({ projects }: StatisticsViewProps) {
  const { supplierDeliveryNotes, customerDeliveryNotes } = useApp()
  const searchParams = useSearchParams()

  // Get initial tab from URL or default to 'overview'
  const initialTab = (searchParams.get('tab') as StatisticsTab) || 'overview'
  const [activeTab, setActiveTab] = useState<StatisticsTab>(initialTab)
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear())
  const [timeRange, setTimeRange] = useState<TimeRange>('year')
  const [compareWithPrevious, setCompareWithPrevious] = useState(true)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)

  // Load invoices from database
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(true)

  const loadInvoices = useCallback(async () => {
    try {
      setLoadingInvoices(true)
      const data = await getInvoices()
      setInvoices(data)
    } catch (error) {
      logger.error('Error loading invoices for statistics', { component: 'StatisticsView' }, error as Error)
    } finally {
      setLoadingInvoices(false)
    }
  }, [])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  // Update URL when tab changes (only activeTab, not searchParams to avoid infinite loop)
  React.useEffect(() => {
    const currentParams = new URLSearchParams(window.location.search)
    const currentTab = currentParams.get('tab')
    // Only update if tab actually changed to avoid unnecessary replaceState calls
    if (currentTab !== activeTab) {
      currentParams.set('tab', activeTab)
      window.history.replaceState({}, '', `/statistics?${currentParams.toString()}`)
    }
  }, [activeTab])

  // Build date filter
  const dateFilter: DateFilter = useMemo(() => {
    if (timeRange === 'all') {
      return { year: 'all', month: 'all', timeRange: 'all' }
    }
    if (timeRange === 'year') {
      return { year: yearFilter, month: 'all', timeRange: 'year' }
    }
    if (timeRange === 'month') {
      const now = new Date()
      return { year: now.getFullYear(), month: now.getMonth() + 1, timeRange: 'month' }
    }
    if (timeRange === 'quarter') {
      const now = new Date()
      return { year: now.getFullYear(), month: 'all', timeRange: 'quarter' }
    }
    return { year: yearFilter, month: 'all', timeRange: 'year' }
  }, [yearFilter, timeRange])

  // Previous period filter for comparison
  const previousFilter: DateFilter | undefined = useMemo(() => {
    if (!compareWithPrevious) return undefined

    if (timeRange === 'year') {
      return { year: yearFilter - 1, month: 'all', timeRange: 'year' }
    }
    if (timeRange === 'month') {
      const now = new Date()
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1)
      return { year: lastMonth.getFullYear(), month: lastMonth.getMonth() + 1, timeRange: 'month' }
    }
    if (timeRange === 'quarter') {
      const now = new Date()
      const lastQuarter = new Date(now.getFullYear(), now.getMonth() - 3)
      return { year: lastQuarter.getFullYear(), month: 'all', timeRange: 'quarter' }
    }
    return undefined
  }, [yearFilter, timeRange, compareWithPrevious])

  // Get available years from both projects and invoices
  const availableYears = useMemo(() => {
    const years = new Set<number>()

    // From projects
    projects.forEach(p => {
      const dateStr = p.orderDate || p.measurementDate || p.offerDate
      if (dateStr) {
        years.add(new Date(dateStr).getFullYear())
      }
    })

    // From invoices
    invoices.forEach(inv => {
      if (inv.invoiceDate) {
        years.add(new Date(inv.invoiceDate).getFullYear())
      }
    })

    // Always include current year
    years.add(new Date().getFullYear())

    return Array.from(years).sort((a, b) => b - a)
  }, [projects, invoices])

  // Calculate statistics for exports - using new invoice-based functions
  const exportData = useMemo(() => {
    // Sold revenue from projects (order-based)
    const soldRevenue = calculateSoldRevenue(projects, dateFilter)

    // Invoice-based calculations from invoices table
    const invoicedRevenue = calculateInvoicedRevenueFromInvoices(invoices, dateFilter)
    const receivedMoney = calculateReceivedMoneyFromInvoices(invoices, dateFilter)
    const outstanding = calculateOutstandingFromInvoices(invoices)
    const projectStats = calculateProjectStats(projects, dateFilter)
    const invoiceStats = calculateInvoiceStatsFromInvoices(invoices, dateFilter)

    // Calculate monthly project data (sold revenue by order date)
    const monthNames = [
      'Jan',
      'Feb',
      'Mär',
      'Apr',
      'Mai',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Okt',
      'Nov',
      'Dez',
    ]
    const monthlyProject: {
      [key: number]: {
        revenue: number
        net: number
        purchase: number
        margin: number
        count: number
      }
    } = {}
    for (let i = 0; i < 12; i++) {
      monthlyProject[i] = { revenue: 0, net: 0, purchase: 0, margin: 0, count: 0 }
    }

    projects.forEach(p => {
      const dateStr = p.orderDate || p.measurementDate || p.offerDate
      if (dateStr) {
        const date = new Date(dateStr)
        const month = date.getMonth()
        monthlyProject[month].revenue += p.totalAmount || 0
        monthlyProject[month].net += p.netAmount || 0
        monthlyProject[month].count += 1
        const projectPurchase = p.items.reduce((sum, item) => {
          const purchasePrice = item.purchasePricePerUnit || 0
          const quantity = item.quantity || 1
          return sum + purchasePrice * quantity
        }, 0)
        monthlyProject[month].purchase += projectPurchase
        monthlyProject[month].margin += (p.netAmount || 0) - projectPurchase
      }
    })

    const monthlyProjectData = monthNames.map((month, index) => ({
      month,
      revenue: Math.round(monthlyProject[index].revenue),
      net: Math.round(monthlyProject[index].net),
      purchase: Math.round(monthlyProject[index].purchase),
      margin: Math.round(monthlyProject[index].margin),
      marginPercent:
        monthlyProject[index].net > 0
          ? Math.round((monthlyProject[index].margin / monthlyProject[index].net) * 100)
          : 0,
      count: monthlyProject[index].count,
    }))

    // Calculate top customers
    const customerRevenue: {
      [key: string]: {
        name: string
        revenue: number
        net: number
        purchase: number
        margin: number
        projects: number
      }
    } = {}
    projects.forEach(p => {
      if (!customerRevenue[p.customerName]) {
        customerRevenue[p.customerName] = {
          name: p.customerName,
          revenue: 0,
          net: 0,
          purchase: 0,
          margin: 0,
          projects: 0,
        }
      }
      customerRevenue[p.customerName].revenue += p.totalAmount
      customerRevenue[p.customerName].net += p.netAmount
      customerRevenue[p.customerName].projects += 1
      const projectPurchase = p.items.reduce((sum, item) => {
        const purchasePrice = item.purchasePricePerUnit || 0
        const quantity = item.quantity || 1
        return sum + purchasePrice * quantity
      }, 0)
      customerRevenue[p.customerName].purchase += projectPurchase
      customerRevenue[p.customerName].margin += (p.netAmount || 0) - projectPurchase
    })

    const topCustomers = Object.values(customerRevenue)
      .map(c => ({
        ...c,
        marginPercent: c.net > 0 ? (c.margin / c.net) * 100 : 0,
        avgValue: c.projects > 0 ? c.revenue / c.projects : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15)

    // Calculate monthly invoice data from invoices table
    const year =
      dateFilter.year === 'all'
        ? new Date().getFullYear()
        : dateFilter.year || new Date().getFullYear()

    const monthlyInvoiceData = calculateMonthlyInvoiceDataFromInvoices(invoices, year)

    return {
      soldRevenue,
      invoicedRevenue,
      receivedMoney,
      outstanding,
      projectStats,
      monthlyProjectData,
      topCustomers,
      invoiceStats,
      monthlyInvoiceData,
      deliveryStats: {
        totalSupplier: supplierDeliveryNotes.length,
        totalCustomer: customerDeliveryNotes.length,
        totalDeliveries: supplierDeliveryNotes.length + customerDeliveryNotes.length,
      },
    }
  }, [projects, invoices, dateFilter, supplierDeliveryNotes, customerDeliveryNotes])

  // Export handlers
  const handleExportPDF = async (type: 'current' | 'all' | 'summary') => {
    try {
      // Dynamic import to reduce initial bundle size
      const { downloadStatisticsPDFAdvanced } = await import('@/components/statistics/exports/StatisticsPDFAdvanced')
      
      const companySettings = await getCompanySettings()
      const companyName = companySettings?.companyName || 'KüchenProfi'
      const year = timeRange === 'all' ? 'all' : yearFilter

      if (type === 'summary') {
        await downloadStatisticsPDFAdvanced({
          title: 'Statistik Zusammenfassung',
          year,
          companyName,
          soldRevenue: exportData.soldRevenue,
          invoicedRevenue: exportData.invoicedRevenue,
          receivedMoney: exportData.receivedMoney,
          outstanding: exportData.outstanding,
        })
      } else if (type === 'current') {
        const tabData: {
          title: string
          year: number | 'all'
          companyName: string
          [key: string]: unknown
        } = {
          title: `Statistik - ${activeTab}`,
          year: typeof year === 'number' ? year : 'all',
          companyName: companyName || '',
        }

        if (activeTab === 'overview' || activeTab === 'projects') {
          tabData.soldRevenue = exportData.soldRevenue
          tabData.projectStats = exportData.projectStats
          tabData.monthlyProjectData = exportData.monthlyProjectData
          tabData.topCustomers = exportData.topCustomers
        }
        if (activeTab === 'invoices') {
          tabData.invoicedRevenue = exportData.invoicedRevenue
          tabData.invoiceStats = exportData.invoiceStats
          tabData.monthlyInvoiceData = exportData.monthlyInvoiceData
        }

        await downloadStatisticsPDFAdvanced(tabData)
      } else {
        await downloadStatisticsPDFAdvanced({
          title: 'Statistik & Analysen - Gesamt',
          year,
          companyName,
          ...exportData,
        })
      }
    } catch (error) {
      logger.error('Error generating PDF', { component: 'StatisticsView' }, error as Error)
      alert('Fehler beim Erstellen der PDF. Bitte versuchen Sie es erneut.')
    }
  }

  const handleExportExcel = (type: 'current' | 'all') => {
    try {
      if (type === 'current') {
        const tabName =
          activeTab === 'overview'
            ? 'Übersicht'
            : activeTab === 'projects'
              ? 'Aufträge'
              : activeTab === 'invoices'
                ? 'Rechnungen'
                : activeTab === 'deliveries'
                  ? 'Lieferscheine'
                  : 'Kunden'
        exportTabToExcel(tabName, exportData)
      } else {
        exportStatisticsToExcel(exportData)
      }
    } catch (error) {
      logger.error('Error exporting Excel', { component: 'StatisticsView' }, error as Error)
      alert('Fehler beim Exportieren nach Excel. Bitte versuchen Sie es erneut.')
    }
  }

  // Show loading state while invoices are loading
  if (loadingInvoices) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="animate-in fade-in space-y-8 duration-700">
      {/* Header with Controls */}
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <h2 className="mb-2 text-5xl font-black tracking-tighter text-slate-900">
            Statistiken & Analysen
          </h2>
          <p className="font-medium text-slate-500">
            Professionelle Business Intelligence für Ihre Küchenmanufaktur
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={timeRange}
              onChange={e => setTimeRange(e.target.value as TimeRange)}
              className="border-none bg-transparent px-3 py-1.5 text-sm font-bold text-slate-900 outline-none"
            >
              <option value="month">Dieser Monat</option>
              <option value="quarter">Dieses Quartal</option>
              <option value="year">Dieses Jahr</option>
              <option value="all">Alle Zeit</option>
            </select>
          </div>
          {timeRange === 'year' && (
            <select
              value={yearFilter}
              onChange={e => setYearFilter(parseInt(e.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setCompareWithPrevious(!compareWithPrevious)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 transition-all ${
              compareWithPrevious
                ? 'border-amber-500 bg-amber-500 text-white'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {compareWithPrevious ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            <span className="text-sm font-bold">Vergleich</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              Export
              <ChevronDown
                className={`h-4 w-4 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-500">
                      PDF Export
                    </div>
                    <button
                      onClick={() => {
                        handleExportPDF('current')
                        setExportMenuOpen(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <FileText className="h-4 w-4" />
                      Aktueller Tab als PDF
                    </button>
                    <button
                      onClick={() => {
                        handleExportPDF('all')
                        setExportMenuOpen(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <FileText className="h-4 w-4" />
                      Alle Tabs als PDF
                    </button>
                    <button
                      onClick={() => {
                        handleExportPDF('summary')
                        setExportMenuOpen(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <FileText className="h-4 w-4" />
                      Zusammenfassung als PDF
                    </button>

                    <div className="my-2 h-px bg-slate-200" />

                    <div className="px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-500">
                      Excel Export
                    </div>
                    <button
                      onClick={() => {
                        handleExportExcel('current')
                        setExportMenuOpen(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Aktueller Tab als Excel
                    </button>
                    <button
                      onClick={() => {
                        handleExportExcel('all')
                        setExportMenuOpen(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Alle Tabs als Excel
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <StatisticsTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content - Pass invoices to tabs that need them */}
      {activeTab === 'overview' && (
        <OverviewTab
          projects={projects}
          invoices={invoices}
          filter={dateFilter}
          compareWithPrevious={compareWithPrevious}
          previousFilter={previousFilter}
        />
      )}

      {activeTab === 'projects' && <ProjectsTab projects={projects} filter={dateFilter} />}

      {activeTab === 'invoices' && <InvoicesTab invoices={invoices} filter={dateFilter} />}

      {activeTab === 'deliveries' && (
        <DeliveriesTab
          supplierDeliveryNotes={supplierDeliveryNotes}
          customerDeliveryNotes={customerDeliveryNotes}
          filter={dateFilter}
        />
      )}

      {activeTab === 'customers' && <CustomersTab projects={projects} filter={dateFilter} />}
    </div>
  )
}

const StatisticsView: React.FC<StatisticsViewProps> = props => {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        </div>
      }
    >
      <StatisticsViewContent {...props} />
    </Suspense>
  )
}

export default StatisticsView
