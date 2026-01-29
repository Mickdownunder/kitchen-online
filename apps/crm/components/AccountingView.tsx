'use client'

import React, { useMemo, useState, useEffect, useCallback } from 'react'
import {
  FileText,
  FileSpreadsheet,
  FileCheck,
  Calendar,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Percent,
  Package,
  Users,
  Zap,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
} from 'lucide-react'
import { CustomerProject, Invoice, SupplierInvoice } from '@/types'
import {
  getCompanySettings,
  getInvoicesWithProject,
  getSupplierInvoicesByDateRange,
  getInputTaxForUVA,
} from '@/lib/supabase/services'
import { calculateNetFromGross } from '@/lib/utils/priceCalculations'
import {
  exportUVAExcel,
  exportInvoicesExcel,
  exportDATEV,
  exportAccountingPDF,
} from './AccountingExports'
import SupplierInvoicesView from './accounting/SupplierInvoicesView'
import AccountingValidation from './accounting/AccountingValidation'

interface AccountingViewProps {
  projects: CustomerProject[]
}

type TimeRange = 'month' | 'quarter' | 'year'
type ExportType = 'uva' | 'invoices' | 'datev' | 'all'

interface UVAEntry {
  taxRate: number
  netAmount: number
  taxAmount: number
  grossAmount: number
  invoiceCount: number
}

interface InvoiceData {
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
  type: 'partial' | 'final'
}

type AccountingTab = 'overview' | 'outgoing' | 'incoming'

const AccountingView: React.FC<AccountingViewProps> = ({ projects }) => {
  const [activeTab, setActiveTab] = useState<AccountingTab>('overview')
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
  const [isExporting, setIsExporting] = useState(false)
  const [showDetails, setShowDetails] = useState(true)

  // Neue State für Rechnungen aus der Datenbank
  const [dbInvoices, setDbInvoices] = useState<Invoice[]>([])
  const [_loadingInvoices, setLoadingInvoices] = useState(true)

  // Eingangsrechnungen (Vorsteuer)
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([])
  const [inputTaxData, setInputTaxData] = useState<
    { taxRate: number; netAmount: number; taxAmount: number }[]
  >([])

  // Lade alle Rechnungen aus der neuen invoices-Tabelle
  const loadInvoices = useCallback(async () => {
    setLoadingInvoices(true)
    try {
      const invoices = await getInvoicesWithProject()
      setDbInvoices(invoices)
    } catch (error) {
      console.error('Fehler beim Laden der Rechnungen:', error)
    } finally {
      setLoadingInvoices(false)
    }
  }, [])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  const formatCurrency = (value: number) => {
    return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Get date range based on selection
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
      const [year, quarter] = selectedQuarter
        .split('-Q')
        .map((v, i) => (i === 0 ? Number(v) : Number(v)))
      const startMonth = (quarter - 1) * 3
      const startDate = new Date(year, startMonth, 1)
      const endDate = new Date(year, startMonth + 3, 0, 23, 59, 59)
      return { startDate, endDate, label: `${quarter}. Quartal ${year}` }
    } else {
      const startDate = new Date(selectedYear, 0, 1)
      const endDate = new Date(selectedYear, 11, 31, 23, 59, 59)
      return { startDate, endDate, label: `Jahr ${selectedYear}` }
    }
  }, [timeRange, selectedMonth, selectedQuarter, selectedYear])

  // Lade Eingangsrechnungen für den ausgewählten Zeitraum
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
      console.error('Fehler beim Laden der Eingangsrechnungen:', error)
    }
  }, [getDateRange])

  useEffect(() => {
    loadSupplierInvoices()
  }, [loadSupplierInvoices])

  // Projektdaten als Map für schnellen Zugriff
  const projectMap = useMemo(() => {
    return new Map(projects.map(p => [p.id, p]))
  }, [projects])

  // Helper: Steuersatz aus Projekt ermitteln
  const getProjectTaxRate = useCallback((project: CustomerProject): number => {
    if (!project.items || project.items.length === 0) return 20
    const taxRates = project.items.map(item => item.taxRate || 20)
    const counts: { [key: number]: number } = {}
    taxRates.forEach(rate => {
      counts[rate] = (counts[rate] || 0) + 1
    })
    return parseInt(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0])
  }, [])

  // Filter invoices by date range - NEUE IMPLEMENTIERUNG mit invoices-Tabelle
  const filteredInvoices = useMemo(() => {
    const { startDate, endDate } = getDateRange()
    const invoices: InvoiceData[] = []

    dbInvoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.invoiceDate)
      if (invoiceDate >= startDate && invoiceDate <= endDate) {
        // Projekt-Daten holen
        const project = invoice.project || projectMap.get(invoice.projectId)
        if (!project) return

        // Steuersatz aus Invoice oder Projekt
        const taxRate = invoice.taxRate || getProjectTaxRate(project as CustomerProject)

        // Beträge: Verwende gespeicherte Werte oder berechne
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

  // "Fehlende Rechnungen" Warnung - nur noch für Projekte OHNE jegliche Rechnungen
  // Hinweis: Da wir jetzt die invoices-Tabelle verwenden, prüfen wir ob Projekte
  // mit Zahlungsplan aber ohne erfasste Rechnungen existieren
  const missingInvoices = useMemo(() => {
    const { startDate, endDate } = getDateRange()
    type Missing = {
      projectId: string
      orderNumber: string
      customerName: string
      kind: 'deposit' | 'final'
      date: string
      amountGross: number
    }
    const missing: Missing[] = []

    // Erstelle Set von Projekt-IDs die Rechnungen haben
    const projectsWithInvoices = new Set(dbInvoices.map(inv => inv.projectId))

    projects.forEach(project => {
      // Projekt hat bereits Rechnungen in der DB? Dann überspringen
      if (projectsWithInvoices.has(project.id)) return

      // Prüfe ob das Projekt eine Anzahlung haben sollte
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

      // Prüfe ob Projekt fertig ist aber keine Schlussrechnung hat
      const hasInvoices = dbInvoices.some(
        inv => inv.projectId === project.id && inv.type === 'final'
      )
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

  // Calculate UVA (Umsatzsteuervoranmeldung) - Use actual invoice data
  const uvaData = useMemo(() => {
    const uva: { [key: number]: UVAEntry } = {
      20: { taxRate: 20, netAmount: 0, taxAmount: 0, grossAmount: 0, invoiceCount: 0 },
      13: { taxRate: 13, netAmount: 0, taxAmount: 0, grossAmount: 0, invoiceCount: 0 },
      10: { taxRate: 10, netAmount: 0, taxAmount: 0, grossAmount: 0, invoiceCount: 0 },
      0: { taxRate: 0, netAmount: 0, taxAmount: 0, grossAmount: 0, invoiceCount: 0 },
    }

    // Calculate from filtered invoices (more accurate)
    filteredInvoices.forEach(invoice => {
      const entry = uva[invoice.taxRate] || uva[20]
      entry.netAmount += invoice.netAmount
      entry.taxAmount += invoice.taxAmount
      entry.grossAmount += invoice.grossAmount
      entry.invoiceCount += 1
    })

    // Round to 2 decimal places
    Object.values(uva).forEach(entry => {
      entry.netAmount = Math.round(entry.netAmount * 100) / 100
      entry.taxAmount = Math.round(entry.taxAmount * 100) / 100
      entry.grossAmount = Math.round(entry.grossAmount * 100) / 100
    })

    return Object.values(uva).filter(entry => entry.invoiceCount > 0 || entry.grossAmount > 0)
  }, [filteredInvoices])

  // Calculate totals (Ausgangsrechnungen)
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

  // Calculate Vorsteuer (Eingangsrechnungen)
  const inputTaxTotals = useMemo(() => {
    const totalNet = inputTaxData.reduce((sum, entry) => sum + entry.netAmount, 0)
    const totalTax = inputTaxData.reduce((sum, entry) => sum + entry.taxAmount, 0)
    return {
      totalNet: Math.round(totalNet * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      count: supplierInvoices.length,
    }
  }, [inputTaxData, supplierInvoices])

  // UVA Zahllast (Umsatzsteuer - Vorsteuer)
  const zahllast = useMemo(() => {
    const result = totals.totalTax - inputTaxTotals.totalTax
    return Math.round(result * 100) / 100
  }, [totals.totalTax, inputTaxTotals.totalTax])

  // Handle exports
  const handleExport = async (type: ExportType) => {
    setIsExporting(true)
    try {
      const companySettings = await getCompanySettings()
      const { startDate, endDate, label } = getDateRange()

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
      console.error('Export error:', error)
      alert('Fehler beim Export. Bitte versuchen Sie es erneut.')
    } finally {
      setIsExporting(false)
    }
  }

  // Get available months/years - basierend auf Rechnungsdaten
  const availableMonths = useMemo(() => {
    const months = new Set<string>()

    // Monate aus Rechnungen
    dbInvoices.forEach(inv => {
      if (inv.invoiceDate) {
        const date = new Date(inv.invoiceDate)
        months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
      }
    })

    // Fallback: Monate aus Projekten (falls noch keine Rechnungen)
    if (months.size === 0) {
      projects.forEach(p => {
        const dateStr = p.orderDate || p.measurementDate || p.offerDate
        if (dateStr) {
          const date = new Date(dateStr)
          months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
        }
      })
    }

    // Aktuellen Monat immer hinzufügen
    const now = new Date()
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

    return Array.from(months).sort().reverse()
  }, [dbInvoices, projects])

  const availableYears = useMemo(() => {
    const years = new Set<number>()

    // Jahre aus Rechnungen
    dbInvoices.forEach(inv => {
      if (inv.invoiceDate) {
        years.add(new Date(inv.invoiceDate).getFullYear())
      }
    })

    // Fallback: Jahre aus Projekten
    if (years.size === 0) {
      projects.forEach(p => {
        const dateStr = p.orderDate || p.measurementDate || p.offerDate
        if (dateStr) {
          years.add(new Date(dateStr).getFullYear())
        }
      })
    }

    // Aktuelles Jahr immer hinzufügen
    years.add(new Date().getFullYear())

    return Array.from(years).sort((a, b) => b - a)
  }, [projects])

  const { label: periodLabel } = getDateRange()

  return (
    <div className="animate-in fade-in space-y-8 duration-700">
      {/* Header */}
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <h2 className="mb-2 text-5xl font-black tracking-tighter text-slate-900">
            Buchhaltung vorbereiten
          </h2>
          <p className="font-medium text-slate-500">
            Perfekte Vorbereitung für Ihren Steuerberater
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 rounded-xl px-6 py-3 font-bold transition-all ${
            activeTab === 'overview'
              ? 'bg-amber-500 text-white shadow-lg'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calculator className="h-5 w-5" />
          UVA-Übersicht
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`flex items-center gap-2 rounded-xl px-6 py-3 font-bold transition-all ${
            activeTab === 'outgoing'
              ? 'bg-amber-500 text-white shadow-lg'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ArrowUpRight className="h-5 w-5" />
          Ausgangsrechnungen
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
            {filteredInvoices.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('incoming')}
          className={`flex items-center gap-2 rounded-xl px-6 py-3 font-bold transition-all ${
            activeTab === 'incoming'
              ? 'bg-amber-500 text-white shadow-lg'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ArrowDownLeft className="h-5 w-5" />
          Eingangsrechnungen
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
            {supplierInvoices.length}
          </span>
        </button>
      </div>

      {/* Zeitraum-Auswahl - Prominent */}
      <div className="glass rounded-3xl border border-white/50 bg-gradient-to-br from-white to-amber-50/30 p-6 shadow-xl">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h3 className="mb-2 text-xl font-black text-slate-900">Zeitraum auswählen</h3>
            <p className="text-sm text-slate-600">
              Wählen Sie den Zeitraum für die Buchhaltungsvorbereitung
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {/* Zeitraum-Typ */}
            <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-3">
              <Calendar className="h-5 w-5 text-amber-500" />
              <select
                value={timeRange}
                onChange={e => setTimeRange(e.target.value as TimeRange)}
                className="cursor-pointer border-none bg-transparent px-4 py-2 text-base font-black text-slate-900 outline-none"
              >
                <option value="month">Monat</option>
                <option value="quarter">Quartal</option>
                <option value="year">Jahr</option>
              </select>
            </div>

            {/* Monat-Auswahl */}
            {timeRange === 'month' && (
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="cursor-pointer rounded-2xl border-2 border-amber-500 bg-white px-6 py-3 text-base font-black text-slate-900 shadow-lg outline-none focus:ring-2 focus:ring-amber-500"
              >
                {availableMonths.map(month => {
                  const [year, monthNum] = month.split('-')
                  const date = new Date(Number(year), Number(monthNum) - 1)
                  return (
                    <option key={month} value={month}>
                      {date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                    </option>
                  )
                })}
              </select>
            )}

            {/* Quartal-Auswahl */}
            {timeRange === 'quarter' && (
              <select
                value={selectedQuarter}
                onChange={e => setSelectedQuarter(e.target.value)}
                className="cursor-pointer rounded-2xl border-2 border-amber-500 bg-white px-6 py-3 text-base font-black text-slate-900 shadow-lg outline-none focus:ring-2 focus:ring-amber-500"
              >
                {availableYears
                  .flatMap(year =>
                    [1, 2, 3, 4].map(quarter => ({
                      value: `${year}-Q${quarter}`,
                      label: `${quarter}. Quartal ${year}`,
                    }))
                  )
                  .map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
            )}

            {/* Jahr-Auswahl */}
            {timeRange === 'year' && (
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="cursor-pointer rounded-2xl border-2 border-amber-500 bg-white px-6 py-3 text-base font-black text-slate-900 shadow-lg outline-none focus:ring-2 focus:ring-amber-500"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            )}

            {/* Aktueller Zeitraum Anzeige */}
            <div className="rounded-2xl bg-amber-500 px-6 py-3 text-base font-black text-white">
              {periodLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Tab: Eingangsrechnungen */}
      {activeTab === 'incoming' && (
        <SupplierInvoicesView onStatsChange={() => loadSupplierInvoices()} />
      )}

      {/* Tab: Overview (UVA) */}
      {activeTab === 'overview' && (
        <>
          {/* UVA Zusammenfassung - KOMPLETT */}
          <div className="glass rounded-3xl border border-white/50 bg-gradient-to-br from-white to-slate-50/50 p-8 shadow-xl">
            <h3 className="mb-6 text-2xl font-black text-slate-900">
              Umsatzsteuervoranmeldung (UVA) - {periodLabel}
            </h3>

            {/* UVA Hauptberechnung */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Umsatzsteuer (Ausgangsrechnungen) */}
              <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl bg-blue-500 p-3">
                    <ArrowUpRight className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                      Umsatzsteuer
                    </p>
                    <p className="text-sm text-blue-600">Ausgangsrechnungen</p>
                  </div>
                </div>
                <p className="mb-2 text-3xl font-black text-blue-700">
                  {formatCurrency(totals.totalTax)} €
                </p>
                <p className="text-sm text-blue-600">
                  aus {totals.invoiceCount} Rechnung{totals.invoiceCount !== 1 ? 'en' : ''}
                </p>
                <p className="text-xs text-blue-500">Netto: {formatCurrency(totals.totalNet)} €</p>
              </div>

              {/* Vorsteuer (Eingangsrechnungen) */}
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-500 p-3">
                    <ArrowDownLeft className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                      Vorsteuer
                    </p>
                    <p className="text-sm text-emerald-600">Eingangsrechnungen</p>
                  </div>
                </div>
                <p className="mb-2 text-3xl font-black text-emerald-700">
                  −{formatCurrency(inputTaxTotals.totalTax)} €
                </p>
                <p className="text-sm text-emerald-600">
                  aus {inputTaxTotals.count} Rechnung{inputTaxTotals.count !== 1 ? 'en' : ''}
                </p>
                <p className="text-xs text-emerald-500">
                  Netto: {formatCurrency(inputTaxTotals.totalNet)} €
                </p>
              </div>

              {/* Zahllast */}
              <div
                className={`rounded-2xl border-2 p-6 ${
                  zahllast >= 0 ? 'border-amber-300 bg-amber-50' : 'border-purple-300 bg-purple-50'
                }`}
              >
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className={`rounded-xl p-3 ${zahllast >= 0 ? 'bg-amber-500' : 'bg-purple-500'}`}
                  >
                    <Calculator className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p
                      className={`text-xs font-bold uppercase tracking-wider ${
                        zahllast >= 0 ? 'text-amber-600' : 'text-purple-600'
                      }`}
                    >
                      {zahllast >= 0 ? 'Zahllast' : 'Vorsteuerüberhang'}
                    </p>
                    <p
                      className={`text-sm ${zahllast >= 0 ? 'text-amber-600' : 'text-purple-600'}`}
                    >
                      {zahllast >= 0 ? 'An Finanzamt' : 'Vom Finanzamt'}
                    </p>
                  </div>
                </div>
                <p
                  className={`mb-2 text-4xl font-black ${
                    zahllast >= 0 ? 'text-amber-700' : 'text-purple-700'
                  }`}
                >
                  {zahllast >= 0 ? '' : '−'}
                  {formatCurrency(Math.abs(zahllast))} €
                </p>
                <p className={`text-sm ${zahllast >= 0 ? 'text-amber-600' : 'text-purple-600'}`}>
                  = Umsatzsteuer − Vorsteuer
                </p>
              </div>
            </div>

            {/* UVA Details nach Steuersatz */}
            {showDetails && (
              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                {/* Umsatzsteuer nach Steuersätzen */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h4 className="mb-4 font-bold text-slate-900">Umsatzsteuer nach Steuersätzen</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="py-2 text-left font-bold text-slate-500">Satz</th>
                        <th className="py-2 text-right font-bold text-slate-500">Netto</th>
                        <th className="py-2 text-right font-bold text-slate-500">USt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uvaData.map((entry, idx) => (
                        <tr key={idx} className="border-b border-slate-50">
                          <td className="py-2 font-bold text-slate-700">{entry.taxRate}%</td>
                          <td className="py-2 text-right text-slate-600">
                            {formatCurrency(entry.netAmount)} €
                          </td>
                          <td className="py-2 text-right font-bold text-blue-600">
                            {formatCurrency(entry.taxAmount)} €
                          </td>
                        </tr>
                      ))}
                      <tr className="font-bold">
                        <td className="py-2">Summe</td>
                        <td className="py-2 text-right">{formatCurrency(totals.totalNet)} €</td>
                        <td className="py-2 text-right text-blue-700">
                          {formatCurrency(totals.totalTax)} €
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Vorsteuer nach Steuersätzen */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h4 className="mb-4 font-bold text-slate-900">Vorsteuer nach Steuersätzen</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="py-2 text-left font-bold text-slate-500">Satz</th>
                        <th className="py-2 text-right font-bold text-slate-500">Netto</th>
                        <th className="py-2 text-right font-bold text-slate-500">VSt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inputTaxData.length > 0 ? (
                        inputTaxData.map((entry, idx) => (
                          <tr key={idx} className="border-b border-slate-50">
                            <td className="py-2 font-bold text-slate-700">{entry.taxRate}%</td>
                            <td className="py-2 text-right text-slate-600">
                              {formatCurrency(entry.netAmount)} €
                            </td>
                            <td className="py-2 text-right font-bold text-emerald-600">
                              {formatCurrency(entry.taxAmount)} €
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-slate-400">
                            Keine Eingangsrechnungen im Zeitraum
                          </td>
                        </tr>
                      )}
                      {inputTaxData.length > 0 && (
                        <tr className="font-bold">
                          <td className="py-2">Summe</td>
                          <td className="py-2 text-right">
                            {formatCurrency(inputTaxTotals.totalNet)} €
                          </td>
                          <td className="py-2 text-right text-emerald-700">
                            {formatCurrency(inputTaxTotals.totalTax)} €
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Toggle Details */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-700"
            >
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showDetails ? 'Details ausblenden' : 'Details anzeigen'}
            </button>
          </div>

          {/* Quick Export Actions */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <button
              onClick={() => handleExport('uva')}
              disabled={isExporting}
              className="glass group rounded-2xl border border-white/50 bg-gradient-to-br from-white to-blue-50/30 p-6 shadow-lg transition-all hover:shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-blue-100 p-3">
                  <FileSpreadsheet className="h-6 w-6 text-blue-600" />
                </div>
                {isExporting && <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />}
              </div>
              <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">
                UVA Export
              </p>
              <p className="text-lg font-black text-slate-900">Excel</p>
            </button>

            <button
              onClick={() => handleExport('invoices')}
              disabled={isExporting}
              className="glass group rounded-2xl border border-white/50 bg-gradient-to-br from-white to-emerald-50/30 p-6 shadow-lg transition-all hover:shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-emerald-100 p-3">
                  <FileText className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">
                Rechnungen
              </p>
              <p className="text-lg font-black text-slate-900">Excel</p>
            </button>

            <button
              onClick={() => handleExport('datev')}
              disabled={isExporting}
              className="glass group rounded-2xl border border-white/50 bg-gradient-to-br from-white to-purple-50/30 p-6 shadow-lg transition-all hover:shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-purple-100 p-3">
                  <FileCheck className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">
                DATEV
              </p>
              <p className="text-lg font-black text-slate-900">CSV</p>
            </button>

            <button
              onClick={() => handleExport('all')}
              disabled={isExporting}
              className="glass group rounded-2xl border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100/30 p-6 shadow-lg transition-all hover:shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-amber-500 p-3">
                  <Zap className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="mb-1 text-xs font-black uppercase tracking-widest text-amber-700">
                Komplett-Paket
              </p>
              <p className="text-lg font-black text-slate-900">Alle Exporte</p>
            </button>
          </div>

          {/* Plausibilitätsprüfung */}
          <AccountingValidation
            outgoingInvoices={filteredInvoices}
            supplierInvoices={supplierInvoices}
            totalOutputTax={totals.totalTax}
            totalInputTax={inputTaxTotals.totalTax}
            period={periodLabel}
          />
        </>
      )}

      {/* Tab: Ausgangsrechnungen */}
      {activeTab === 'outgoing' && (
        <>
          {/* Data integrity warnings (no fake invoices) */}
          {missingInvoices.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-amber-600" />
                <div className="flex-1">
                  <div className="font-black text-slate-900">
                    Hinweis: Fehlende Rechnungen im Zeitraum
                  </div>
                  <div className="mt-1 text-sm text-slate-700">
                    Diese Projekte haben Anzahlung/Schlussbetrag, aber es wurde keine Rechnung als
                    Datensatz erfasst. Sie werden <span className="font-bold">nicht</span> in
                    Exporte übernommen.
                  </div>
                  <div className="mt-4 grid gap-2">
                    {missingInvoices.slice(0, 8).map(m => (
                      <div
                        key={`${m.projectId}-${m.kind}-${m.date}`}
                        className="flex items-center justify-between rounded-xl border border-amber-100 bg-white/70 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-bold text-slate-900">
                            {m.customerName} <span className="font-normal text-slate-400">·</span>{' '}
                            {m.orderNumber}
                          </div>
                          <div className="text-xs text-slate-600">
                            {m.kind === 'deposit' ? 'Anzahlung' : 'Schlussrechnung'} · Datum:{' '}
                            {new Date(m.date).toLocaleDateString('de-DE')}
                          </div>
                        </div>
                        <div className="font-black tabular-nums text-slate-900">
                          {formatCurrency(m.amountGross)} €
                        </div>
                      </div>
                    ))}
                    {missingInvoices.length > 8 && (
                      <div className="text-xs text-amber-800">
                        +{missingInvoices.length - 8} weitere …
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <button
              onClick={() => handleExport('uva')}
              disabled={isExporting}
              className="glass group rounded-2xl border border-white/50 bg-gradient-to-br from-white to-blue-50/30 p-6 shadow-lg transition-all hover:shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-blue-100 p-3">
                  <FileSpreadsheet className="h-6 w-6 text-blue-600" />
                </div>
                {isExporting && <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />}
              </div>
              <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">
                Umsatzsteuervoranmeldung
              </p>
              <p className="text-lg font-black text-slate-900">Excel Export</p>
              <p className="mt-1 text-xs text-slate-500">Nur für {periodLabel}</p>
            </button>

            <button
              onClick={() => handleExport('invoices')}
              disabled={isExporting}
              className="glass group rounded-2xl border border-white/50 bg-gradient-to-br from-white to-emerald-50/30 p-6 shadow-lg transition-all hover:shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-emerald-100 p-3">
                  <FileText className="h-6 w-6 text-emerald-600" />
                </div>
                {isExporting && <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />}
              </div>
              <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">
                Alle Rechnungen
              </p>
              <p className="text-lg font-black text-slate-900">Excel Export</p>
              <p className="mt-1 text-xs text-slate-500">Nur für {periodLabel}</p>
            </button>

            <button
              onClick={() => handleExport('datev')}
              disabled={isExporting}
              className="glass group rounded-2xl border border-white/50 bg-gradient-to-br from-white to-purple-50/30 p-6 shadow-lg transition-all hover:shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-purple-100 p-3">
                  <FileCheck className="h-6 w-6 text-purple-600" />
                </div>
                {isExporting && <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />}
              </div>
              <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">
                DATEV Export
              </p>
              <p className="text-lg font-black text-slate-900">CSV Format</p>
              <p className="mt-1 text-xs text-slate-500">Nur für {periodLabel}</p>
            </button>

            <button
              onClick={() => handleExport('all')}
              disabled={isExporting}
              className="glass group rounded-2xl border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100/30 p-6 shadow-lg transition-all hover:shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-amber-500 p-3">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                {isExporting && <RefreshCw className="h-5 w-5 animate-spin text-amber-600" />}
              </div>
              <p className="mb-1 text-xs font-black uppercase tracking-widest text-amber-700">
                Alles vorbereiten
              </p>
              <p className="text-lg font-black text-slate-900">Komplett-Paket</p>
              <p className="mt-1 text-xs text-amber-600">PDF + Excel + DATEV für {periodLabel}</p>
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-lg">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-3">
                  <DollarSign className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Gesamtumsatz
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {formatCurrency(totals.totalGross)} €
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500">Netto: {formatCurrency(totals.totalNet)} €</p>
            </div>

            <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-lg">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-3">
                  <Percent className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Umsatzsteuer
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {formatCurrency(totals.totalTax)} €
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500">Aus allen Steuersätzen</p>
            </div>

            <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-lg">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-3">
                  <Package className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Rechnungen
                  </p>
                  <p className="text-2xl font-black text-slate-900">{totals.invoiceCount}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                {totals.paidCount} bezahlt, {totals.invoiceCount - totals.paidCount} offen
              </p>
            </div>

            <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-lg">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-3">
                  <Users className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Eingegangen
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {formatCurrency(totals.totalPaid)} €
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Ausstehend: {formatCurrency(totals.totalOutstanding)} €
              </p>
            </div>
          </div>

          {/* UVA Breakdown */}
          <div className="glass rounded-3xl border border-white/50 bg-gradient-to-br from-white to-slate-50/50 p-8 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-2xl font-black text-transparent">
                  Umsatzsteuervoranmeldung (UVA)
                </h3>
                <p className="mt-1 text-sm text-slate-500">Aufgeteilt nach Steuersätzen</p>
              </div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="rounded-lg p-2 transition-all hover:bg-slate-100"
              >
                {showDetails ? (
                  <EyeOff className="h-5 w-5 text-slate-400" />
                ) : (
                  <Eye className="h-5 w-5 text-slate-400" />
                )}
              </button>
            </div>
            {showDetails && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                        Steuersatz
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">
                        Netto-Umsatz
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">
                        Umsatzsteuer
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">
                        Brutto-Umsatz
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">
                        Anzahl
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {uvaData.map((entry, index) => (
                      <tr key={index} className="transition-colors hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-black text-slate-900">
                            {entry.taxRate}%
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right font-black text-slate-900">
                          {formatCurrency(entry.netAmount)} €
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-emerald-600">
                          {formatCurrency(entry.taxAmount)} €
                        </td>
                        <td className="px-4 py-4 text-right font-black text-slate-900">
                          {formatCurrency(entry.grossAmount)} €
                        </td>
                        <td className="px-4 py-4 text-right text-slate-600">
                          {entry.invoiceCount}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-300 bg-slate-50 font-black">
                      <td className="px-4 py-4 text-slate-900">SUMME</td>
                      <td className="px-4 py-4 text-right text-slate-900">
                        {formatCurrency(totals.totalNet)} €
                      </td>
                      <td className="px-4 py-4 text-right text-emerald-600">
                        {formatCurrency(totals.totalTax)} €
                      </td>
                      <td className="px-4 py-4 text-right text-slate-900">
                        {formatCurrency(totals.totalGross)} €
                      </td>
                      <td className="px-4 py-4 text-right text-slate-600">{totals.invoiceCount}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Invoice List */}
          <div className="glass rounded-3xl border border-white/50 bg-gradient-to-br from-white to-slate-50/50 p-8 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-2xl font-black text-transparent">
                  Rechnungsübersicht - {periodLabel}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredInvoices.length} Rechnung{filteredInvoices.length !== 1 ? 'en' : ''} •
                  Nur Rechnungen aus dem gewählten Zeitraum werden angezeigt
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                      Rechnungsnr.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                      Datum
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                      Kunde
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">
                      Netto
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">
                      MwSt
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">
                      Brutto
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length > 0 ? (
                    filteredInvoices.map((invoice, index) => (
                      <tr key={index} className="transition-colors hover:bg-slate-50">
                        <td className="px-4 py-4 font-bold text-slate-900">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {new Date(invoice.date).toLocaleDateString('de-DE')}
                        </td>
                        <td className="px-4 py-4 text-slate-900">{invoice.customerName}</td>
                        <td className="px-4 py-4 text-right text-slate-600">
                          {formatCurrency(invoice.netAmount)} €
                        </td>
                        <td className="px-4 py-4 text-right text-slate-600">
                          {formatCurrency(invoice.taxAmount)} €
                        </td>
                        <td className="px-4 py-4 text-right font-black text-slate-900">
                          {formatCurrency(invoice.grossAmount)} €
                        </td>
                        <td className="px-4 py-4 text-center">
                          {invoice.isPaid ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Bezahlt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                              <AlertCircle className="h-3 w-3" />
                              Offen
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Keine Rechnungen im ausgewählten Zeitraum
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default AccountingView
