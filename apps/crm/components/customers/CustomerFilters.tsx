'use client'

import React from 'react'
import { Search, X } from 'lucide-react'

interface CustomerFiltersProps {
  searchTerm: string
  setSearchTerm: (value: string) => void
}

export const CustomerFilters: React.FC<CustomerFiltersProps> = ({
  searchTerm,
  setSearchTerm,
}) => {
  return (
    <div className="flex gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
        <input
          type="text"
          placeholder="Kunde suchen (Name, Firma, E-Mail, Ort)..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
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
    </div>
  )
}
