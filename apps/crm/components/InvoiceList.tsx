'use client'

import React from 'react'
import { CustomerProject } from '@/types'
import InvoiceView from './InvoiceView'
import { type ListInvoice } from '@/hooks/useInvoiceFilters'
import { PaymentReminderBanner } from './PaymentReminderBanner'
import { DueSecondPaymentsList } from './DueSecondPaymentsList'
import { RemindersTab } from './RemindersTab'
import { MissingInvoicesList } from './MissingInvoicesList'
import { useApp } from '@/app/providers'
import { useInvoiceListData } from '@/hooks/useInvoiceListData'
import { InvoiceFilters } from './invoices/InvoiceFilters'
import { InvoiceStatsCards } from './invoices/InvoiceStatsCards'
import { InvoiceTable } from './invoices/InvoiceTable'
import { InvoiceTableSimple } from './invoices/InvoiceTableSimple'
import {
  ReminderPreviewModal,
} from './invoices/ReminderPreviewModal'
import { CreditNoteModal } from './invoices/CreditNoteModal'
import { useToast } from '@/components/providers/ToastProvider'
import { OpenProjectsOverview } from '@/components/OpenProjectsOverview'
import { ClipboardList } from 'lucide-react'
import { useInvoiceForm } from '@/hooks/useInvoiceForm'

interface InvoiceListProps {
  projects: CustomerProject[]
  onProjectUpdate?: () => void
}

const InvoiceList: React.FC<InvoiceListProps> = ({ projects, onProjectUpdate }) => {
  const { success, error: showError } = useToast()
  const { customerDeliveryNotes } = useApp()
  const {
    sortField,
    sortDirection,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    selectedInvoice,
    setSelectedInvoice,
    viewMode,
    setViewMode,
    markingPaidId,
    setMarkingPaidId,
    paidDateInput,
    setPaidDateInput,
    saving,
    visibleRows,
    setVisibleRows,
    companySettings,
    activeTab,
    setActiveTab,
    showDuePayments,
    setShowDuePayments,
    showOverview,
    setShowOverview,
    dbInvoices,
    loadingInvoices,
    filteredInvoices,
    availableYears,
    groupedInvoices,
    expandedGroups,
    toggleGroup,
    invoicesByMonth,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    totalPages,
    paginatedInvoices,
    currentMonthInvoices,
    stats,
    loadInvoices,
    handleMarkAsPaid,
    handleUnmarkAsPaid,
    handleInvoiceSort,
  } = useInvoiceListData({ projects, onProjectUpdate })
  const {
    reminderDropdownOpen,
    setReminderDropdownOpen,
    sendingReminder,
    reminderModalOpen,
    reminderPreviewData,
    reminderPreviewLoading,
    cancelModalOpen,
    invoiceToCancel,
    handleOpenReminderPreview,
    handleConfirmSendReminder,
    closeReminderModal,
    openCancelModal,
    closeCancelModal,
    handleCreditNoteSuccess,
  } = useInvoiceForm({
    loadInvoices,
    onProjectUpdate,
    onSuccessMessage: success,
    onErrorMessage: showError,
  })

  const handleViewInvoice = (invoice: ListInvoice) => {
    setSelectedInvoice(invoice)
    setViewMode('invoice')
  }

  const handlePrintInvoice = (invoice: ListInvoice) => {
    setSelectedInvoice(invoice)
    setViewMode('invoice')
    setTimeout(() => window.print(), 500)
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

  if (activeTab === 'missing') {
    return (
      <div className="animate-in slide-in-from-bottom-4 space-y-6 duration-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="mb-2 text-5xl font-black tracking-tighter text-slate-900">Rechnungen</h2>
            <p className="font-medium text-slate-500">
              Projekte mit fehlenden Rechnungen
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
            onClick={() => setActiveTab('missing')}
            className="rounded-xl bg-red-500 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all"
          >
            Nicht erfasst
          </button>
          <button
            onClick={() => setActiveTab('reminders')}
            className="rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all hover:text-slate-900"
          >
            Mahnungen
          </button>
        </div>

        <MissingInvoicesList
          projects={projects}
          invoices={dbInvoices}
          customerDeliveryNotes={customerDeliveryNotes}
        />
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
            onClick={() => setActiveTab('missing')}
            className="rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all hover:text-slate-900"
          >
            Nicht erfasst
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
        <button
          onClick={() => setShowOverview(true)}
          className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 shadow-sm transition-all hover:scale-[1.02] hover:shadow-lg"
        >
          <ClipboardList className="h-4 w-4 text-amber-700" />
          <span className="text-xs font-bold text-amber-800">Bestandsübersicht</span>
        </button>
      </div>

      {showOverview && (
        <OpenProjectsOverview projects={projects} onClose={() => setShowOverview(false)} />
      )}

      {/* Tabs: Rechnungen | Nicht erfasst | Mahnungen */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-inner">
        <button
          onClick={() => setActiveTab('invoices')}
          className="rounded-xl bg-slate-900 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all"
        >
          Rechnungen
        </button>
        <button
          onClick={() => setActiveTab('missing')}
          className="rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all hover:text-slate-900"
        >
          Nicht erfasst
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

      {/* Horizontale Monatstabs - nur wenn ein Jahr gewählt ist */}
      {selectedYear !== 'all' && (
        <div className="glass grid grid-cols-[auto_1fr] gap-2 rounded-2xl border border-white/50 bg-gradient-to-r from-white to-slate-50/30 p-2 shadow-lg">
          <button
            onClick={() => setSelectedMonth('all')}
            className={`flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              selectedMonth === 'all'
                ? 'bg-slate-900 text-white shadow-lg'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Alle
          </button>
          <div className="grid grid-cols-6 gap-0.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(monthNum => {
              const monthInvoices = invoicesByMonth.get(monthNum) || []
              const count = monthInvoices.length
              const isSelected = typeof selectedMonth === 'number' && selectedMonth === monthNum
              const monthName = new Date(2000, monthNum - 1).toLocaleDateString('de-DE', { month: 'short' })
              return (
                <button
                  key={monthNum}
                  onClick={() => setSelectedMonth(monthNum)}
                  className={`flex flex-col items-center rounded-lg px-2 py-1.5 transition-all ${
                    isSelected ? 'bg-amber-500 shadow-lg' : 'hover:bg-slate-100'
                  }`}
                >
                  <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>{monthName}</span>
                  <span className={`text-[10px] font-bold ${isSelected ? 'text-white/90' : 'text-slate-500'}`}>{count}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="glass overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-br from-white to-slate-50/30 shadow-xl">
        {(selectedYear !== 'all' && selectedMonth !== 'all') ? (
          /* Einzelner Monat ausgewählt - Tabelle mit Pagination */
          <InvoiceTableSimple
            invoices={paginatedInvoices}
            allInvoices={currentMonthInvoices}
            selectedMonth={selectedMonth as number}
            selectedYear={selectedYear as number}
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            companySettings={companySettings}
            markingPaidId={markingPaidId}
            paidDateInput={paidDateInput}
            saving={saving}
            sendingReminder={sendingReminder}
            reminderDropdownOpen={reminderDropdownOpen}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleInvoiceSort}
            onView={handleViewInvoice}
            onPrint={handlePrintInvoice}
            onMarkAsPaid={handleMarkAsPaid}
            onUnmarkAsPaid={handleUnmarkAsPaid}
            onSetMarkingPaidId={setMarkingPaidId}
            onSetPaidDateInput={setPaidDateInput}
            onSetReminderDropdownOpen={setReminderDropdownOpen}
            onSendReminder={handleOpenReminderPreview}
            onCancelInvoice={openCancelModal}
          />
        ) : (
          /* "Alle" Ansicht - Gruppierte Akkordeon-Ansicht */
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
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleInvoiceSort}
            onView={handleViewInvoice}
            onPrint={handlePrintInvoice}
            onMarkAsPaid={handleMarkAsPaid}
            onUnmarkAsPaid={handleUnmarkAsPaid}
            onSetMarkingPaidId={setMarkingPaidId}
            onSetPaidDateInput={setPaidDateInput}
            onSetReminderDropdownOpen={setReminderDropdownOpen}
            onSendReminder={handleOpenReminderPreview}
            onCancelInvoice={openCancelModal}
            onLoadMore={() => setVisibleRows(v => v + 400)}
          />
        )}
      </div>

      <ReminderPreviewModal
        isOpen={reminderModalOpen}
        onClose={closeReminderModal}
        previewData={reminderPreviewData}
        loading={reminderPreviewLoading}
        onSend={handleConfirmSendReminder}
      />

      {/* Storno-Dialog */}
      <CreditNoteModal
        isOpen={cancelModalOpen}
        invoice={invoiceToCancel}
        onClose={closeCancelModal}
        onSuccess={handleCreditNoteSuccess}
      />
    </div>
  )
}

export default InvoiceList
