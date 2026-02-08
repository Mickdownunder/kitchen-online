'use client'

import React from 'react'
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
  Landmark,
} from 'lucide-react'
import { CustomerProject } from '@/types'
import SupplierInvoicesView from './accounting/SupplierInvoicesView'
import AccountingValidation from './accounting/AccountingValidation'
import BankReconciliationView from './accounting/BankReconciliationView'
import { StatCard, ChartContainer } from '@/components/ui'
import {
  useAccountingData,
  formatCurrency,
  type TimeRange,
} from './useAccountingData'

interface AccountingViewProps {
  projects: CustomerProject[]
}

const AccountingView: React.FC<AccountingViewProps> = ({ projects }) => {
  const {
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
    periodLabel,
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
  } = useAccountingData(projects)

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
        <button
          onClick={() => setActiveTab('bank')}
          className={`flex items-center gap-2 rounded-xl px-6 py-3 font-bold transition-all ${
            activeTab === 'bank'
              ? 'bg-amber-500 text-white shadow-lg'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Landmark className="h-5 w-5" />
          Bankabgleich
        </button>
      </div>

      {/* Time range selector - hidden for bank tab */}
      {activeTab !== 'bank' && (
        <div className="glass rounded-3xl border border-white/50 bg-gradient-to-br from-white to-amber-50/30 p-6 shadow-xl">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h3 className="mb-2 text-xl font-black text-slate-900">Zeitraum auswählen</h3>
              <p className="text-sm text-slate-600">
                Wählen Sie den Zeitraum für die Buchhaltungsvorbereitung
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
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
                  <option value="custom">Benutzerdefiniert</option>
                </select>
              </div>

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

              {timeRange === 'custom' && (
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <label className="sr-only">Von</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={e => setCustomStartDate(e.target.value)}
                      className="cursor-pointer rounded-2xl border-2 border-amber-500 bg-white px-4 py-3 text-base font-black text-slate-900 shadow-lg outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <span className="font-bold text-slate-500">–</span>
                  <div>
                    <label className="sr-only">Bis</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={e => setCustomEndDate(e.target.value)}
                      className="cursor-pointer rounded-2xl border-2 border-amber-500 bg-white px-4 py-3 text-base font-black text-slate-900 shadow-lg outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              <div className="rounded-2xl bg-amber-500 px-6 py-3 text-base font-black text-white">
                {periodLabel}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Bank */}
      {activeTab === 'bank' && <BankReconciliationView />}

      {/* Tab: Incoming */}
      {activeTab === 'incoming' && (
        <SupplierInvoicesView
          projects={projects}
          onStatsChange={() => loadSupplierInvoices()}
        />
      )}

      {/* Tab: Overview (UVA) */}
      {activeTab === 'overview' && (
        <>
          <div className="glass rounded-3xl border border-white/50 bg-gradient-to-br from-white to-slate-50/50 p-8 shadow-xl">
            <h3 className="mb-6 text-2xl font-black text-slate-900">
              Umsatzsteuervoranmeldung (UVA) - {periodLabel}
            </h3>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Umsatzsteuer */}
              <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl bg-blue-500 p-3">
                    <ArrowUpRight className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Umsatzsteuer</p>
                    <p className="text-sm text-blue-600">Ausgangsrechnungen</p>
                  </div>
                </div>
                <p className="mb-2 text-3xl font-black text-blue-700">{formatCurrency(totals.totalTax)} €</p>
                <p className="text-sm text-blue-600">aus {totals.invoiceCount} Rechnung{totals.invoiceCount !== 1 ? 'en' : ''}</p>
                <p className="text-xs text-blue-500">Netto: {formatCurrency(totals.totalNet)} €</p>
              </div>

              {/* Vorsteuer */}
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-500 p-3">
                    <ArrowDownLeft className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Vorsteuer</p>
                    <p className="text-sm text-emerald-600">Eingangsrechnungen</p>
                  </div>
                </div>
                <p className="mb-2 text-3xl font-black text-emerald-700">−{formatCurrency(inputTaxTotals.totalTax)} €</p>
                <p className="text-sm text-emerald-600">aus {inputTaxTotals.count} Rechnung{inputTaxTotals.count !== 1 ? 'en' : ''}</p>
                <p className="text-xs text-emerald-500">Netto: {formatCurrency(inputTaxTotals.totalNet)} €</p>
              </div>

              {/* Zahllast */}
              <div className={`rounded-2xl border-2 p-6 ${zahllast >= 0 ? 'border-amber-300 bg-amber-50' : 'border-purple-300 bg-purple-50'}`}>
                <div className="mb-4 flex items-center gap-3">
                  <div className={`rounded-xl p-3 ${zahllast >= 0 ? 'bg-amber-500' : 'bg-purple-500'}`}>
                    <Calculator className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${zahllast >= 0 ? 'text-amber-600' : 'text-purple-600'}`}>
                      {zahllast >= 0 ? 'Zahllast' : 'Vorsteuerüberhang'}
                    </p>
                    <p className={`text-sm ${zahllast >= 0 ? 'text-amber-600' : 'text-purple-600'}`}>
                      {zahllast >= 0 ? 'An Finanzamt' : 'Vom Finanzamt'}
                    </p>
                  </div>
                </div>
                <p className={`mb-2 text-4xl font-black ${zahllast >= 0 ? 'text-amber-700' : 'text-purple-700'}`}>
                  {zahllast >= 0 ? '' : '−'}{formatCurrency(Math.abs(zahllast))} €
                </p>
                <p className={`text-sm ${zahllast >= 0 ? 'text-amber-600' : 'text-purple-600'}`}>= Umsatzsteuer − Vorsteuer</p>
              </div>
            </div>

            {/* Detail breakdown by tax rate */}
            {showDetails && (
              <div className="mt-8 grid gap-6 lg:grid-cols-2">
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
                          <td className="py-2 text-right text-slate-600">{formatCurrency(entry.netAmount)} €</td>
                          <td className="py-2 text-right font-bold text-blue-600">{formatCurrency(entry.taxAmount)} €</td>
                        </tr>
                      ))}
                      <tr className="font-bold">
                        <td className="py-2">Summe</td>
                        <td className="py-2 text-right">{formatCurrency(totals.totalNet)} €</td>
                        <td className="py-2 text-right text-blue-700">{formatCurrency(totals.totalTax)} €</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

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
                            <td className="py-2 text-right text-slate-600">{formatCurrency(entry.netAmount)} €</td>
                            <td className="py-2 text-right font-bold text-emerald-600">{formatCurrency(entry.taxAmount)} €</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-slate-400">Keine Eingangsrechnungen im Zeitraum</td>
                        </tr>
                      )}
                      {inputTaxData.length > 0 && (
                        <tr className="font-bold">
                          <td className="py-2">Summe</td>
                          <td className="py-2 text-right">{formatCurrency(inputTaxTotals.totalNet)} €</td>
                          <td className="py-2 text-right text-emerald-700">{formatCurrency(inputTaxTotals.totalTax)} €</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {supplierInvoices.some(inv => (inv.skontoAmount ?? 0) > 0) && (
                    <p className="mt-3 text-xs text-slate-500">
                      Skonto im Zeitraum:{' '}
                      {formatCurrency(supplierInvoices.reduce((sum, inv) => sum + (inv.skontoAmount ?? 0), 0))} € – wird beim Steuerberater separat angegeben (Vorsteuer auf tatsächlich gezahlten Betrag).
                    </p>
                  )}
                </div>
              </div>
            )}

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
            <button onClick={() => handleExport('uva')} disabled={isExporting} className="glass group rounded-2xl border border-white/50 bg-gradient-to-br from-white to-blue-50/30 p-6 shadow-lg transition-all hover:shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-blue-100 p-3"><FileSpreadsheet className="h-6 w-6 text-blue-600" /></div>
                {isExporting && <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />}
              </div>
              <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">UVA Export</p>
              <p className="text-lg font-black text-slate-900">Excel</p>
            </button>
            <button onClick={() => handleExport('invoices')} disabled={isExporting} className="glass group rounded-2xl border border-white/50 bg-gradient-to-br from-white to-emerald-50/30 p-6 shadow-lg transition-all hover:shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-emerald-100 p-3"><FileText className="h-6 w-6 text-emerald-600" /></div>
              </div>
              <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">Rechnungen</p>
              <p className="text-lg font-black text-slate-900">Excel</p>
            </button>
            <button onClick={() => handleExport('datev')} disabled={isExporting} className="glass group rounded-2xl border border-white/50 bg-gradient-to-br from-white to-purple-50/30 p-6 shadow-lg transition-all hover:shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-purple-100 p-3"><FileCheck className="h-6 w-6 text-purple-600" /></div>
              </div>
              <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">DATEV</p>
              <p className="text-lg font-black text-slate-900">CSV</p>
            </button>
            <button onClick={() => handleExport('all')} disabled={isExporting} className="glass group rounded-2xl border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100/30 p-6 shadow-lg transition-all hover:shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-amber-500 p-3"><Zap className="h-6 w-6 text-white" /></div>
              </div>
              <p className="mb-1 text-xs font-black uppercase tracking-widest text-amber-700">Komplett-Paket</p>
              <p className="text-lg font-black text-slate-900">Alle Exporte</p>
            </button>
          </div>

          <AccountingValidation
            outgoingInvoices={filteredInvoices}
            supplierInvoices={supplierInvoices}
            totalOutputTax={totals.totalTax}
            totalInputTax={inputTaxTotals.totalTax}
            period={periodLabel}
          />
        </>
      )}

      {/* Tab: Outgoing */}
      {activeTab === 'outgoing' && (
        <>
          {missingInvoices.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-amber-600" />
                <div className="flex-1">
                  <div className="font-black text-slate-900">Hinweis: Fehlende Rechnungen im Zeitraum</div>
                  <div className="mt-1 text-sm text-slate-700">
                    Diese Projekte haben Anzahlung/Schlussbetrag, aber es wurde keine Rechnung als Datensatz erfasst. Sie werden <span className="font-bold">nicht</span> in Exporte übernommen.
                  </div>
                  <div className="mt-4 grid gap-2">
                    {missingInvoices.slice(0, 8).map(m => (
                      <div key={`${m.projectId}-${m.kind}-${m.date}`} className="flex items-center justify-between rounded-xl border border-amber-100 bg-white/70 px-4 py-3">
                        <div className="min-w-0">
                          <div className="truncate font-bold text-slate-900">{m.customerName} <span className="font-normal text-slate-400">·</span> {m.orderNumber}</div>
                          <div className="text-xs text-slate-600">{m.kind === 'deposit' ? 'Anzahlung' : 'Schlussrechnung'} · Datum: {new Date(m.date).toLocaleDateString('de-DE')}</div>
                        </div>
                        <div className="font-black tabular-nums text-slate-900">{formatCurrency(m.amountGross)} €</div>
                      </div>
                    ))}
                    {missingInvoices.length > 8 && (
                      <div className="text-xs text-amber-800">+{missingInvoices.length - 8} weitere …</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Export buttons */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <button onClick={() => handleExport('uva')} disabled={isExporting} className="glass group rounded-2xl border border-white/50 bg-gradient-to-br from-white to-blue-50/30 p-6 shadow-lg transition-all hover:shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-blue-100 p-3"><FileSpreadsheet className="h-6 w-6 text-blue-600" /></div>
                {isExporting && <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />}
              </div>
              <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">Umsatzsteuervoranmeldung</p>
              <p className="text-lg font-black text-slate-900">Excel Export</p>
              <p className="mt-1 text-xs text-slate-500">Nur für {periodLabel}</p>
            </button>
            <button onClick={() => handleExport('invoices')} disabled={isExporting} className="glass group rounded-2xl border border-white/50 bg-gradient-to-br from-white to-emerald-50/30 p-6 shadow-lg transition-all hover:shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-emerald-100 p-3"><FileText className="h-6 w-6 text-emerald-600" /></div>
                {isExporting && <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />}
              </div>
              <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">Alle Rechnungen</p>
              <p className="text-lg font-black text-slate-900">Excel Export</p>
              <p className="mt-1 text-xs text-slate-500">Nur für {periodLabel}</p>
            </button>
            <button onClick={() => handleExport('datev')} disabled={isExporting} className="glass group rounded-2xl border border-white/50 bg-gradient-to-br from-white to-purple-50/30 p-6 shadow-lg transition-all hover:shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-purple-100 p-3"><FileCheck className="h-6 w-6 text-purple-600" /></div>
                {isExporting && <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />}
              </div>
              <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">DATEV Export</p>
              <p className="text-lg font-black text-slate-900">CSV Format</p>
              <p className="mt-1 text-xs text-slate-500">Nur für {periodLabel}</p>
            </button>
            <button onClick={() => handleExport('all')} disabled={isExporting} className="glass group rounded-2xl border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100/30 p-6 shadow-lg transition-all hover:shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-amber-500 p-3"><Zap className="h-6 w-6 text-white" /></div>
                {isExporting && <RefreshCw className="h-5 w-5 animate-spin text-amber-600" />}
              </div>
              <p className="mb-1 text-xs font-black uppercase tracking-widest text-amber-700">Alles vorbereiten</p>
              <p className="text-lg font-black text-slate-900">Komplett-Paket</p>
              <p className="mt-1 text-xs text-amber-600">PDF + Excel + DATEV für {periodLabel}</p>
            </button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={DollarSign} iconColor="slate" value={`${formatCurrency(totals.totalGross)} €`} label="Gesamtumsatz" subtitle={`Netto: ${formatCurrency(totals.totalNet)} €`} tint="slate" />
            <StatCard icon={Percent} iconColor="slate" value={`${formatCurrency(totals.totalTax)} €`} label="Umsatzsteuer" subtitle="Aus allen Steuersätzen" tint="slate" />
            <StatCard icon={Package} iconColor="slate" value={totals.invoiceCount} label="Rechnungen" subtitle={`${totals.paidCount} bezahlt, ${totals.invoiceCount - totals.paidCount} offen`} tint="slate" />
            <StatCard icon={Users} iconColor="slate" value={`${formatCurrency(totals.totalPaid)} €`} label="Eingegangen" subtitle={`Ausstehend: ${formatCurrency(totals.totalOutstanding)} €`} tint="slate" />
          </div>

          {/* UVA breakdown */}
          <ChartContainer
            title="Umsatzsteuervoranmeldung (UVA)"
            subtitle="Aufgeteilt nach Steuersätzen"
            action={
              <button onClick={() => setShowDetails(!showDetails)} className="rounded-lg p-2 transition-all hover:bg-slate-100">
                {showDetails ? <EyeOff className="h-5 w-5 text-slate-400" /> : <Eye className="h-5 w-5 text-slate-400" />}
              </button>
            }
          >
            {showDetails && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">Steuersatz</th>
                      <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">Netto-Umsatz</th>
                      <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">Umsatzsteuer</th>
                      <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">Brutto-Umsatz</th>
                      <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">Anzahl</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {uvaData.map((entry, index) => (
                      <tr key={index} className="transition-colors hover:bg-slate-50">
                        <td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-black text-slate-900">{entry.taxRate}%</span></td>
                        <td className="px-4 py-4 text-right font-black text-slate-900">{formatCurrency(entry.netAmount)} €</td>
                        <td className="px-4 py-4 text-right font-bold text-emerald-600">{formatCurrency(entry.taxAmount)} €</td>
                        <td className="px-4 py-4 text-right font-black text-slate-900">{formatCurrency(entry.grossAmount)} €</td>
                        <td className="px-4 py-4 text-right text-slate-600">{entry.invoiceCount}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-300 bg-slate-50 font-black">
                      <td className="px-4 py-4 text-slate-900">SUMME</td>
                      <td className="px-4 py-4 text-right text-slate-900">{formatCurrency(totals.totalNet)} €</td>
                      <td className="px-4 py-4 text-right text-emerald-600">{formatCurrency(totals.totalTax)} €</td>
                      <td className="px-4 py-4 text-right text-slate-900">{formatCurrency(totals.totalGross)} €</td>
                      <td className="px-4 py-4 text-right text-slate-600">{totals.invoiceCount}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </ChartContainer>

          {/* Invoice list */}
          <ChartContainer
            title={`Rechnungsübersicht - ${periodLabel}`}
            subtitle={`${filteredInvoices.length} Rechnung${filteredInvoices.length !== 1 ? 'en' : ''} • Nur Rechnungen aus dem gewählten Zeitraum werden angezeigt`}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">Rechnungsnr.</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">Datum</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">Kunde</th>
                    <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">Netto</th>
                    <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">MwSt</th>
                    <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">Brutto</th>
                    <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length > 0 ? (
                    filteredInvoices.map((invoice, index) => {
                      const isCredit = invoice.type === 'credit'
                      return (
                        <tr key={index} className={`transition-colors hover:bg-slate-50 ${isCredit ? 'bg-red-50/50' : ''}`}>
                          <td className="px-4 py-4">
                            <span className={`font-bold ${isCredit ? 'text-red-600' : 'text-slate-900'}`}>{invoice.invoiceNumber}</span>
                            {isCredit && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black uppercase text-red-600">Storno</span>}
                          </td>
                          <td className="px-4 py-4 text-slate-600">{new Date(invoice.date).toLocaleDateString('de-DE')}</td>
                          <td className="px-4 py-4 text-slate-900">{invoice.customerName}</td>
                          <td className={`px-4 py-4 text-right ${isCredit ? 'text-red-600' : 'text-slate-600'}`}>{formatCurrency(invoice.netAmount)} €</td>
                          <td className={`px-4 py-4 text-right ${isCredit ? 'text-red-600' : 'text-slate-600'}`}>{formatCurrency(invoice.taxAmount)} €</td>
                          <td className={`px-4 py-4 text-right font-black ${isCredit ? 'text-red-600' : 'text-slate-900'}`}>{formatCurrency(invoice.grossAmount)} €</td>
                          <td className="px-4 py-4 text-center">
                            {isCredit ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">Storno</span>
                            ) : invoice.isPaid ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700"><CheckCircle2 className="h-3 w-3" />Bezahlt</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700"><AlertCircle className="h-3 w-3" />Offen</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">Keine Rechnungen im ausgewählten Zeitraum</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ChartContainer>
        </>
      )}
    </div>
  )
}

export default AccountingView
