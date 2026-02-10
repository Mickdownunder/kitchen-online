import React from 'react'
import {
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Eye,
  EyeOff,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Package,
  Percent,
  RefreshCw,
  Users,
  Zap,
} from 'lucide-react'
import { ChartContainer, StatCard } from '@/components/ui'
import { formatCurrency } from '@/components/accounting/accountingCalculations'
import type {
  AccountingTotals,
  ExportType,
  InvoiceData,
  MissingInvoice,
  UVAEntry,
} from '@/components/accounting/accounting.types'

interface AccountingOutgoingTabProps {
  periodLabel: string
  missingInvoices: MissingInvoice[]
  filteredInvoices: InvoiceData[]
  totals: AccountingTotals
  uvaData: UVAEntry[]
  showDetails: boolean
  setShowDetails: (value: boolean) => void
  handleExport: (type: ExportType) => Promise<void>
  isExporting: boolean
}

export function AccountingOutgoingTab({
  periodLabel,
  missingInvoices,
  filteredInvoices,
  totals,
  uvaData,
  showDetails,
  setShowDetails,
  handleExport,
  isExporting,
}: AccountingOutgoingTabProps) {
  return (
    <>
      {missingInvoices.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-amber-600" />
            <div className="flex-1">
              <div className="font-black text-slate-900">Hinweis: Fehlende Rechnungen im Zeitraum</div>
              <div className="mt-1 text-sm text-slate-700">
                Diese Projekte haben Anzahlung/Schlussbetrag, aber es wurde keine Rechnung als Datensatz
                erfasst. Sie werden <span className="font-bold">nicht</span> in Exporte übernommen.
              </div>
              <div className="mt-4 grid gap-2">
                {missingInvoices.slice(0, 8).map(missingInvoice => (
                  <div
                    key={`${missingInvoice.projectId}-${missingInvoice.kind}-${missingInvoice.date}`}
                    className="flex items-center justify-between rounded-xl border border-amber-100 bg-white/70 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-bold text-slate-900">
                        {missingInvoice.customerName}{' '}
                        <span className="font-normal text-slate-400">·</span>{' '}
                        {missingInvoice.orderNumber}
                      </div>
                      <div className="text-xs text-slate-600">
                        {missingInvoice.kind === 'deposit' ? 'Anzahlung' : 'Schlussrechnung'} · Datum:{' '}
                        {new Date(missingInvoice.date).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                    <div className="font-black tabular-nums text-slate-900">
                      {formatCurrency(missingInvoice.amountGross)} €
                    </div>
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <button onClick={() => void handleExport('uva')} disabled={isExporting} className="glass group rounded-2xl border border-white/50 bg-gradient-to-br from-white to-blue-50/30 p-6 shadow-lg transition-all hover:shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-xl bg-blue-100 p-3"><FileSpreadsheet className="h-6 w-6 text-blue-600" /></div>
            {isExporting && <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />}
          </div>
          <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">Umsatzsteuervoranmeldung</p>
          <p className="text-lg font-black text-slate-900">Excel Export</p>
          <p className="mt-1 text-xs text-slate-500">Nur für {periodLabel}</p>
        </button>
        <button onClick={() => void handleExport('invoices')} disabled={isExporting} className="glass group rounded-2xl border border-white/50 bg-gradient-to-br from-white to-emerald-50/30 p-6 shadow-lg transition-all hover:shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-xl bg-emerald-100 p-3"><FileText className="h-6 w-6 text-emerald-600" /></div>
            {isExporting && <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />}
          </div>
          <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">Alle Rechnungen</p>
          <p className="text-lg font-black text-slate-900">Excel Export</p>
          <p className="mt-1 text-xs text-slate-500">Nur für {periodLabel}</p>
        </button>
        <button onClick={() => void handleExport('datev')} disabled={isExporting} className="glass group rounded-2xl border border-white/50 bg-gradient-to-br from-white to-purple-50/30 p-6 shadow-lg transition-all hover:shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-xl bg-purple-100 p-3"><FileCheck className="h-6 w-6 text-purple-600" /></div>
            {isExporting && <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />}
          </div>
          <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">DATEV Export</p>
          <p className="text-lg font-black text-slate-900">CSV Format</p>
          <p className="mt-1 text-xs text-slate-500">Nur für {periodLabel}</p>
        </button>
        <button onClick={() => void handleExport('all')} disabled={isExporting} className="glass group rounded-2xl border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100/30 p-6 shadow-lg transition-all hover:shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-xl bg-amber-500 p-3"><Zap className="h-6 w-6 text-white" /></div>
            {isExporting && <RefreshCw className="h-5 w-5 animate-spin text-amber-600" />}
          </div>
          <p className="mb-1 text-xs font-black uppercase tracking-widest text-amber-700">Alles vorbereiten</p>
          <p className="text-lg font-black text-slate-900">Komplett-Paket</p>
          <p className="mt-1 text-xs text-amber-600">PDF + Excel + DATEV für {periodLabel}</p>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={DollarSign} iconColor="slate" value={`${formatCurrency(totals.totalGross)} €`} label="Gesamtumsatz" subtitle={`Netto: ${formatCurrency(totals.totalNet)} €`} tint="slate" />
        <StatCard icon={Percent} iconColor="slate" value={`${formatCurrency(totals.totalTax)} €`} label="Umsatzsteuer" subtitle="Aus allen Steuersätzen" tint="slate" />
        <StatCard icon={Package} iconColor="slate" value={totals.invoiceCount} label="Rechnungen" subtitle={`${totals.paidCount} bezahlt, ${totals.invoiceCount - totals.paidCount} offen`} tint="slate" />
        <StatCard icon={Users} iconColor="slate" value={`${formatCurrency(totals.totalPaid)} €`} label="Eingegangen" subtitle={`Ausstehend: ${formatCurrency(totals.totalOutstanding)} €`} tint="slate" />
      </div>

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
  )
}
