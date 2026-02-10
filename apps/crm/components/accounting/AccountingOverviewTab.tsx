import React from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  Eye,
  EyeOff,
  FileCheck,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Zap,
} from 'lucide-react'
import type { SupplierInvoice } from '@/types'
import AccountingValidation from '@/components/accounting/AccountingValidation'
import { formatCurrency } from '@/components/accounting/accountingCalculations'
import type {
  AccountingTotals,
  ExportType,
  InputTaxEntry,
  InputTaxTotals,
  InvoiceData,
  UVAEntry,
} from '@/components/accounting/accounting.types'

interface AccountingOverviewTabProps {
  periodLabel: string
  totals: AccountingTotals
  inputTaxTotals: InputTaxTotals
  zahllast: number
  showDetails: boolean
  setShowDetails: (value: boolean) => void
  uvaData: UVAEntry[]
  inputTaxData: InputTaxEntry[]
  supplierInvoices: SupplierInvoice[]
  filteredInvoices: InvoiceData[]
  handleExport: (type: ExportType) => Promise<void>
  isExporting: boolean
}

export function AccountingOverviewTab({
  periodLabel,
  totals,
  inputTaxTotals,
  zahllast,
  showDetails,
  setShowDetails,
  uvaData,
  inputTaxData,
  supplierInvoices,
  filteredInvoices,
  handleExport,
  isExporting,
}: AccountingOverviewTabProps) {
  return (
    <>
      <div className="glass rounded-3xl border border-white/50 bg-gradient-to-br from-white to-slate-50/50 p-8 shadow-xl">
        <h3 className="mb-6 text-2xl font-black text-slate-900">
          Umsatzsteuervoranmeldung (UVA) - {periodLabel}
        </h3>

        <div className="grid gap-6 lg:grid-cols-3">
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
            <p className="text-sm text-blue-600">
              aus {totals.invoiceCount} Rechnung{totals.invoiceCount !== 1 ? 'en' : ''}
            </p>
            <p className="text-xs text-blue-500">Netto: {formatCurrency(totals.totalNet)} €</p>
          </div>

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
            <p className="mb-2 text-3xl font-black text-emerald-700">
              −{formatCurrency(inputTaxTotals.totalTax)} €
            </p>
            <p className="text-sm text-emerald-600">
              aus {inputTaxTotals.count} Rechnung{inputTaxTotals.count !== 1 ? 'en' : ''}
            </p>
            <p className="text-xs text-emerald-500">Netto: {formatCurrency(inputTaxTotals.totalNet)} €</p>
          </div>

          <div
            className={`rounded-2xl border-2 p-6 ${
              zahllast >= 0 ? 'border-amber-300 bg-amber-50' : 'border-purple-300 bg-purple-50'
            }`}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className={`rounded-xl p-3 ${zahllast >= 0 ? 'bg-amber-500' : 'bg-purple-500'}`}>
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
                <p className={`text-sm ${zahllast >= 0 ? 'text-amber-600' : 'text-purple-600'}`}>
                  {zahllast >= 0 ? 'An Finanzamt' : 'Vom Finanzamt'}
                </p>
              </div>
            </div>
            <p className={`mb-2 text-4xl font-black ${zahllast >= 0 ? 'text-amber-700' : 'text-purple-700'}`}>
              {zahllast >= 0 ? '' : '−'}
              {formatCurrency(Math.abs(zahllast))} €
            </p>
            <p className={`text-sm ${zahllast >= 0 ? 'text-amber-600' : 'text-purple-600'}`}>
              = Umsatzsteuer − Vorsteuer
            </p>
          </div>
        </div>

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
                  {uvaData.map((entry, index) => (
                    <tr key={index} className="border-b border-slate-50">
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
                    inputTaxData.map((entry, index) => (
                      <tr key={index} className="border-b border-slate-50">
                        <td className="py-2 font-bold text-slate-700">{entry.taxRate}%</td>
                        <td className="py-2 text-right text-slate-600">{formatCurrency(entry.netAmount)} €</td>
                        <td className="py-2 text-right font-bold text-emerald-600">{formatCurrency(entry.taxAmount)} €</td>
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
                      <td className="py-2 text-right">{formatCurrency(inputTaxTotals.totalNet)} €</td>
                      <td className="py-2 text-right text-emerald-700">{formatCurrency(inputTaxTotals.totalTax)} €</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {supplierInvoices.some(invoice => (invoice.skontoAmount ?? 0) > 0) && (
                <p className="mt-3 text-xs text-slate-500">
                  Skonto im Zeitraum:{' '}
                  {formatCurrency(
                    supplierInvoices.reduce((sum, invoice) => sum + (invoice.skontoAmount ?? 0), 0),
                  )}{' '}
                  € – wird beim Steuerberater separat angegeben (Vorsteuer auf tatsächlich gezahlten Betrag).
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={() => void handleExport('uva')}
          disabled={isExporting}
          className="glass group rounded-2xl border border-white/50 bg-gradient-to-br from-white to-blue-50/30 p-6 shadow-lg transition-all hover:shadow-xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-xl bg-blue-100 p-3"><FileSpreadsheet className="h-6 w-6 text-blue-600" /></div>
            {isExporting && <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />}
          </div>
          <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">UVA Export</p>
          <p className="text-lg font-black text-slate-900">Excel</p>
        </button>
        <button
          onClick={() => void handleExport('invoices')}
          disabled={isExporting}
          className="glass group rounded-2xl border border-white/50 bg-gradient-to-br from-white to-emerald-50/30 p-6 shadow-lg transition-all hover:shadow-xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-xl bg-emerald-100 p-3"><FileText className="h-6 w-6 text-emerald-600" /></div>
          </div>
          <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">Rechnungen</p>
          <p className="text-lg font-black text-slate-900">Excel</p>
        </button>
        <button
          onClick={() => void handleExport('datev')}
          disabled={isExporting}
          className="glass group rounded-2xl border border-white/50 bg-gradient-to-br from-white to-purple-50/30 p-6 shadow-lg transition-all hover:shadow-xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-xl bg-purple-100 p-3"><FileCheck className="h-6 w-6 text-purple-600" /></div>
          </div>
          <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">DATEV</p>
          <p className="text-lg font-black text-slate-900">CSV</p>
        </button>
        <button
          onClick={() => void handleExport('all')}
          disabled={isExporting}
          className="glass group rounded-2xl border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100/30 p-6 shadow-lg transition-all hover:shadow-xl"
        >
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
  )
}
