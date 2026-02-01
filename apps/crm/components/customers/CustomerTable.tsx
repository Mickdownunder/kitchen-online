'use client'

import React from 'react'
import { UserCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { Customer } from '@/types'
import { CustomerRow } from './CustomerRow'

export type CustomerSortField = 'name' | 'company' | 'city' | 'email'
export type SortDirection = 'asc' | 'desc'

interface CustomerTableProps {
  customers: Customer[]
  searchTerm: string
  sortField: CustomerSortField
  sortDirection: SortDirection
  onSelectCustomer: (customer: Customer) => void
  onEditCustomer: (customer: Customer) => void
  onDeleteCustomer: (customer: Customer) => void
  onSort: (field: CustomerSortField) => void
}

const SortIcon = ({
  field,
  sortField,
  sortDirection,
}: {
  field: CustomerSortField
  sortField: CustomerSortField
  sortDirection: SortDirection
}) => {
  if (sortField !== field) {
    return <ArrowUpDown className="h-3 w-3 text-slate-400" />
  }
  return sortDirection === 'asc' ? (
    <ArrowUp className="h-3 w-3 text-amber-500" />
  ) : (
    <ArrowDown className="h-3 w-3 text-amber-500" />
  )
}

export const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  searchTerm,
  sortField,
  sortDirection,
  onSelectCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onSort,
}) => {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th
                className="cursor-pointer px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100"
                onClick={() => onSort('name')}
              >
                <div className="flex items-center gap-2">
                  Name
                  <SortIcon field="name" sortField={sortField} sortDirection={sortDirection} />
                </div>
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100"
                onClick={() => onSort('company')}
              >
                <div className="flex items-center gap-2">
                  Firma
                  <SortIcon field="company" sortField={sortField} sortDirection={sortDirection} />
                </div>
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100"
                onClick={() => onSort('city')}
              >
                <div className="flex items-center gap-2">
                  Ort
                  <SortIcon field="city" sortField={sortField} sortDirection={sortDirection} />
                </div>
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100"
                onClick={() => onSort('email')}
              >
                <div className="flex items-center gap-2">
                  E-Mail
                  <SortIcon field="email" sortField={sortField} sortDirection={sortDirection} />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                Telefon
              </th>
              <th className="w-28 px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                  <UserCircle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  <p className="text-sm font-bold">Keine Kunden gefunden</p>
                  <p className="mt-1 text-xs">
                    {searchTerm
                      ? 'Versuchen Sie andere Suchbegriffe'
                      : 'Erstellen Sie den ersten Kunden'}
                  </p>
                </td>
              </tr>
            ) : (
              customers.map(customer => (
                <CustomerRow
                  key={customer.id}
                  customer={customer}
                  searchTerm={searchTerm}
                  onSelect={() => onSelectCustomer(customer)}
                  onEdit={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    onEditCustomer(customer)
                  }}
                  onDelete={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (confirm('Kunde wirklich löschen?')) {
                      onDeleteCustomer(customer)
                    }
                  }}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
