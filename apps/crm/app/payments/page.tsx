'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CreditCard, Plus, ArrowLeft } from 'lucide-react'
import { useApp } from '../providers'
import { usePaymentFlow } from '@/hooks/usePaymentFlow'
import { ProjectSelector } from './components/ProjectSelector'
import { PaymentForm } from './components/PaymentForm'
import { PaymentRow } from './components/PaymentRow'
import { PaymentSummary } from './components/PaymentSummary'

function PaymentsPageContent() {
  const searchParams = useSearchParams()
  const projectIdParam = searchParams.get('projectId')

  const { projects, isLoading } = useApp()
  const {
    selectedProject,
    editingPaymentId,
    newPaymentForm,
    setNewPaymentForm,
    percentInput,
    editingPercentInput,
    partialPayments,
    finalInvoice,
    calculations,
    showProjectList,
    resetForm,
    handleSelectProject,
    handleQuickPercent,
    handlePercentChange,
    handlePercentBlur,
    handleEditingPercentChange,
    handleEditingPercentBlur,
    handleSavePayment,
    handleDeletePayment,
    handleMarkPaymentPaid,
    handleUnmarkPaymentPaid,
    handleGenerateFinalInvoice,
    handleMarkFinalInvoicePaid,
    handleUnmarkFinalInvoicePaid,
    handleDeleteFinalInvoice,
    startNewPayment,
    startEditPayment,
    loadingInvoices,
    invoiceNumber,
    setInvoiceNumber,
    suggestedInvoiceNumber,
  } = usePaymentFlow({ projects, projectIdParam })

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-50 via-white to-slate-50 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-black text-slate-900">Zahlungen erfassen</h1>
            <p className="text-slate-600">
              {projectIdParam && selectedProject ? (
                <>
                  Anzahlungen und Schlussrechnung für{' '}
                  <span className="font-bold text-slate-900">{selectedProject.customerName}</span>
                </>
              ) : (
                'Wählen Sie einen Auftrag aus der Liste'
              )}
            </p>
          </div>
          {projectIdParam && (
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 rounded-xl bg-slate-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zum Auftrag
            </button>
          )}
        </div>

        <div className={`grid grid-cols-1 ${showProjectList ? 'lg:grid-cols-3' : ''} gap-6`}>
          {/* Projects List */}
          {showProjectList && (
            <ProjectSelector
              projects={projects}
              selectedProject={selectedProject}
              isLoading={isLoading}
              onSelectProject={handleSelectProject}
            />
          )}

          {/* Payment Details */}
          <div className={showProjectList ? 'lg:col-span-2' : 'lg:col-span-full'}>
            {isLoading ? (
              <div className="min-h-[400px] rounded-2xl border border-slate-200 bg-white p-12 shadow-lg">
                <div className="flex min-h-[300px] flex-col items-center justify-center text-slate-400">
                  <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                  <p className="text-sm font-medium">
                    {projectIdParam ? 'Lade Auftrag...' : 'Lade Projekte...'}
                  </p>
                </div>
              </div>
            ) : projectIdParam && !selectedProject ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-lg">
                <CreditCard className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                <p className="mb-4 text-lg text-slate-400">Auftrag nicht gefunden</p>
                <button
                  onClick={() => window.history.back()}
                  className="mx-auto flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-amber-600"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Zurück
                </button>
              </div>
            ) : selectedProject ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
                {/* Project Header */}
                <div className="mb-6 border-b border-slate-200 pb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">
                        {selectedProject.customerName}
                      </h2>
                      <p className="mt-1 text-slate-600">Auftrag: {selectedProject.orderNumber}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-amber-600">
                        {calculations.grossTotal.toLocaleString('de-AT')} €
                      </div>
                      <div className="text-sm text-slate-500">Gesamtbetrag</div>
                    </div>
                  </div>
                </div>

                {/* Partial Payments Section */}
                <div className="mb-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-900">Anzahlungen</h3>
                    {!newPaymentForm && (
                      <button
                        type="button"
                        onClick={() => void startNewPayment()}
                        className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-amber-600"
                      >
                        <Plus className="h-4 w-4" />
                        Anzahlung hinzufügen
                      </button>
                    )}
                  </div>

                  {/* New Payment Form */}
                  {newPaymentForm && !editingPaymentId && (
                    <PaymentForm
                      formData={newPaymentForm}
                      percentInput={percentInput}
                      grossTotal={calculations.grossTotal}
                      invoiceNumber={invoiceNumber}
                      suggestedInvoiceNumber={suggestedInvoiceNumber}
                      onFormChange={setNewPaymentForm}
                      onPercentChange={handlePercentChange}
                      onPercentBlur={handlePercentBlur}
                      onQuickPercent={handleQuickPercent}
                      onInvoiceNumberChange={setInvoiceNumber}
                      onSave={() => void handleSavePayment(selectedProject.id)}
                      onCancel={resetForm}
                    />
                  )}

                  {/* Payment Rows */}
                  <div className="space-y-4">
                    {loadingInvoices ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
                      </div>
                    ) : partialPayments.length > 0 ? (
                      partialPayments.map((invoice, idx) => (
                        <PaymentRow
                          key={invoice.id}
                          payment={{
                            id: invoice.id,
                            invoiceNumber: invoice.invoiceNumber,
                            amount: invoice.amount,
                            date: invoice.invoiceDate,
                            description: invoice.description,
                            isPaid: invoice.isPaid,
                            paidDate: invoice.paidDate,
                          }}
                          index={idx}
                          isEditing={editingPaymentId === invoice.id}
                          editFormData={editingPaymentId === invoice.id ? newPaymentForm : null}
                          editingPercentInput={editingPercentInput}
                          grossTotal={calculations.grossTotal}
                          onEdit={() => startEditPayment(invoice)}
                          onSave={() => void handleSavePayment(selectedProject.id)}
                          onCancel={() => {
                            if (invoice.amount === 0) {
                              void handleDeletePayment(selectedProject.id, invoice.id)
                            }
                            resetForm()
                          }}
                          onDelete={() => void handleDeletePayment(selectedProject.id, invoice.id)}
                          onFormChange={setNewPaymentForm}
                          onPercentChange={handleEditingPercentChange}
                          onPercentBlur={handleEditingPercentBlur}
                          onQuickPercent={(percent) => handleEditingPercentChange(percent.toString())}
                          onMarkAsPaid={(paidDate) =>
                            void handleMarkPaymentPaid(invoice.id, paidDate)
                          }
                          onUnmarkAsPaid={() => void handleUnmarkPaymentPaid(invoice.id)}
                        />
                      ))
                    ) : (
                      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-12 text-center text-slate-400">
                        <CreditCard className="mx-auto mb-3 h-12 w-12 text-slate-400" />
                        <p className="text-sm">Noch keine Anzahlungen hinzugefügt</p>
                        <p className="mt-1 text-xs">
                          Klicken Sie auf &quot;Anzahlung hinzufügen&quot; um eine hinzuzufügen
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Summary and Final Invoice – auch bei 0 Anzahlungen (Direkt Schlussrechnung) */}
                  {calculations.grossTotal > 0 && (
                    <PaymentSummary
                      partialPayments={partialPayments.map((invoice) => ({
                        id: invoice.id,
                        invoiceNumber: invoice.invoiceNumber,
                        amount: invoice.amount,
                        date: invoice.invoiceDate,
                        description: invoice.description,
                        isPaid: invoice.isPaid,
                        paidDate: invoice.paidDate,
                      }))}
                      grossTotal={calculations.grossTotal}
                      finalInvoice={
                        finalInvoice
                          ? {
                              id: finalInvoice.id,
                              invoiceNumber: finalInvoice.invoiceNumber,
                              amount: finalInvoice.amount,
                              date: finalInvoice.invoiceDate,
                              isPaid: finalInvoice.isPaid,
                              paidDate: finalInvoice.paidDate,
                            }
                          : undefined
                      }
                      onGenerateFinalInvoice={(invoiceDate) => void handleGenerateFinalInvoice(invoiceDate)}
                      onMarkFinalInvoicePaid={(paidDate) => void handleMarkFinalInvoicePaid(paidDate)}
                      onUnmarkFinalInvoicePaid={() => void handleUnmarkFinalInvoicePaid()}
                      onDeleteFinalInvoice={() => void handleDeleteFinalInvoice()}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-lg">
                <CreditCard className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                <p className="text-lg text-slate-400">
                  Wählen Sie einen Auftrag aus, um Zahlungen zu verwalten
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-slate-50">
          <div className="text-slate-400">Lade...</div>
        </div>
      }
    >
      <PaymentsPageContent />
    </Suspense>
  )
}
