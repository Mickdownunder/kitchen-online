import React from 'react'
import { Plus, Search, X } from 'lucide-react'
import type { SupplierInvoiceStats } from '@/hooks/useSupplierInvoicesData'
import {
  SUPPLIER_INVOICE_CATEGORY_LABELS,
  formatSupplierInvoiceCurrency,
} from '@/components/accounting/supplierInvoices.constants'

interface SupplierInvoicesHeaderProps {
  stats: SupplierInvoiceStats
  searchTerm: string
  setSearchTerm: (value: string) => void
  filterCategory: string | 'all'
  setFilterCategory: (value: string | 'all') => void
  filterStatus: 'all' | 'paid' | 'open' | 'overdue'
  setFilterStatus: (value: 'all' | 'paid' | 'open' | 'overdue') => void
  customCategories: { id: string; name: string }[]
  onOpenCreateForm: () => void
}

export function SupplierInvoicesHeader({
  stats,
  searchTerm,
  setSearchTerm,
  filterCategory,
  setFilterCategory,
  filterStatus,
  setFilterStatus,
  customCategories,
  onOpenCreateForm,
}: SupplierInvoicesHeaderProps) {
  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-900">Eingangsrechnungen</h3>
          <p className="text-sm text-slate-500">Lieferanten-Rechnungen für Vorsteuerabzug</p>
        </div>
        <button
          onClick={onOpenCreateForm}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-white shadow-lg transition-all hover:bg-amber-600"
        >
          <Plus className="h-5 w-5" />
          Neue Rechnung
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Gesamt</p>
          <p className="text-2xl font-black text-slate-900">
            {formatSupplierInvoiceCurrency(stats.total)} €
          </p>
          <p className="text-xs text-slate-500">{stats.count} Rechnungen</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Vorsteuer</p>
          <p className="text-2xl font-black text-emerald-700">
            {formatSupplierInvoiceCurrency(stats.totalTax)} €
          </p>
          <p className="text-xs text-emerald-600">Abzugsfähig</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Skonto gesamt</p>
          <p className="text-2xl font-black text-blue-700">
            {formatSupplierInvoiceCurrency(stats.totalSkonto)} €
          </p>
          <p className="text-xs text-blue-600">Für Steuerberater</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Offen</p>
          <p className="text-2xl font-black text-amber-700">
            {formatSupplierInvoiceCurrency(stats.openAmount)} €
          </p>
          <p className="text-xs text-amber-600">{stats.openCount} Rechnungen</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-red-600">Überfällig</p>
          <p className="text-2xl font-black text-red-700">
            {formatSupplierInvoiceCurrency(stats.overdueAmount)} €
          </p>
          <p className="text-xs text-red-600">{stats.overdueCount} Rechnungen</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
          <input
            type="text"
            placeholder="Suche nach Lieferant oder Rechnungsnummer..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 transform rounded p-1 hover:bg-slate-100"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="all">Alle Kategorien</option>
          {Object.entries(SUPPLIER_INVOICE_CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
          {customCategories.map(category => (
            <option key={category.id} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e =>
            setFilterStatus(e.target.value as 'all' | 'paid' | 'open' | 'overdue')
          }
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="all">Alle Status</option>
          <option value="paid">Bezahlt</option>
          <option value="open">Offen</option>
          <option value="overdue">Überfällig</option>
        </select>
      </div>
    </>
  )
}
