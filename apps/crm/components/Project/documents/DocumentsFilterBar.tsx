import { Filter, Search } from 'lucide-react'
import type { DocumentType } from '../useProjectDocuments'

interface DocumentsFilterBarProps {
  searchTerm: string
  filter: DocumentType
  onSearchTermChange: (value: string) => void
  onFilterChange: (value: DocumentType) => void
}

export function DocumentsFilterBar({
  searchTerm,
  filter,
  onSearchTermChange,
  onFilterChange,
}: DocumentsFilterBarProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
        <input
          type="text"
          placeholder="Unterlagen durchsuchen..."
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-12 pr-4 text-sm outline-none focus:border-blue-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <Filter className="h-5 w-5 text-slate-400" />
        <select
          value={filter}
          onChange={(event) => onFilterChange(event.target.value as DocumentType)}
          className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
        >
          <option value="all">Alle Unterlagen</option>
          <option value="orders">Aufträge</option>
          <option value="invoices">Rechnungen</option>
          <option value="customer-delivery-notes">Kunden-Lieferscheine</option>
        </select>
      </div>
    </div>
  )
}
