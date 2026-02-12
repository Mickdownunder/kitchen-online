import React from 'react'
import { ArrowDownLeft, ArrowUpRight, Calculator, Calendar, Inbox, Landmark } from 'lucide-react'
import type { AccountingTab, TimeRange } from '@/components/accounting/accounting.types'

interface AccountingControlsProps {
  activeTab: AccountingTab
  setActiveTab: (value: AccountingTab) => void
  timeRange: TimeRange
  setTimeRange: (value: TimeRange) => void
  selectedMonth: string
  setSelectedMonth: (value: string) => void
  selectedQuarter: string
  setSelectedQuarter: (value: string) => void
  selectedYear: number
  setSelectedYear: (value: number) => void
  customStartDate: string
  setCustomStartDate: (value: string) => void
  customEndDate: string
  setCustomEndDate: (value: string) => void
  periodLabel: string
  availableMonths: string[]
  availableYears: number[]
  outgoingInvoiceCount: number
  incomingInvoiceCount: number
}

export function AccountingControls({
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
  outgoingInvoiceCount,
  incomingInvoiceCount,
}: AccountingControlsProps) {
  return (
    <>
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <h2 className="mb-2 text-5xl font-black tracking-tighter text-slate-900">
            Buchhaltung vorbereiten
          </h2>
          <p className="font-medium text-slate-500">Perfekte Vorbereitung für Ihren Steuerberater</p>
        </div>
      </div>

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
            {outgoingInvoiceCount}
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
            {incomingInvoiceCount}
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
        <button
          onClick={() => setActiveTab('inbound')}
          className={`flex items-center gap-2 rounded-xl px-6 py-3 font-bold transition-all ${
            activeTab === 'inbound'
              ? 'bg-amber-500 text-white shadow-lg'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Inbox className="h-5 w-5" />
          Dokument-Posteingang
        </button>
      </div>

      {activeTab !== 'bank' && activeTab !== 'inbound' && (
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
                  onChange={event => setTimeRange(event.target.value as TimeRange)}
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
                  onChange={event => setSelectedMonth(event.target.value)}
                  className="cursor-pointer rounded-2xl border-2 border-amber-500 bg-white px-6 py-3 text-base font-black text-slate-900 shadow-lg outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {availableMonths.map(month => {
                    const [year, monthNumber] = month.split('-')
                    const date = new Date(Number(year), Number(monthNumber) - 1)
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
                  onChange={event => setSelectedQuarter(event.target.value)}
                  className="cursor-pointer rounded-2xl border-2 border-amber-500 bg-white px-6 py-3 text-base font-black text-slate-900 shadow-lg outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {availableYears
                    .flatMap(year =>
                      [1, 2, 3, 4].map(quarter => ({
                        value: `${year}-Q${quarter}`,
                        label: `${quarter}. Quartal ${year}`,
                      })),
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
                  onChange={event => setSelectedYear(parseInt(event.target.value, 10))}
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
                      onChange={event => setCustomStartDate(event.target.value)}
                      className="cursor-pointer rounded-2xl border-2 border-amber-500 bg-white px-4 py-3 text-base font-black text-slate-900 shadow-lg outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <span className="font-bold text-slate-500">–</span>
                  <div>
                    <label className="sr-only">Bis</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={event => setCustomEndDate(event.target.value)}
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
    </>
  )
}
