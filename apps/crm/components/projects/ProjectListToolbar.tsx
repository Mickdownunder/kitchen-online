import React from 'react'
import {
  Briefcase,
  Calendar,
  FileText,
  Loader2,
  Plus,
  Ruler,
  Search,
  ShoppingCart,
  Truck,
  UserPlus,
} from 'lucide-react'
import {
  ProjectListFilterType,
  ProjectListToolbarState,
  ProjectMonthMap,
} from './projectList.types'

interface ProjectListToolbarProps {
  isScanning: boolean
  state: ProjectListToolbarState
  availableYears: number[]
  leadsCount: number
  ordersCount: number
  projectsByMonth: ProjectMonthMap
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onAddProject: () => void
  onShowLeads: () => void
  onShowOrders: () => void
  onSearchTermChange: (value: string) => void
  onYearChange: (value: number | 'all') => void
  onMonthChange: (value: number | 'all') => void
  onFilterTypeChange: (value: ProjectListFilterType) => void
}

export function ProjectListToolbar({
  isScanning,
  state,
  availableYears,
  leadsCount,
  ordersCount,
  projectsByMonth,
  onFileUpload,
  onAddProject,
  onShowLeads,
  onShowOrders,
  onSearchTermChange,
  onYearChange,
  onMonthChange,
  onFilterTypeChange,
}: ProjectListToolbarProps) {
  return (
    <>
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h2 className="mb-2 text-5xl font-black tracking-tighter text-slate-900">Aufträge</h2>
          <p className="font-medium text-slate-500">Übersichtliche Verwaltung aller Projekte</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="group flex cursor-pointer items-center gap-3 rounded-2xl bg-slate-900 px-6 py-3 text-white shadow-lg transition-all hover:bg-slate-800 active:scale-95">
            {isScanning ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <FileText className="h-5 w-5 transition-transform group-hover:rotate-12" />
            )}
            <span className="text-xs font-black uppercase tracking-widest">
              {isScanning ? 'Verarbeite...' : 'KI-Scan'}
            </span>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={onFileUpload}
              disabled={isScanning}
            />
          </label>
          <button
            onClick={onAddProject}
            className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-900 shadow-xl shadow-amber-500/30 transition-all hover:from-amber-600 hover:to-amber-700 active:scale-95"
          >
            <Plus className="h-5 w-5" />
            Neuer Auftrag
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onShowLeads}
          className={`flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold transition-all ${
            state.activeTab === 'leads'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30'
              : 'bg-white text-slate-600 shadow-md hover:bg-slate-50'
          }`}
        >
          <UserPlus className="h-5 w-5" />
          Leads
          {leadsCount > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-black ${
                state.activeTab === 'leads' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {leadsCount}
            </span>
          )}
        </button>
        <button
          onClick={onShowOrders}
          className={`flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold transition-all ${
            state.activeTab === 'orders'
              ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg'
              : 'bg-white text-slate-600 shadow-md hover:bg-slate-50'
          }`}
        >
          <Briefcase className="h-5 w-5" />
          Aufträge
          {ordersCount > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-black ${
                state.activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {ordersCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="glass flex flex-1 items-center rounded-2xl border border-white/50 bg-gradient-to-r from-white to-slate-50/30 p-2 shadow-lg">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Suche nach Kunde oder Auftragsnummer..."
              className="w-full border-none bg-transparent py-3 pl-12 pr-4 text-sm font-medium outline-none transition-colors placeholder:text-slate-400 focus:placeholder:text-slate-300"
              value={state.searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
            />
          </div>
        </div>

        {state.activeTab === 'orders' && (
          <div className="glass flex items-center gap-2 rounded-2xl border border-white/50 bg-gradient-to-r from-white to-slate-50/30 p-2 shadow-lg">
            <Calendar className="h-4 w-4 text-slate-400" />
            <select
              value={state.selectedYear}
              onChange={(event) =>
                onYearChange(event.target.value === 'all' ? 'all' : parseInt(event.target.value, 10))
              }
              className="cursor-pointer border-none bg-transparent px-3 py-2 text-sm font-bold text-slate-900 outline-none"
            >
              <option value="all">Alle Jahre</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        )}

        {state.activeTab === 'orders' && (
          <div className="glass scrollbar-hide flex items-center gap-2 overflow-x-auto rounded-2xl border border-white/50 bg-gradient-to-r from-white to-slate-50/30 p-2 shadow-lg">
            <button
              onClick={() => onFilterTypeChange('all')}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${state.filterType === 'all' ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'}`}
            >
              Alle
            </button>
            <button
              onClick={() => onFilterTypeChange('measurement')}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${state.filterType === 'measurement' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'}`}
            >
              <Ruler className="h-3.5 w-3.5" /> Zu Ausmessen
            </button>
            <button
              onClick={() => onFilterTypeChange('order')}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${state.filterType === 'order' ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'}`}
            >
              <ShoppingCart className="h-3.5 w-3.5" /> Zu Bestellen
            </button>
            <button
              onClick={() => onFilterTypeChange('installation')}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${state.filterType === 'installation' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'}`}
            >
              <Truck className="h-3.5 w-3.5" /> Zu Terminieren
            </button>
          </div>
        )}
      </div>

      {state.activeTab === 'orders' && state.selectedYear !== 'all' && (
        <div className="glass grid grid-cols-[auto_1fr] gap-2 rounded-2xl border border-white/50 bg-gradient-to-r from-white to-slate-50/30 p-2 shadow-lg">
          <button
            onClick={() => onMonthChange('all')}
            className={`flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              state.selectedMonth === 'all'
                ? 'bg-slate-900 text-white shadow-lg'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Alle
          </button>
          <div className="grid grid-cols-6 gap-0.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((monthNum) => {
              const monthProjects = projectsByMonth.get(monthNum) || []
              const count = monthProjects.length
              const isSelected = typeof state.selectedMonth === 'number' && state.selectedMonth === monthNum
              const monthName = new Date(2000, monthNum - 1).toLocaleDateString('de-DE', {
                month: 'short',
              })
              return (
                <button
                  key={monthNum}
                  onClick={() => onMonthChange(monthNum)}
                  className={`flex flex-col items-center rounded-lg px-2 py-1.5 transition-all ${
                    isSelected ? 'bg-amber-500 shadow-lg' : 'hover:bg-slate-100'
                  }`}
                >
                  <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {monthName}
                  </span>
                  <span className={`text-[10px] font-bold ${isSelected ? 'text-white/90' : 'text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
