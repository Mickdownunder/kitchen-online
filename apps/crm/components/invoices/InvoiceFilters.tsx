'use client'

import React from 'react'
import { Search, Calendar } from 'lucide-react'

interface InvoiceFiltersProps {
  searchTerm: string
  setSearchTerm: (value: string) => void
  filterType: 'all' | 'deposit' | 'final' | 'credit'
  setFilterType: (value: 'all' | 'deposit' | 'final' | 'credit') => void
  filterStatus: 'all' | 'paid' | 'sent'
  setFilterStatus: (value: 'all' | 'paid' | 'sent') => void
  selectedYear: number | 'all'
  setSelectedYear: (value: number | 'all') => void
  selectedMonth: number | 'all'
  setSelectedMonth: (value: number | 'all') => void
  availableYears: number[]
}

export const InvoiceFilters: React.FC<InvoiceFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  filterType,
  setFilterType,
  filterStatus,
  setFilterStatus,
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  availableYears,
}) => {
  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Search */}
      <div className="glass flex flex-1 items-center rounded-2xl border border-white/50 bg-gradient-to-r from-white to-slate-50/30 p-2 shadow-lg">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Suche nach Kunde, Rechnungsnummer..."
            className="w-full border-none bg-transparent py-3 pl-12 pr-4 text-sm font-medium outline-none transition-colors placeholder:text-slate-400 focus:placeholder:text-slate-300"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Year Filter */}
      <div className="glass flex items-center gap-2 rounded-2xl border border-white/50 bg-gradient-to-r from-white to-slate-50/30 p-2 shadow-lg">
        <Calendar className="h-4 w-4 text-slate-400" />
        <select
          value={selectedYear}
          onChange={e => {
            setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))
            if (e.target.value !== 'all') {
              setSelectedMonth('all')
            }
          }}
          className="cursor-pointer border-none bg-transparent px-3 py-2 text-sm font-bold text-slate-900 outline-none"
        >
          <option value="all">Alle Jahre</option>
          {availableYears.map(year => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Month Filter */}
      {selectedYear !== 'all' && (
        <div className="glass flex items-center gap-2 rounded-2xl border border-white/50 bg-gradient-to-r from-white to-slate-50/30 p-2 shadow-lg">
          <select
            value={selectedMonth}
            onChange={e =>
              setSelectedMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))
            }
            className="cursor-pointer border-none bg-transparent px-3 py-2 text-sm font-bold text-slate-900 outline-none"
          >
            <option value="all">Alle Monate</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
              <option key={month} value={month}>
                {new Date(2000, month - 1).toLocaleDateString('de-DE', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Type Filter */}
      <div className="glass scrollbar-hide flex items-center gap-2 overflow-x-auto rounded-2xl border border-white/50 bg-gradient-to-r from-white to-slate-50/30 p-2 shadow-lg">
        <button
          onClick={() => setFilterType('all')}
          className={`whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
            filterType === 'all'
              ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg'
              : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
          }`}
        >
          Alle
        </button>
        <button
          onClick={() => setFilterType('deposit')}
          className={`whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
            filterType === 'deposit'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg'
              : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
          }`}
        >
          Anzahlung
        </button>
        <button
          onClick={() => setFilterType('final')}
          className={`whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
            filterType === 'final'
              ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg'
              : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
          }`}
        >
          Schluss
        </button>
        <button
          onClick={() => setFilterType('credit')}
          className={`whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
            filterType === 'credit'
              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
              : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
          }`}
        >
          Storno
        </button>
      </div>

      {/* Status Filter */}
      <div className="glass scrollbar-hide flex items-center gap-2 overflow-x-auto rounded-2xl border border-white/50 bg-gradient-to-r from-white to-slate-50/30 p-2 shadow-lg">
        <button
          onClick={() => setFilterStatus('all')}
          className={`whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
            filterStatus === 'all'
              ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg'
              : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
          }`}
        >
          Alle Status
        </button>
        <button
          onClick={() => setFilterStatus('paid')}
          className={`whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
            filterStatus === 'paid'
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg'
              : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
          }`}
        >
          Bezahlt
        </button>
        <button
          onClick={() => setFilterStatus('sent')}
          className={`whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
            filterStatus === 'sent'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
              : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
          }`}
        >
          Gesendet
        </button>
      </div>
    </div>
  )
}
