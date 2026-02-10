'use client'

import React from 'react'
import { ChevronDown, ChevronRight, ReceiptText, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { ListInvoice } from '@/hooks/useInvoiceFilters'
import type { CompanySettings } from '@/types'
import { InvoiceRow } from './InvoiceRow'

export type InvoiceSortField = 'invoiceNumber' | 'customer' | 'amount' | 'date'

const SortIcon = ({
  field,
  sortField,
  sortDirection,
}: {
  field: InvoiceSortField
  sortField: InvoiceSortField
  sortDirection: 'asc' | 'desc'
}) => {
  if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-slate-400" />
  return sortDirection === 'asc' ? (
    <ArrowUp className="h-3 w-3 text-amber-500" />
  ) : (
    <ArrowDown className="h-3 w-3 text-amber-500" />
  )
}

interface InvoiceTableProps {
  groupedInvoices: [string, ListInvoice[]][]
  expandedGroups: Set<string>
  toggleGroup: (groupKey: string) => void
  visibleRows: number
  companySettings: CompanySettings | null
  markingPaidId: string | null
  paidDateInput: string
  saving: boolean
  sendingReminder: string | null
  reminderDropdownOpen: string | null
  sortField: InvoiceSortField
  sortDirection: 'asc' | 'desc'
  onSort: (field: InvoiceSortField) => void
  onView: (invoice: ListInvoice) => void
  onPrint: (invoice: ListInvoice) => void
  onMarkAsPaid: (invoice: ListInvoice) => void
  onUnmarkAsPaid: (invoice: ListInvoice) => void
  onSetMarkingPaidId: (id: string | null) => void
  onSetPaidDateInput: (date: string) => void
  onSetReminderDropdownOpen: (id: string | null) => void
  onSendReminder: (invoice: ListInvoice, type: 'first' | 'second' | 'final') => void
  onCancelInvoice?: (invoice: ListInvoice) => void
  onLoadMore: () => void
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
  groupedInvoices,
  expandedGroups,
  toggleGroup,
  visibleRows,
  companySettings,
  markingPaidId,
  paidDateInput,
  saving,
  sendingReminder,
  reminderDropdownOpen,
  sortField,
  sortDirection,
  onSort,
  onView,
  onPrint,
  onMarkAsPaid,
  onUnmarkAsPaid,
  onSetMarkingPaidId,
  onSetPaidDateInput,
  onSetReminderDropdownOpen,
  onSendReminder,
  onCancelInvoice,
  onLoadMore,
}) => {
  if (groupedInvoices.length === 0) {
    return (
      <div className="px-8 py-20 text-center text-slate-400">
        <ReceiptText className="mx-auto mb-4 h-12 w-12 text-slate-300" />
        <p className="mb-2 text-lg font-bold">Keine Rechnungen gefunden</p>
        <p className="mt-2 text-sm text-slate-400">Passen Sie die Filter an</p>
      </div>
    )
  }

  const groupRenderCounts: Record<string, number> = {}
  let remainingRows = visibleRows
  for (const [groupKey, groupInvoices] of groupedInvoices) {
    if (!expandedGroups.has(groupKey)) {
      groupRenderCounts[groupKey] = 0
      continue
    }
    const count = Math.min(groupInvoices.length, Math.max(0, remainingRows))
    groupRenderCounts[groupKey] = count
    remainingRows -= count
  }

  return (
    <div className="divide-y divide-slate-100">
      {groupedInvoices.map(([groupKey, groupInvoices]) => {
        const [year, month] = groupKey.split('-')
        const monthName = new Date(2000, parseInt(month) - 1).toLocaleDateString('de-DE', {
          month: 'long',
        })
        const isExpanded = expandedGroups.has(groupKey)
        const totalAmount = groupInvoices.reduce((sum, inv) => sum + inv.amount, 0)
        const renderCount = groupRenderCounts[groupKey] ?? 0
        const groupInvoicesToRender = isExpanded ? groupInvoices.slice(0, renderCount) : []

        return (
          <div key={groupKey} className="bg-white/50">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(groupKey)}
              className="flex w-full items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50/50"
            >
              <div className="flex items-center gap-4">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                )}
                <div className="text-left">
                  <h3 className="text-lg font-black text-slate-900">
                    {monthName} {year}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {groupInvoices.length} Rechnung{groupInvoices.length !== 1 ? 'en' : ''} •{' '}
                    {totalAmount.toLocaleString('de-DE')} €
                  </p>
                </div>
              </div>
            </button>

            {/* Group Content */}
            {isExpanded && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-y-2 border-slate-200 bg-slate-50/50">
                    <tr>
                      <th
                        className="cursor-pointer px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100/50"
                        onClick={() => onSort('invoiceNumber')}
                      >
                        <div className="flex items-center gap-2">
                          Rechnungsnummer
                          <SortIcon field="invoiceNumber" sortField={sortField} sortDirection={sortDirection} />
                        </div>
                      </th>
                      <th
                        className="cursor-pointer px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100/50"
                        onClick={() => onSort('customer')}
                      >
                        <div className="flex items-center gap-2">
                          Kunde / Auftrag
                          <SortIcon field="customer" sortField={sortField} sortDirection={sortDirection} />
                        </div>
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                        Typ
                      </th>
                      <th
                        className="cursor-pointer px-6 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100/50"
                        onClick={() => onSort('amount')}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Betrag
                          <SortIcon field="amount" sortField={sortField} sortDirection={sortDirection} />
                        </div>
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                        Status
                      </th>
                      <th
                        className="cursor-pointer px-6 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100/50"
                        onClick={() => onSort('date')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          Datum
                          <SortIcon field="date" sortField={sortField} sortDirection={sortDirection} />
                        </div>
                      </th>
                      <th className="whitespace-nowrap px-3 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                        Fälligkeitsdatum
                      </th>
                      <th className="whitespace-nowrap px-3 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                        Mahnungen
                      </th>
                      <th className="whitespace-nowrap px-2 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupInvoicesToRender.map((invoice, idx) => (
                      <InvoiceRow
                        key={invoice.id}
                        invoice={invoice}
                        companySettings={companySettings}
                        markingPaidId={markingPaidId}
                        paidDateInput={paidDateInput}
                        saving={saving}
                        sendingReminder={sendingReminder}
                        reminderDropdownOpen={reminderDropdownOpen}
                        onView={() => onView(invoice)}
                        onPrint={() => onPrint(invoice)}
                        onMarkAsPaid={() => onMarkAsPaid(invoice)}
                        onUnmarkAsPaid={() => onUnmarkAsPaid(invoice)}
                        onSetMarkingPaidId={onSetMarkingPaidId}
                        onSetPaidDateInput={onSetPaidDateInput}
                        onSetReminderDropdownOpen={onSetReminderDropdownOpen}
                        onSendReminder={type => onSendReminder(invoice, type)}
                        onCancelInvoice={onCancelInvoice ? () => onCancelInvoice(invoice) : undefined}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                        rowSeparator
                      />
                    ))}
                  </tbody>
                </table>
                {groupInvoices.length > groupInvoicesToRender.length && (
                  <div className="border-t border-slate-100 px-6 py-4 text-center">
                    <button
                      onClick={onLoadMore}
                      className="text-sm font-bold text-slate-500 transition-colors hover:text-slate-700"
                    >
                      Noch{' '}
                      <span className="font-black text-slate-900">
                        {groupInvoices.length - groupInvoicesToRender.length}
                      </span>{' '}
                      weitere in {monthName} {year}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
