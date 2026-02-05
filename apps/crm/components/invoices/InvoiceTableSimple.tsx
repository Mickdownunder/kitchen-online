'use client'

import React from 'react'
import { ReceiptText, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
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

interface InvoiceTableSimpleProps {
  invoices: ListInvoice[]
  allInvoices: ListInvoice[]
  selectedMonth: number
  selectedYear: number
  currentPage: number
  totalPages: number
  itemsPerPage: number
  onPageChange: (page: number) => void
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
}

export const InvoiceTableSimple: React.FC<InvoiceTableSimpleProps> = ({
  invoices,
  allInvoices,
  selectedMonth,
  selectedYear,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
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
}) => {
  const monthName = new Date(2000, selectedMonth - 1).toLocaleDateString('de-DE', { month: 'long' })
  const totalAmount = allInvoices.reduce((sum, inv) => sum + inv.amount, 0)

  if (allInvoices.length === 0) {
    return (
      <div className="px-8 py-20 text-center text-slate-400">
        <ReceiptText className="mx-auto mb-4 h-12 w-12 text-slate-300" />
        <p className="mb-2 text-lg font-bold">Keine Rechnungen in {monthName}</p>
        <p className="mt-2 text-sm text-slate-400">Wählen Sie einen anderen Monat oder passen Sie die Filter an</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header mit Monatszusammenfassung */}
      <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              {monthName} {selectedYear}
            </h3>
            <p className="text-sm text-slate-500">
              {allInvoices.length} Rechnung{allInvoices.length !== 1 ? 'en' : ''} • {totalAmount.toLocaleString('de-DE')} €
            </p>
          </div>
          {totalPages > 1 && (
            <div className="text-sm text-slate-500">
              Seite {currentPage} von {totalPages}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b-2 border-slate-200 bg-slate-50/50">
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
            {invoices.map((invoice, idx) => (
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
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t-2 border-slate-200 bg-slate-50/80 px-6 py-4">
          <div className="text-sm text-slate-600">
            Zeige {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, allInvoices.length)} von {allInvoices.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ««
            </button>
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              «
            </button>
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`rounded-lg px-3 py-2 text-sm font-bold transition-all ${
                    currentPage === pageNum
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              »
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              »»
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
