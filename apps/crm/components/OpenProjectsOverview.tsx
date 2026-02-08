'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  X,
  FileSpreadsheet,
  FileText,
  Filter,
  ClipboardList,
  CheckCircle2,
  Circle,
  Minus,
} from 'lucide-react'
import { CustomerProject, Invoice } from '@/types'
import { getInvoicesWithProject } from '@/lib/supabase/services'
import { logger } from '@/lib/utils/logger'
import * as XLSX from 'xlsx'

// ---------- Types ----------

interface OpenProjectsOverviewProps {
  projects: CustomerProject[]
  onClose: () => void
}

type FilterMode = 'all' | 'with_installation' | 'without_installation'

interface ProjectPaymentRow {
  project: CustomerProject
  firstDeposit: InvoiceSummary
  secondDeposit: InvoiceSummary
  finalInvoice: InvoiceSummary
  otherPayments: { count: number; amount: number; paidAmount: number }
  totalPaid: number
  totalOpen: number
}

interface InvoiceSummary {
  exists: boolean
  isPaid: boolean
  amount: number
}

// ---------- Helpers ----------

function buildPaymentRow(project: CustomerProject, allInvoices: Invoice[]): ProjectPaymentRow {
  const projectInvoices = allInvoices.filter(inv => inv.projectId === project.id && inv.type !== 'credit')

  const first = projectInvoices.find(inv => inv.type === 'partial' && inv.scheduleType === 'first')
  const second = projectInvoices.find(inv => inv.type === 'partial' && inv.scheduleType === 'second')
  const final = projectInvoices.find(inv => inv.type === 'final')

  const others = projectInvoices.filter(
    inv =>
      inv.id !== first?.id &&
      inv.id !== second?.id &&
      inv.id !== final?.id
  )

  const toSummary = (inv: Invoice | undefined): InvoiceSummary => ({
    exists: !!inv,
    isPaid: inv?.isPaid ?? false,
    amount: inv?.amount ?? 0,
  })

  const totalPaid = projectInvoices.filter(inv => inv.isPaid).reduce((s, inv) => s + inv.amount, 0)
  const totalInvoiced = projectInvoices.reduce((s, inv) => s + inv.amount, 0)
  const totalOpen = project.totalAmount - totalPaid

  return {
    project,
    firstDeposit: toSummary(first),
    secondDeposit: toSummary(second),
    finalInvoice: toSummary(final),
    otherPayments: {
      count: others.length,
      amount: others.reduce((s, i) => s + i.amount, 0),
      paidAmount: others.filter(i => i.isPaid).reduce((s, i) => s + i.amount, 0),
    },
    totalPaid,
    totalOpen: totalOpen > 0 ? totalOpen : 0,
  }
}

function StatusIcon({ summary }: { summary: InvoiceSummary }): React.ReactElement {
  if (!summary.exists) return <Minus className="h-4 w-4 text-slate-300" />
  if (summary.isPaid) return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
  return <Circle className="h-4 w-4 text-amber-500" />
}

function fmtDate(dateStr?: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function fmtCurrency(value: number): string {
  return value.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ---------- Excel Export ----------

function exportExcel(rows: ProjectPaymentRow[]): void {
  const header = [
    'Kunde',
    'Auftrag',
    'Montage',
    'Gesamt €',
    '1. Anz.',
    '1. Anz. €',
    '2. Anz.',
    '2. Anz. €',
    'Schlussrechn.',
    'Schlussrechn. €',
    'Sonstige Anz.',
    'Sonstige €',
    'Bezahlt €',
    'Offen €',
  ]

  const data: (string | number)[][] = [
    ['BESTANDSÜBERSICHT – OFFENE AUFTRÄGE'],
    [`Erstellt am: ${new Date().toLocaleDateString('de-AT')}`],
    [`Anzahl Aufträge: ${rows.length}`],
    [],
    header,
  ]

  for (const r of rows) {
    data.push([
      r.project.customerName,
      r.project.orderNumber,
      r.project.installationDate ? fmtDate(r.project.installationDate) : '—',
      Number(r.project.totalAmount.toFixed(2)),
      r.firstDeposit.exists ? (r.firstDeposit.isPaid ? 'Bezahlt' : 'Offen') : '—',
      r.firstDeposit.exists ? Number(r.firstDeposit.amount.toFixed(2)) : '',
      r.secondDeposit.exists ? (r.secondDeposit.isPaid ? 'Bezahlt' : 'Offen') : '—',
      r.secondDeposit.exists ? Number(r.secondDeposit.amount.toFixed(2)) : '',
      r.finalInvoice.exists ? (r.finalInvoice.isPaid ? 'Bezahlt' : 'Offen') : '—',
      r.finalInvoice.exists ? Number(r.finalInvoice.amount.toFixed(2)) : '',
      r.otherPayments.count > 0 ? `${r.otherPayments.count} Stk` : '—',
      r.otherPayments.count > 0 ? Number(r.otherPayments.amount.toFixed(2)) : '',
      Number(r.totalPaid.toFixed(2)),
      Number(r.totalOpen.toFixed(2)),
    ])
  }

  // Totals row
  const totalGross = rows.reduce((s, r) => s + r.project.totalAmount, 0)
  const totalPaid = rows.reduce((s, r) => s + r.totalPaid, 0)
  const totalOpen = rows.reduce((s, r) => s + r.totalOpen, 0)
  data.push([])
  data.push([
    'SUMME', '', '', Number(totalGross.toFixed(2)),
    '', '', '', '', '', '',
    '', '',
    Number(totalPaid.toFixed(2)), Number(totalOpen.toFixed(2)),
  ])

  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [
    { wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
    { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 12 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Offene Aufträge')
  XLSX.writeFile(wb, `Offene_Auftraege_${new Date().toISOString().split('T')[0]}.xlsx`)
}

// ---------- PDF Export (client-side, simple print approach) ----------

function exportPDF(rows: ProjectPaymentRow[]): void {
  const totalGross = rows.reduce((s, r) => s + r.project.totalAmount, 0)
  const totalPaid = rows.reduce((s, r) => s + r.totalPaid, 0)
  const totalOpen = rows.reduce((s, r) => s + r.totalOpen, 0)

  const statusStr = (s: InvoiceSummary): string => {
    if (!s.exists) return '—'
    return s.isPaid ? '✓' : '○'
  }

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Bestandsübersicht – Offene Aufträge</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 24px; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .meta { color: #64748b; font-size: 10px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #1e293b; color: #fff; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
    th.r, td.r { text-align: right; }
    th.c, td.c { text-align: center; }
    td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
    tr:nth-child(even) { background: #f8fafc; }
    .total td { font-weight: 700; border-top: 2px solid #1e293b; background: #f1f5f9; }
    .legend { margin-top: 12px; font-size: 9px; color: #64748b; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>Bestandsübersicht – Offene Aufträge</h1>
  <div class="meta">Erstellt am ${new Date().toLocaleDateString('de-AT')} · ${rows.length} Aufträge</div>
  <table>
    <thead>
      <tr>
        <th>Kunde</th><th>Auftrag</th><th>Montage</th><th class="r">Gesamt</th>
        <th class="c">1. Anz.</th><th class="r">Betrag</th>
        <th class="c">2. Anz.</th><th class="r">Betrag</th>
        <th class="c">Schluss</th><th class="r">Betrag</th>
        <th class="r">Bezahlt</th><th class="r">Offen</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(r => `<tr>
        <td>${r.project.customerName}</td>
        <td>${r.project.orderNumber}</td>
        <td>${fmtDate(r.project.installationDate)}</td>
        <td class="r">${fmtCurrency(r.project.totalAmount)}</td>
        <td class="c">${statusStr(r.firstDeposit)}</td>
        <td class="r">${r.firstDeposit.exists ? fmtCurrency(r.firstDeposit.amount) : '—'}</td>
        <td class="c">${statusStr(r.secondDeposit)}</td>
        <td class="r">${r.secondDeposit.exists ? fmtCurrency(r.secondDeposit.amount) : '—'}</td>
        <td class="c">${statusStr(r.finalInvoice)}</td>
        <td class="r">${r.finalInvoice.exists ? fmtCurrency(r.finalInvoice.amount) : '—'}</td>
        <td class="r">${fmtCurrency(r.totalPaid)}</td>
        <td class="r" style="color:${r.totalOpen > 0 ? '#dc2626' : '#16a34a'};font-weight:600">${fmtCurrency(r.totalOpen)}</td>
      </tr>`).join('')}
      <tr class="total">
        <td colspan="3">SUMME</td>
        <td class="r">${fmtCurrency(totalGross)}</td>
        <td></td><td></td><td></td><td></td><td></td><td></td>
        <td class="r">${fmtCurrency(totalPaid)}</td>
        <td class="r">${fmtCurrency(totalOpen)}</td>
      </tr>
    </tbody>
  </table>
  <div class="legend">✓ = bezahlt · ○ = erstellt/offen · — = nicht erstellt</div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

// ---------- Component ----------

export function OpenProjectsOverview({ projects, onClose }: OpenProjectsOverviewProps): React.ReactElement {
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterMode>('all')

  useEffect(() => {
    getInvoicesWithProject()
      .then(result => {
        if (result.ok) setAllInvoices(result.data)
      })
      .catch(err => logger.error('Failed to load invoices for overview', { component: 'OpenProjectsOverview' }, err as Error))
      .finally(() => setLoading(false))
  }, [])

  // Build rows: projects with financial activity that still have open amounts
  const rows = useMemo(() => {
    const allRows = projects
      .filter(p => p.totalAmount > 0)
      .map(p => buildPaymentRow(p, allInvoices))
    // "Offen" = totalOpen > 0 OR missing invoices (first deposit or final not yet created)
    return allRows.filter(
      r => r.totalOpen > 0 || !r.firstDeposit.exists || !r.finalInvoice.exists
    )
  }, [projects, allInvoices])

  const filteredRows = useMemo(() => {
    if (filter === 'with_installation') return rows.filter(r => !!r.project.installationDate)
    if (filter === 'without_installation') return rows.filter(r => !r.project.installationDate)
    return rows
  }, [rows, filter])

  // Summary stats
  const stats = useMemo(() => {
    const totalGross = filteredRows.reduce((s, r) => s + r.project.totalAmount, 0)
    const totalPaid = filteredRows.reduce((s, r) => s + r.totalPaid, 0)
    const totalOpen = filteredRows.reduce((s, r) => s + r.totalOpen, 0)
    const missingFirst = filteredRows.filter(r => !r.firstDeposit.exists).length
    const missingFinal = filteredRows.filter(r => !r.finalInvoice.exists).length
    return { totalGross, totalPaid, totalOpen, missingFirst, missingFinal }
  }, [filteredRows])

  const handleExportExcel = useCallback(() => exportExcel(filteredRows), [filteredRows])
  const handleExportPDF = useCallback(() => exportPDF(filteredRows), [filteredRows])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8 backdrop-blur-sm">
      <div className="w-full max-w-7xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-amber-100 p-3">
              <ClipboardList className="h-6 w-6 text-amber-700" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">Bestandsübersicht</h2>
              <p className="text-sm text-slate-500">
                {filteredRows.length} offene Aufträge · Gesamt {fmtCurrency(stats.totalGross)} €
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              disabled={loading || filteredRows.length === 0}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </button>
            <button
              onClick={handleExportPDF}
              disabled={loading || filteredRows.length === 0}
              className="flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-slate-800 disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4 border-b border-slate-100 bg-slate-50/50 p-6">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Aufträge</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{filteredRows.length}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Gesamt</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{fmtCurrency(stats.totalGross)} €</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Bezahlt</p>
            <p className="mt-1 text-2xl font-black text-emerald-600">{fmtCurrency(stats.totalPaid)} €</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">Offen</p>
            <p className="mt-1 text-2xl font-black text-red-600">{fmtCurrency(stats.totalOpen)} €</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Fehlende Rechnungen</p>
            <p className="mt-1 text-lg font-black text-amber-600">
              {stats.missingFirst > 0 && <span>{stats.missingFirst} Anz.</span>}
              {stats.missingFirst > 0 && stats.missingFinal > 0 && <span> · </span>}
              {stats.missingFinal > 0 && <span>{stats.missingFinal} Schluss</span>}
              {stats.missingFirst === 0 && stats.missingFinal === 0 && <span className="text-emerald-600">Alle erstellt</span>}
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-3">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="mr-2 text-xs font-bold uppercase tracking-widest text-slate-400">Filter:</span>
          {([
            ['all', 'Alle'],
            ['with_installation', 'Mit Montagetermin'],
            ['without_installation', 'Ohne Montagetermin'],
          ] as [FilterMode, string][]).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                filter === mode
                  ? 'bg-slate-900 text-white shadow'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="max-h-[60vh] overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <ClipboardList className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="font-semibold">Keine offenen Aufträge</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-slate-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Kunde</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Auftrag</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Montage</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider">Gesamt</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider">1. Anz.</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider">Betrag</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider">2. Anz.</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider">Betrag</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider">Schluss</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider">Betrag</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider">Bezahlt</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider">Offen</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, idx) => (
                  <tr
                    key={r.project.id}
                    className={`border-b border-slate-100 transition-colors hover:bg-amber-50/50 ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{r.project.customerName}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{r.project.orderNumber}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{fmtDate(r.project.installationDate)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{fmtCurrency(r.project.totalAmount)}</td>
                    <td className="px-4 py-3 text-center"><StatusIcon summary={r.firstDeposit} /></td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600">
                      {r.firstDeposit.exists ? fmtCurrency(r.firstDeposit.amount) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center"><StatusIcon summary={r.secondDeposit} /></td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600">
                      {r.secondDeposit.exists ? fmtCurrency(r.secondDeposit.amount) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center"><StatusIcon summary={r.finalInvoice} /></td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600">
                      {r.finalInvoice.exists ? fmtCurrency(r.finalInvoice.amount) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-600">
                      {fmtCurrency(r.totalPaid)}
                    </td>
                    <td className={`px-4 py-3 text-right text-sm font-bold ${r.totalOpen > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {fmtCurrency(r.totalOpen)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-900 bg-slate-100">
                <tr>
                  <td className="px-4 py-3 text-sm font-black text-slate-900" colSpan={3}>SUMME</td>
                  <td className="px-4 py-3 text-right text-sm font-black text-slate-900">{fmtCurrency(stats.totalGross)}</td>
                  <td colSpan={6}></td>
                  <td className="px-4 py-3 text-right text-sm font-black text-emerald-600">{fmtCurrency(stats.totalPaid)}</td>
                  <td className="px-4 py-3 text-right text-sm font-black text-red-600">{fmtCurrency(stats.totalOpen)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 border-t border-slate-200 px-6 py-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Legende:</span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Bezahlt
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <Circle className="h-3.5 w-3.5 text-amber-500" /> Erstellt / Offen
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <Minus className="h-3.5 w-3.5 text-slate-300" /> Nicht erstellt
          </span>
        </div>
      </div>
    </div>
  )
}
