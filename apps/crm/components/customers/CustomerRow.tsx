'use client'

import React from 'react'
import { Edit2, Trash2, Briefcase } from 'lucide-react'
import type { Customer } from '@/types'

interface CustomerRowProps {
  customer: Customer
  searchTerm: string
  onSelect: () => void
  onEdit: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}

const highlightText = (text: string, search: string) => {
  if (!search.trim()) return text
  const parts = String(text).split(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === search.toLowerCase() ? (
          <mark key={i} className="bg-amber-200 font-bold text-slate-900">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

export const CustomerRow: React.FC<CustomerRowProps> = ({
  customer,
  searchTerm,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const displayName = `${customer.salutation || ''} ${customer.firstName} ${customer.lastName}`.trim()
  const city = customer.address?.city ? `${customer.address.postalCode} ${customer.address.city}` : '–'

  const shortId = customer.id?.slice(0, 8) || '–'

  return (
    <tr
      onClick={onSelect}
      className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80"
    >
      <td className="px-4 py-3 font-mono text-xs text-slate-500">
        {shortId}
      </td>
      <td className="px-4 py-3">
        <span className="font-bold text-slate-900">
          {searchTerm ? highlightText(displayName, searchTerm) : displayName}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-600">
        {customer.companyName ? (
          <span className="flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {searchTerm ? highlightText(customer.companyName, searchTerm) : customer.companyName}
          </span>
        ) : (
          <span className="text-slate-400">–</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {searchTerm && city !== '–' ? highlightText(city, searchTerm) : city}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {customer.contact?.email ? (
          searchTerm ? highlightText(customer.contact.email, searchTerm) : customer.contact.email
        ) : (
          '–'
        )}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {customer.contact?.phone || '–'}
      </td>
      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={onEdit}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            title="Bearbeiten"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Löschen"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}
