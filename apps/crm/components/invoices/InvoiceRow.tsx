'use client'

import React from 'react'
import { FileText, Printer, Mail, Clock, CheckCircle2, Check, X } from 'lucide-react'
import type { ListInvoice } from '@/hooks/useInvoiceFilters'
import type { CompanySettings } from '@/types'
import {
  calculateDueDate,
  calculateOverdueDays,
  getReminderStatusText,
  getNextReminderType,
  canSendReminder,
} from '@/hooks/useInvoiceCalculations'

interface InvoiceRowProps {
  invoice: ListInvoice
  companySettings: CompanySettings | null
  markingPaidId: string | null
  paidDateInput: string
  saving: boolean
  sendingReminder: string | null
  reminderDropdownOpen: string | null
  onView: () => void
  onPrint: () => void
  onMarkAsPaid: () => void
  onUnmarkAsPaid: () => void
  onSetMarkingPaidId: (id: string | null) => void
  onSetPaidDateInput: (date: string) => void
  onSetReminderDropdownOpen: (id: string | null) => void
  onSendReminder: (type: 'first' | 'second' | 'final') => void
}

export const InvoiceRow: React.FC<InvoiceRowProps> = ({
  invoice,
  companySettings,
  markingPaidId,
  paidDateInput,
  saving,
  sendingReminder,
  reminderDropdownOpen,
  onView,
  onPrint,
  onMarkAsPaid,
  onUnmarkAsPaid,
  onSetMarkingPaidId,
  onSetPaidDateInput,
  onSetReminderDropdownOpen,
  onSendReminder,
}) => {
  // Neue Struktur: Daten direkt aus der Invoice
  const invoiceDate = invoice.invoiceDate || invoice.date
  const dueDate = invoice.dueDate
    ? invoice.dueDate
    : calculateDueDate(
        { date: invoiceDate, dueDate: invoice.dueDate },
        companySettings?.defaultPaymentTerms
      )
  const overdueDays = dueDate ? calculateOverdueDays(dueDate) : null

  const reminders = invoice.reminders || []
  const statusText = getReminderStatusText(reminders)
  const hasReminders = reminders.length > 0

  // Reminder dropdown logic
  const canShowReminderButton = !invoice.isPaid && overdueDays !== null && overdueDays >= 0

  const nextReminderType = getNextReminderType(reminders)
  const daysBetweenReminders =
    nextReminderType === 'first'
      ? companySettings?.reminderDaysBetweenFirst || 7
      : nextReminderType === 'second'
        ? companySettings?.reminderDaysBetweenSecond || 7
        : companySettings?.reminderDaysBetweenFinal || 7

  // Erstelle ein Objekt für canSendReminder
  const invoiceForReminder = {
    isPaid: invoice.isPaid,
    dueDate: dueDate || undefined,
    reminders,
  }
  const canSendFirst = canSendReminder(invoiceForReminder, 'first', daysBetweenReminders)
  const canSendSecond = canSendReminder(invoiceForReminder, 'second', daysBetweenReminders)
  const canSendFinal = canSendReminder(invoiceForReminder, 'final', daysBetweenReminders)

  const showReminderDropdown =
    canShowReminderButton && (canSendFirst || canSendSecond || canSendFinal)
  const isReminderOpen = reminderDropdownOpen === invoice.id
  const isReminding = sendingReminder === invoice.id

  return (
    <tr className="transition-colors hover:bg-slate-50/50">
      <td className="px-6 py-4">
        <p className="font-black text-slate-900">{invoice.invoiceNumber}</p>
      </td>
      <td className="px-6 py-4">
        <p className="font-black text-slate-900">{invoice.project.customerName}</p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          #{invoice.project.orderNumber}
        </p>
      </td>
      <td className="px-6 py-4 text-center">
        <span
          className={`rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest ${
            invoice.type === 'partial'
              ? 'bg-amber-50 text-amber-600'
              : 'bg-indigo-50 text-indigo-600'
          }`}
        >
          {invoice.type === 'partial' ? 'Anzahlung' : 'Schluss'}
        </span>
      </td>
      <td className="px-6 py-4 text-right font-black text-slate-900">
        {invoice.amount.toLocaleString('de-DE')} €
      </td>
      <td className="px-6 py-4 text-center">
        {markingPaidId === invoice.id ? (
          <div className="flex items-center justify-center gap-2">
            <input
              type="date"
              value={paidDateInput}
              onChange={e => onSetPaidDateInput(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={onMarkAsPaid}
              disabled={saving}
              className="rounded-lg bg-emerald-500 p-1.5 transition-all hover:bg-emerald-600"
              title="Bestätigen"
            >
              <Check className="h-3.5 w-3.5 text-white" />
            </button>
            <button
              onClick={() => onSetMarkingPaidId(null)}
              className="rounded-lg bg-slate-200 p-1.5 transition-all hover:bg-slate-300"
              title="Abbrechen"
            >
              <X className="h-3.5 w-3.5 text-slate-600" />
            </button>
          </div>
        ) : invoice.isPaid ? (
          <button
            onClick={onUnmarkAsPaid}
            disabled={saving}
            className="mx-auto flex w-fit cursor-pointer items-center justify-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 transition-all hover:bg-emerald-100"
            title="Klicken um Status zu ändern"
          >
            <CheckCircle2 className="h-3 w-3" />
            Bezahlt
            {invoice.paidDate && (
              <span className="ml-1 text-[9px] text-emerald-500">
                ({new Date(invoice.paidDate).toLocaleDateString('de-DE')})
              </span>
            )}
          </button>
        ) : (
          <button
            onClick={() => {
              onSetMarkingPaidId(invoice.id)
              onSetPaidDateInput(new Date().toISOString().split('T')[0])
            }}
            disabled={saving}
            className={`mx-auto flex w-fit cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
              invoice.status === 'sent'
                ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
            }`}
            title="Klicken um als bezahlt zu markieren"
          >
            <Clock className="h-3 w-3" />
            {invoice.status === 'sent' ? 'Offen' : 'Entwurf'}
          </button>
        )}
      </td>
      <td className="px-6 py-4 text-center font-medium text-slate-500">
        {new Date(invoiceDate).toLocaleDateString('de-DE')}
      </td>
      <td className="px-3 py-4 text-center">
        {!dueDate ? (
          <span className="text-xs text-slate-400">Nicht gesetzt</span>
        ) : (
          <div className="flex min-w-[90px] flex-col items-center gap-0.5">
            <span
              className={`text-xs font-medium ${
                overdueDays !== null && overdueDays > 0
                  ? 'text-red-600'
                  : overdueDays !== null && overdueDays <= 0 && overdueDays >= -7
                    ? 'text-amber-600'
                    : overdueDays !== null && overdueDays < -7
                      ? 'text-emerald-600'
                      : 'text-slate-500'
              }`}
            >
              {new Date(dueDate).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
              })}
            </span>
            {overdueDays !== null && overdueDays > 0 && (
              <span className="text-[9px] font-bold text-red-600">
                {overdueDays} Tag{overdueDays !== 1 ? 'e' : ''} überfällig
              </span>
            )}
            {overdueDays !== null && overdueDays <= 0 && overdueDays >= -7 && (
              <span className="text-[9px] font-medium text-amber-600">
                In {Math.abs(overdueDays)} Tag{Math.abs(overdueDays) !== 1 ? 'en' : ''}
              </span>
            )}
          </div>
        )}
      </td>
      <td className="px-3 py-4 text-center">
        <span
          className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-medium ${
            !hasReminders
              ? 'bg-slate-100 text-slate-500'
              : reminders[reminders.length - 1]?.type === 'first'
                ? 'bg-yellow-100 text-yellow-700'
                : reminders[reminders.length - 1]?.type === 'second'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-red-100 text-red-700'
          }`}
        >
          {statusText}
        </span>
      </td>
      <td className="px-2 py-4">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={onView}
            className="rounded-xl bg-slate-50 p-1.5 transition-all hover:bg-slate-100"
            title="Anzeigen"
          >
            <FileText className="h-3.5 w-3.5 text-slate-600" />
          </button>
          <button
            onClick={onPrint}
            className="rounded-xl bg-slate-50 p-1.5 transition-all hover:bg-slate-100"
            title="Drucken"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" />
          </button>
          {showReminderDropdown && (
            <div className="relative">
              <button
                onClick={() => onSetReminderDropdownOpen(isReminderOpen ? null : invoice.id)}
                disabled={isReminding}
                className="rounded-xl bg-amber-50 p-1.5 transition-all hover:bg-amber-100 disabled:opacity-50"
                title="Mahnung senden"
              >
                {isReminding ? (
                  <Clock className="h-3.5 w-3.5 animate-spin text-amber-600" />
                ) : (
                  <Mail className="h-3.5 w-3.5 text-amber-600" />
                )}
              </button>
              {isReminderOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white shadow-xl">
                  {canSendFirst && (
                    <button
                      onClick={() => onSendReminder('first')}
                      className="w-full border-b border-slate-100 px-4 py-2 text-left text-sm text-slate-700 transition-colors first:rounded-t-xl hover:bg-slate-50"
                    >
                      1. Mahnung senden
                    </button>
                  )}
                  {canSendSecond && (
                    <button
                      onClick={() => onSendReminder('second')}
                      className="w-full border-b border-slate-100 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      2. Mahnung senden
                    </button>
                  )}
                  {canSendFinal && (
                    <button
                      onClick={() => onSendReminder('final')}
                      className="w-full px-4 py-2 text-left text-sm font-semibold text-red-700 transition-colors last:rounded-b-xl hover:bg-red-50"
                    >
                      Letzte Mahnung senden
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}
