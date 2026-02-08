'use client'

import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { AlertCircle, Filter, Send } from 'lucide-react'
import { CompanySettings, Invoice, CustomerProject } from '@/types'
import {
  calculateDueDate,
  calculateOverdueDays,
  getNextReminderType,
  canSendReminder,
} from '@/hooks/useInvoiceCalculations'
import { ListInvoice, toListInvoice } from '@/hooks/useInvoiceFilters'
import { getCompanySettings } from '@/lib/supabase/services/company'
import { getInvoicesWithProject } from '@/lib/supabase/services/invoices'
import { logger } from '@/lib/utils/logger'

interface RemindersTabProps {
  projects: CustomerProject[]
  onProjectUpdate?: () => void
}

export function RemindersTab({ projects, onProjectUpdate }: RemindersTabProps) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'due' | 'overdue'>('all')
  const [filterReminderType, setFilterReminderType] = useState<
    'all' | 'none' | 'first' | 'second' | 'final'
  >('all')
  const [reminderDropdownOpen, setReminderDropdownOpen] = useState<string | null>(null)
  const [sendingReminder, setSendingReminder] = useState<string | null>(null)
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [dbInvoices, setDbInvoices] = useState<Invoice[]>([])

  // Lade Rechnungen aus der neuen invoices-Tabelle
  const loadInvoices = useCallback(async () => {
    const result = await getInvoicesWithProject()
    if (result.ok) {
      setDbInvoices(result.data)
    }
  }, [])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  // Lade Company Settings
  useEffect(() => {
    getCompanySettings().then(settings => {
      setCompanySettings(settings)
    })
  }, [])

  // Konvertiere DB-Invoices zu ListInvoices
  const invoices = useMemo(() => {
    const projectMap = new Map(projects.map(p => [p.id, p]))

    return dbInvoices
      .map(invoice => {
        const project = invoice.project || projectMap.get(invoice.projectId)
        if (!project) return null
        return toListInvoice(invoice, project as CustomerProject)
      })
      .filter((inv): inv is ListInvoice => inv !== null)
  }, [dbInvoices, projects])

  // Filtere nach fälligen/überfälligen Rechnungen
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      // Nur unbezahlte Rechnungen
      if (invoice.isPaid) return false

      // Berechne Fälligkeitsdatum direkt aus der Invoice
      const dueDate = invoice.dueDate
        ? invoice.dueDate
        : calculateDueDate(
            { date: invoice.invoiceDate, dueDate: invoice.dueDate },
            companySettings?.defaultPaymentTerms
          )
      const overdueDays = dueDate ? calculateOverdueDays(dueDate) : null

      // Filter nach Status
      if (filterStatus === 'due') {
        // Nur fällig (heute oder in den nächsten 7 Tagen)
        if (overdueDays === null || overdueDays < 0 || overdueDays > 7) return false
      } else if (filterStatus === 'overdue') {
        // Nur überfällig
        if (overdueDays === null || overdueDays <= 0) return false
      }

      // Filter nach Mahnungsstufe
      if (filterReminderType !== 'all') {
        const reminders = invoice.reminders || []
        const lastReminder = reminders.length > 0 ? reminders[reminders.length - 1] : null

        if (filterReminderType === 'none' && lastReminder) return false
        if (filterReminderType === 'first' && lastReminder?.type !== 'first') return false
        if (filterReminderType === 'second' && lastReminder?.type !== 'second') return false
        if (filterReminderType === 'final' && lastReminder?.type !== 'final') return false
      }

      return true
    })
  }, [invoices, filterStatus, filterReminderType, companySettings])

  // Sortiere nach Überfälligkeit (meiste Tage zuerst)
  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      const aDueDate =
        a.dueDate ||
        calculateDueDate(
          { date: a.invoiceDate, dueDate: a.dueDate },
          companySettings?.defaultPaymentTerms
        )
      const bDueDate =
        b.dueDate ||
        calculateDueDate(
          { date: b.invoiceDate, dueDate: b.dueDate },
          companySettings?.defaultPaymentTerms
        )

      const aOverdue = aDueDate ? calculateOverdueDays(aDueDate) || 0 : 0
      const bOverdue = bDueDate ? calculateOverdueDays(bDueDate) || 0 : 0

      return bOverdue - aOverdue // Meiste Tage zuerst
    })
  }, [filteredInvoices, companySettings])

  const handleSendReminder = async (
    invoice: ListInvoice,
    reminderType: 'first' | 'second' | 'final'
  ) => {
    setSendingReminder(invoice.id)
    setReminderDropdownOpen(null)

    try {
      // Verwende die Invoice-ID direkt (neue Struktur)
      const response = await fetch('/api/reminders/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: invoice.projectId,
          invoiceId: invoice.id,
          reminderType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Senden der Mahnung')
      }

      alert(
        `✅ ${reminderType === 'first' ? '1.' : reminderType === 'second' ? '2.' : 'Letzte'} Mahnung erfolgreich gesendet!`
      )
      if (onProjectUpdate) onProjectUpdate()
    } catch (error: unknown) {
      logger.error('Error sending reminder', { component: 'RemindersTab' }, error instanceof Error ? error : new Error(String(error)))
      alert(
        `Fehler beim Senden der Mahnung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      )
    } finally {
      setSendingReminder(null)
    }
  }

  // Schließe Dropdown wenn außerhalb geklickt wird
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (reminderDropdownOpen && !(e.target as HTMLElement).closest('.relative')) {
        setReminderDropdownOpen(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [reminderDropdownOpen])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-slate-900">Mahnungen</h2>
          <p className="font-medium text-slate-500">
            Übersicht aller fälligen und überfälligen Rechnungen
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <Filter className="h-4 w-4 text-slate-400" />
          <button
            onClick={() => setFilterStatus('all')}
            className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFilterStatus('due')}
            className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
              filterStatus === 'due'
                ? 'bg-amber-500 text-white'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Fällig
          </button>
          <button
            onClick={() => setFilterStatus('overdue')}
            className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
              filterStatus === 'overdue'
                ? 'bg-red-500 text-white'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Überfällig
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <span className="px-2 text-xs font-semibold text-slate-500">Mahnungsstufe:</span>
          <button
            onClick={() => setFilterReminderType('all')}
            className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
              filterReminderType === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFilterReminderType('none')}
            className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
              filterReminderType === 'none'
                ? 'bg-slate-100 text-slate-700'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Keine
          </button>
          <button
            onClick={() => setFilterReminderType('first')}
            className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
              filterReminderType === 'first'
                ? 'bg-yellow-500 text-white'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            1. Mahnung
          </button>
          <button
            onClick={() => setFilterReminderType('second')}
            className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
              filterReminderType === 'second'
                ? 'bg-orange-500 text-white'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            2. Mahnung
          </button>
          <button
            onClick={() => setFilterReminderType('final')}
            className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
              filterReminderType === 'final'
                ? 'bg-red-500 text-white'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Letzte
          </button>
        </div>
      </div>

      {/* Tabelle */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-xl">
        {sortedInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-4 text-lg font-semibold text-slate-600">
              Keine fälligen Mahnungen gefunden
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Alle Rechnungen sind bezahlt oder noch nicht fällig.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                    Rechnungsnummer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                    Kunde / Auftrag
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-widest text-slate-500">
                    Betrag
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                    Fälligkeitsdatum
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                    Überfällig
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                    Letzte Mahnung
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                    Nächste Mahnung
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedInvoices.map(invoice => {
                  // Daten direkt aus der Invoice (neue Struktur)
                  const dueDate = invoice.dueDate
                    ? invoice.dueDate
                    : calculateDueDate(
                        { date: invoice.invoiceDate, dueDate: invoice.dueDate },
                        companySettings?.defaultPaymentTerms
                      )
                  const overdueDays = dueDate ? calculateOverdueDays(dueDate) : null
                  const reminders = invoice.reminders || []
                  const lastReminder = reminders.length > 0 ? reminders[reminders.length - 1] : null
                  const nextReminderType = getNextReminderType(reminders)
                  const daysBetweenReminders =
                    nextReminderType === 'first'
                      ? companySettings?.reminderDaysBetweenFirst || 7
                      : nextReminderType === 'second'
                        ? companySettings?.reminderDaysBetweenSecond || 7
                        : companySettings?.reminderDaysBetweenFinal || 7

                  const invoiceForReminder = {
                    isPaid: invoice.isPaid,
                    dueDate: dueDate || undefined,
                    reminders,
                  }
                  const canSendFirst = canSendReminder(
                    invoiceForReminder,
                    'first',
                    daysBetweenReminders
                  )
                  const canSendSecond = canSendReminder(
                    invoiceForReminder,
                    'second',
                    daysBetweenReminders
                  )
                  const canSendFinal = canSendReminder(
                    invoiceForReminder,
                    'final',
                    daysBetweenReminders
                  )

                  return (
                    <tr key={invoice.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-900">{invoice.invoiceNumber}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-900">{invoice.project.customerName}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          #{invoice.project.orderNumber}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-900">
                        {invoice.amount.toLocaleString('de-DE')} €
                      </td>
                      <td className="px-6 py-4 text-center">
                        {dueDate ? (
                          <span className="text-sm font-medium text-slate-700">
                            {new Date(dueDate).toLocaleDateString('de-DE')}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Nicht gesetzt</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {overdueDays !== null && overdueDays > 0 ? (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">
                            {overdueDays} Tag{overdueDays !== 1 ? 'e' : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {lastReminder ? (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              lastReminder.type === 'first'
                                ? 'bg-yellow-100 text-yellow-700'
                                : lastReminder.type === 'second'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {lastReminder.type === 'first'
                              ? '1. Mahnung'
                              : lastReminder.type === 'second'
                                ? '2. Mahnung'
                                : 'Letzte Mahnung'}{' '}
                            ({new Date(lastReminder.sentAt).toLocaleDateString('de-DE')})
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Keine</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {nextReminderType ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                            {nextReminderType === 'first'
                              ? '1. Mahnung'
                              : nextReminderType === 'second'
                                ? '2. Mahnung'
                                : 'Letzte Mahnung'}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {canSendFirst || canSendSecond || canSendFinal ? (
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setReminderDropdownOpen(
                                    reminderDropdownOpen === invoice.id ? null : invoice.id
                                  )
                                }
                                disabled={sendingReminder === invoice.id}
                                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-amber-600 disabled:opacity-50"
                              >
                                {sendingReminder === invoice.id ? (
                                  <span className="flex items-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Sende...
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-2">
                                    <Send className="h-4 w-4" />
                                    Mahnung senden
                                  </span>
                                )}
                              </button>
                              {reminderDropdownOpen === invoice.id && (
                                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white shadow-xl">
                                  {canSendFirst && (
                                    <button
                                      onClick={() => handleSendReminder(invoice, 'first')}
                                      className="w-full border-b border-slate-100 px-4 py-2 text-left text-sm text-slate-700 transition-colors first:rounded-t-xl hover:bg-slate-50"
                                    >
                                      1. Mahnung senden
                                    </button>
                                  )}
                                  {canSendSecond && (
                                    <button
                                      onClick={() => handleSendReminder(invoice, 'second')}
                                      className="w-full border-b border-slate-100 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                                    >
                                      2. Mahnung senden
                                    </button>
                                  )}
                                  {canSendFinal && (
                                    <button
                                      onClick={() => handleSendReminder(invoice, 'final')}
                                      className="w-full px-4 py-2 text-left text-sm font-semibold text-red-700 transition-colors last:rounded-b-xl hover:bg-red-50"
                                    >
                                      Letzte Mahnung senden
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Alle gesendet</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
