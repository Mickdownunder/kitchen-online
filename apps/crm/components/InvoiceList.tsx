'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { CustomerProject, CompanySettings, Invoice as DBInvoice } from '@/types'
import InvoiceView from './InvoiceView'
import { getInvoicesWithProject, markInvoicePaid, markInvoiceUnpaid } from '@/lib/supabase/services'
import { useInvoiceFilters, type ListInvoice, toListInvoice } from '@/hooks/useInvoiceFilters'
import { useGroupedInvoices } from '@/hooks/useGroupedInvoices'
import { PaymentReminderBanner } from './PaymentReminderBanner'
import { DueSecondPaymentsList } from './DueSecondPaymentsList'
import { RemindersTab } from './RemindersTab'
import { getCompanySettings } from '@/lib/supabase/services/company'
import { InvoiceFilters } from './invoices/InvoiceFilters'
import { InvoiceStatsCards } from './invoices/InvoiceStatsCards'
import { InvoiceTable } from './invoices/InvoiceTable'
import { useToast } from '@/components/providers/ToastProvider'
import { logger } from '@/lib/utils/logger'

interface InvoiceListProps {
  projects: CustomerProject[]
  onProjectUpdate?: () => void
}

const InvoiceList: React.FC<InvoiceListProps> = ({ projects, onProjectUpdate }) => {
  const { success, error: showError } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'deposit' | 'final'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'sent'>('all')
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(new Date().getMonth() + 1)
  const [selectedInvoice, setSelectedInvoice] = useState<ListInvoice | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'invoice'>('list')
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null)
  const [paidDateInput, setPaidDateInput] = useState<string>(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [visibleRows, setVisibleRows] = useState(200)
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [reminderDropdownOpen, setReminderDropdownOpen] = useState<string | null>(null)
  const [sendingReminder, setSendingReminder] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'invoices' | 'reminders'>('invoices')
  const [showDuePayments, setShowDuePayments] = useState(false)
  const [dbInvoices, setDbInvoices] = useState<DBInvoice[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(true)

  // Lade Rechnungen aus der Datenbank
  // silent=true: Kein Lade-Spinner, Liste bleibt sichtbar (für Live-Updates bei Status-Änderung)
  const loadInvoices = useCallback(async (silent = false) => {
    if (!silent) setLoadingInvoices(true)
    try {
      const invoices = await getInvoicesWithProject()
      setDbInvoices(invoices)
    } catch (error) {
      logger.error('Error loading invoices', { component: 'InvoiceList' }, error as Error)
    } finally {
      if (!silent) setLoadingInvoices(false)
    }
  }, [])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  useEffect(() => {
    getCompanySettings().then(settings => setCompanySettings(settings))
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (reminderDropdownOpen && !(e.target as HTMLElement).closest('.relative')) {
        setReminderDropdownOpen(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [reminderDropdownOpen])

  useEffect(() => {
    setVisibleRows(200)
  }, [searchTerm, filterType, filterStatus, selectedYear, selectedMonth])

  // Konvertiere DB-Invoices zu ListInvoices mit Projekt-Daten
  const invoices = useMemo(() => {
    // Erstelle eine Map von projectId zu project für schnellen Zugriff
    const projectMap = new Map(projects.map(p => [p.id, p]))

    return dbInvoices
      .map(invoice => {
        const project = invoice.project || projectMap.get(invoice.projectId)
        if (!project) return null
        return toListInvoice(invoice, project as CustomerProject)
      })
      .filter((inv): inv is ListInvoice => inv !== null)
      .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())
  }, [dbInvoices, projects])

  // Update selectedInvoice when invoices are reloaded (e.g., after status change)
  useEffect(() => {
    if (selectedInvoice) {
      const updatedInvoice = invoices.find(inv => inv.id === selectedInvoice.id)
      if (updatedInvoice && (
        updatedInvoice.isPaid !== selectedInvoice.isPaid ||
        updatedInvoice.paidDate !== selectedInvoice.paidDate
      )) {
        setSelectedInvoice(updatedInvoice)
      }
    }
  }, [invoices, selectedInvoice])

  const handleMarkAsPaid = async (invoice: ListInvoice) => {
    setSaving(true)
    try {
      await markInvoicePaid(invoice.id, paidDateInput)
      setMarkingPaidId(null)
      // Silent reload: Liste bleibt sichtbar, nur Daten aktualisieren
      await loadInvoices(true)
      if (onProjectUpdate) onProjectUpdate()
    } catch (error) {
      logger.error('Error marking as paid', { component: 'InvoiceList' }, error as Error)
      showError('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleUnmarkAsPaid = async (invoice: ListInvoice) => {
    setSaving(true)
    try {
      await markInvoiceUnpaid(invoice.id)
      // Silent reload: Liste bleibt sichtbar, nur Daten aktualisieren
      await loadInvoices(true)
      if (onProjectUpdate) onProjectUpdate()
    } catch (error) {
      logger.error('Error unmarking as paid', { component: 'InvoiceList' }, error as Error)
      showError('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const { filteredInvoices, availableYears } = useInvoiceFilters({
    invoices,
    searchTerm,
    filterType,
    filterStatus,
    selectedYear,
    selectedMonth,
  })

  const { groupedInvoices, expandedGroups, toggleGroup } = useGroupedInvoices(filteredInvoices)

  const stats = useMemo(() => {
    const total = filteredInvoices.reduce((acc, inv) => acc + inv.amount, 0)
    const paid = filteredInvoices
      .filter(inv => inv.isPaid)
      .reduce((acc, inv) => acc + inv.amount, 0)
    const outstanding = total - paid
    // 'partial' in neuer DB-Struktur = 'deposit' in UI
    const depositCount = filteredInvoices.filter(inv => inv.type === 'partial').length
    const finalCount = filteredInvoices.filter(inv => inv.type === 'final').length
    const invoicedRevenue = filteredInvoices
      .filter(inv => inv.type === 'final')
      .reduce((acc, inv) => acc + inv.amount, 0)
    const depositRevenue = filteredInvoices
      .filter(inv => inv.type === 'partial')
      .reduce((acc, inv) => acc + inv.amount, 0)

    return {
      total,
      paid,
      outstanding,
      depositCount,
      finalCount,
      totalCount: filteredInvoices.length,
      invoicedRevenue,
      depositRevenue,
    }
  }, [filteredInvoices])

  const handleViewInvoice = (invoice: ListInvoice) => {
    setSelectedInvoice(invoice)
    setViewMode('invoice')
  }

  const handlePrintInvoice = (invoice: ListInvoice) => {
    setSelectedInvoice(invoice)
    setViewMode('invoice')
    setTimeout(() => window.print(), 500)
  }

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

      success(
        `${reminderType === 'first' ? '1.' : reminderType === 'second' ? '2.' : 'Letzte'} Mahnung erfolgreich gesendet!`
      )
      if (onProjectUpdate) onProjectUpdate()
    } catch (error: unknown) {
      logger.error('Error sending reminder', { component: 'InvoiceList' }, error as Error)
      showError(
        `Fehler beim Senden der Mahnung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      )
    } finally {
      setSendingReminder(null)
    }
  }

  if (viewMode === 'invoice' && selectedInvoice) {
    return (
      <InvoiceView
        invoice={selectedInvoice}
        onBack={() => setViewMode('list')}
        onPrint={() => handlePrintInvoice(selectedInvoice)}
      />
    )
  }

  // Loading state
  if (loadingInvoices) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
      </div>
    )
  }

  if (activeTab === 'reminders') {
    return (
      <div className="animate-in slide-in-from-bottom-4 space-y-6 duration-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="mb-2 text-5xl font-black tracking-tighter text-slate-900">Rechnungen</h2>
            <p className="font-medium text-slate-500">
              Übersicht aller Anzahlungs- und Schlussrechnungen
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-inner">
          <button
            onClick={() => setActiveTab('invoices')}
            className="rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all hover:text-slate-900"
          >
            Rechnungen
          </button>
          <button
            onClick={() => setActiveTab('reminders')}
            className="rounded-xl bg-amber-500 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all"
          >
            Mahnungen
          </button>
        </div>

        <RemindersTab projects={projects} onProjectUpdate={onProjectUpdate} />
      </div>
    )
  }

  return (
    <div className="animate-in slide-in-from-bottom-4 space-y-6 duration-700">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h2 className="mb-2 text-5xl font-black tracking-tighter text-slate-900">Rechnungen</h2>
          <p className="font-medium text-slate-500">
            Übersicht aller Anzahlungs- und Schlussrechnungen
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-inner">
        <button
          onClick={() => setActiveTab('invoices')}
          className="rounded-xl bg-slate-900 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all"
        >
          Rechnungen
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className="rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all hover:text-slate-900"
        >
          Mahnungen
        </button>
      </div>

      <PaymentReminderBanner
        projects={projects}
        onViewClick={() => setShowDuePayments(!showDuePayments)}
      />

      {showDuePayments && (
        <DueSecondPaymentsList projects={projects} onProjectUpdate={onProjectUpdate} />
      )}

      {filteredInvoices.length > 0 && <InvoiceStatsCards stats={stats} />}

      <InvoiceFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterType={filterType}
        setFilterType={setFilterType}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        availableYears={availableYears}
      />

      <div className="glass overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-br from-white to-slate-50/30 shadow-xl">
        <InvoiceTable
          groupedInvoices={groupedInvoices}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
          visibleRows={visibleRows}
          companySettings={companySettings}
          markingPaidId={markingPaidId}
          paidDateInput={paidDateInput}
          saving={saving}
          sendingReminder={sendingReminder}
          reminderDropdownOpen={reminderDropdownOpen}
          onView={handleViewInvoice}
          onPrint={handlePrintInvoice}
          onMarkAsPaid={handleMarkAsPaid}
          onUnmarkAsPaid={handleUnmarkAsPaid}
          onSetMarkingPaidId={setMarkingPaidId}
          onSetPaidDateInput={setPaidDateInput}
          onSetReminderDropdownOpen={setReminderDropdownOpen}
          onSendReminder={handleSendReminder}
          onLoadMore={() => setVisibleRows(v => v + 400)}
        />
      </div>

      {filteredInvoices.length > visibleRows && (
        <div className="flex items-center justify-center">
          <button
            onClick={() => setVisibleRows(v => v + 400)}
            className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-900 shadow-sm transition-all hover:shadow-md"
          >
            Mehr Rechnungen laden ({Math.min(400, filteredInvoices.length - visibleRows)} weitere)
          </button>
        </div>
      )}
    </div>
  )
}

export default InvoiceList
