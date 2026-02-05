'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  createInvoice,
  updateInvoice,
  deleteInvoice,
  markInvoicePaid,
  markInvoiceUnpaid,
  getInvoices,
  getInvoiceByNumber,
} from '@/lib/supabase/services'
import { peekNextInvoiceNumber } from '@/lib/supabase/services/company'
import { roundTo2Decimals } from '@/lib/utils/priceCalculations'
import { CustomerProject, Invoice } from '@/types'
import { CreditCard, Plus, ArrowLeft } from 'lucide-react'
import { useApp } from '../providers'
import { ProjectSelector } from './components/ProjectSelector'
import { PaymentForm } from './components/PaymentForm'
import { PaymentRow } from './components/PaymentRow'
import { PaymentSummary } from './components/PaymentSummary'

// Form-Daten für neue/bearbeitete Zahlungen
interface PaymentFormData {
  amount?: number
  description?: string
  date?: string
}

function PaymentsPageContent() {
  const searchParams = useSearchParams()
  const projectIdParam = searchParams.get('projectId')

  const { projects, isLoading } = useApp()
  const [selectedProject, setSelectedProject] = useState<CustomerProject | null>(null)
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const [newPaymentForm, setNewPaymentForm] = useState<PaymentFormData | null>(null)
  const [percentInput, setPercentInput] = useState('')
  const [editingPercentInput, setEditingPercentInput] = useState('')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [suggestedInvoiceNumber, setSuggestedInvoiceNumber] = useState('')

  // Lade Rechnungen für das ausgewählte Projekt
  const loadProjectInvoices = useCallback(async (projectId: string) => {
    setLoadingInvoices(true)
    try {
      const projectInvoices = await getInvoices(projectId)
      setInvoices(projectInvoices)
    } catch (error) {
      console.error('Error loading invoices:', error)
    } finally {
      setLoadingInvoices(false)
    }
  }, [])

  // Lade Rechnungen wenn Projekt ausgewählt wird
  useEffect(() => {
    if (selectedProject?.id) {
      loadProjectInvoices(selectedProject.id)
    } else {
      setInvoices([])
    }
  }, [selectedProject?.id, loadProjectInvoices])

  // Berechne Summen aus den neuen Invoices
  const partialPayments = invoices.filter(inv => inv.type === 'partial')
  const finalInvoice = invoices.find(inv => inv.type === 'final')

  const calculations = selectedProject
    ? {
        grossTotal: selectedProject.totalAmount || 0,
        netTotal: selectedProject.netAmount || 0,
        taxTotal: selectedProject.taxAmount || 0,
      }
    : { grossTotal: 0, netTotal: 0, taxTotal: 0 }

  const resetForm = useCallback(() => {
    setEditingPaymentId(null)
    setNewPaymentForm(null)
    setPercentInput('')
    setEditingPercentInput('')
    setInvoiceNumber('')
    setSuggestedInvoiceNumber('')
  }, [])

  // Auto-select project if projectId is in URL
  useEffect(() => {
    if (projectIdParam && projects.length > 0) {
      const project = projects.find(p => p.id === projectIdParam)
      if (project && project.id !== selectedProject?.id) {
        setSelectedProject(project)
        resetForm()
      }
    }
  }, [projectIdParam, projects, selectedProject?.id, resetForm])

  const handleSelectProject = useCallback(
    (project: CustomerProject) => {
      setSelectedProject(project)
      resetForm()
    },
    [resetForm]
  )

  const handleQuickPercent = useCallback(
    (percent: number) => {
      if (!selectedProject || calculations.grossTotal <= 0) return
      const amount = roundTo2Decimals((calculations.grossTotal * percent) / 100)
      setNewPaymentForm({ ...newPaymentForm, amount })
      setPercentInput(percent.toString())
    },
    [selectedProject, calculations.grossTotal, newPaymentForm]
  )

  const handlePercentChange = useCallback(
    (value: string, fromAmountField?: boolean) => {
      setPercentInput(value)
      // Nur Betrag neu berechnen wenn User im PROZENT-Feld tippt – nicht wenn wir Prozent aus Betrag ableiten
      if (fromAmountField) return
      const percent = parseFloat(value) || 0
      if (!isNaN(percent) && percent >= 0 && percent <= 100 && calculations.grossTotal > 0) {
        const amount = roundTo2Decimals((calculations.grossTotal * percent) / 100)
        setNewPaymentForm(prev => ({ ...prev, amount }))
      } else if (value === '' || value === '.') {
        setNewPaymentForm(prev => ({ ...prev, amount: undefined }))
      }
    },
    [calculations.grossTotal]
  )

  const handlePercentBlur = useCallback(() => {
    if (percentInput) {
      const percent = parseFloat(percentInput) || 0
      if (percent >= 0 && percent <= 100) {
        setPercentInput(percent.toFixed(1))
      } else {
        setPercentInput('')
      }
    }
  }, [percentInput])

  const handleEditingPercentChange = useCallback(
    (value: string, fromAmountField?: boolean) => {
      setEditingPercentInput(value)
      if (fromAmountField) return
      const percent = parseFloat(value) || 0
      if (!isNaN(percent) && percent >= 0 && percent <= 100 && calculations.grossTotal > 0) {
        const amount = roundTo2Decimals((calculations.grossTotal * percent) / 100)
        setNewPaymentForm(prev => ({ ...prev, amount }))
      } else if (value === '' || value === '.') {
        setNewPaymentForm(prev => ({ ...prev, amount: undefined }))
      }
    },
    [calculations.grossTotal]
  )

  const handleEditingPercentBlur = useCallback(() => {
    if (editingPercentInput) {
      const percent = parseFloat(editingPercentInput) || 0
      if (percent >= 0 && percent <= 100) {
        setEditingPercentInput(percent.toFixed(1))
      } else {
        setEditingPercentInput('')
      }
    }
  }, [editingPercentInput])

  const handleSavePayment = async (projectId: string) => {
    if (!newPaymentForm || !newPaymentForm.amount || !newPaymentForm.description) {
      alert('Bitte füllen Sie Beschreibung und Betrag aus.')
      return
    }

    const amountRounded = roundTo2Decimals(newPaymentForm.amount)

    try {
      if (editingPaymentId) {
        // Bestehende Rechnung aktualisieren
        await updateInvoice(editingPaymentId, {
          amount: amountRounded,
          description: newPaymentForm.description,
          invoiceDate: newPaymentForm.date || new Date().toISOString().split('T')[0],
        })
      } else {
        // Prüfe ob die Rechnungsnummer bereits existiert
        if (invoiceNumber) {
          const existingInvoice = await getInvoiceByNumber(invoiceNumber)
          if (existingInvoice) {
            alert(`Die Rechnungsnummer "${invoiceNumber}" ist bereits vergeben. Bitte wählen Sie eine andere Nummer.`)
            return
          }
        }
        
        // Neue Anzahlungsrechnung erstellen
        await createInvoice({
          projectId,
          type: 'partial',
          amount: amountRounded,
          invoiceDate: newPaymentForm.date || new Date().toISOString().split('T')[0],
          description: newPaymentForm.description,
          invoiceNumber: invoiceNumber || undefined,
        })
      }

      // Rechnungen neu laden
      await loadProjectInvoices(projectId)
      resetForm()
    } catch (error) {
      console.error('Error saving payment:', error)
      alert('Fehler beim Speichern der Zahlung')
    }
  }

  const handleDeletePayment = async (projectId: string, paymentId: string) => {
    if (!confirm('Möchten Sie diese Zahlung wirklich löschen?')) return

    try {
      await deleteInvoice(paymentId)
      // Rechnungen neu laden
      await loadProjectInvoices(projectId)
    } catch (error) {
      console.error('Error deleting payment:', error)
    }
  }

  const handleMarkPaymentPaid = async (paymentId: string, paidDate: string) => {
    if (!selectedProject) return

    try {
      await markInvoicePaid(paymentId, paidDate)
      await loadProjectInvoices(selectedProject.id)
    } catch (error) {
      console.error('Error marking payment as paid:', error)
    }
  }

  const handleUnmarkPaymentPaid = async (paymentId: string) => {
    if (!selectedProject) return

    try {
      await markInvoiceUnpaid(paymentId)
      await loadProjectInvoices(selectedProject.id)
    } catch (error) {
      console.error('Error unmarking payment:', error)
    }
  }

  const handleGenerateFinalInvoice = async (invoiceDate: string) => {
    if (!selectedProject) return
    const projectId = selectedProject.id

    try {
      const project = projects.find(p => p.id === projectId)
      if (!project) return

      // Berechne aus den neuen Invoices
      const totalPartial = partialPayments.reduce((sum, p) => sum + p.amount, 0)
      const remaining = project.totalAmount - totalPartial

      if (remaining <= 0) {
        alert('Es gibt keinen verbleibenden Betrag für die Schlussrechnung.')
        return
      }

      if (partialPayments.some(p => !p.isPaid)) {
        alert(
          '⚠️ Schlussrechnungen können erst erzeugt werden, wenn alle Anzahlungen bezahlt sind.'
        )
        return
      }

      // Prüfe ob bereits eine Schlussrechnung existiert
      if (finalInvoice) {
        alert('Es existiert bereits eine Schlussrechnung für dieses Projekt.')
        return
      }

      // Neue Schlussrechnung erstellen (mit wählbarem Datum)
      await createInvoice({
        projectId,
        type: 'final',
        amount: remaining,
        description: 'Schlussrechnung',
        invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
      })

      // Rechnungen neu laden
      await loadProjectInvoices(projectId)
      alert('Schlussrechnung wurde erstellt!')
    } catch (error) {
      console.error('Error generating final invoice:', error)
      alert('Fehler beim Erstellen der Schlussrechnung')
    }
  }

  const handleMarkFinalInvoicePaid = async (paidDate: string) => {
    if (!finalInvoice) return

    try {
      await markInvoicePaid(finalInvoice.id, paidDate)
      if (selectedProject) {
        await loadProjectInvoices(selectedProject.id)
      }
    } catch (error) {
      console.error('Error marking final invoice as paid:', error)
    }
  }

  const handleUnmarkFinalInvoicePaid = async () => {
    if (!finalInvoice) return

    try {
      await markInvoiceUnpaid(finalInvoice.id)
      if (selectedProject) {
        await loadProjectInvoices(selectedProject.id)
      }
    } catch (error) {
      console.error('Error unmarking final invoice:', error)
    }
  }

  const handleDeleteFinalInvoice = async () => {
    if (!finalInvoice || !selectedProject) return

    const confirmMessage = finalInvoice.isPaid
      ? 'Die Schlussrechnung ist als bezahlt markiert. Trotzdem löschen?'
      : 'Möchten Sie die Schlussrechnung wirklich löschen?'
    if (!confirm(confirmMessage)) return

    try {
      await deleteInvoice(finalInvoice.id)
      await loadProjectInvoices(selectedProject.id)
    } catch (error) {
      console.error('Error deleting final invoice:', error)
      alert('Fehler beim Löschen der Schlussrechnung')
    }
  }

  const startNewPayment = async () => {
    if (!selectedProject) return
    const paymentCount = partialPayments.length
    
    // Lade die vorgeschlagene Rechnungsnummer
    const suggested = await peekNextInvoiceNumber()
    setSuggestedInvoiceNumber(suggested)
    setInvoiceNumber(suggested)
    
    setNewPaymentForm({
      description: `Anzahlung ${paymentCount + 1}`,
      amount: undefined,
      date: new Date().toISOString().split('T')[0],
    })
    setEditingPaymentId(null)
    setPercentInput('')
    setEditingPercentInput('')
  }

  const startEditPayment = (invoice: Invoice) => {
    setEditingPaymentId(invoice.id)
    setNewPaymentForm({
      description: invoice.description,
      amount: invoice.amount,
      date: invoice.invoiceDate,
    })
    if (calculations.grossTotal > 0 && invoice.amount > 0) {
      setEditingPercentInput(((invoice.amount / calculations.grossTotal) * 100).toFixed(1))
    } else {
      setEditingPercentInput('')
    }
  }

  const showProjectList = !projectIdParam

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
                        onClick={startNewPayment}
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
                      onSave={() => handleSavePayment(selectedProject.id)}
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
                          onSave={() => handleSavePayment(selectedProject.id)}
                          onCancel={() => {
                            if (invoice.amount === 0) {
                              handleDeletePayment(selectedProject.id, invoice.id)
                            }
                            resetForm()
                          }}
                          onDelete={() => handleDeletePayment(selectedProject.id, invoice.id)}
                          onFormChange={setNewPaymentForm}
                          onPercentChange={handleEditingPercentChange}
                          onPercentBlur={handleEditingPercentBlur}
                          onQuickPercent={percent => {
                            const amount = roundTo2Decimals(
                              (calculations.grossTotal * percent) / 100
                            )
                            setNewPaymentForm(prev => ({ ...prev, amount }))
                            setEditingPercentInput(percent.toString())
                          }}
                          onMarkAsPaid={paidDate =>
                            handleMarkPaymentPaid(invoice.id, paidDate)
                          }
                          onUnmarkAsPaid={() => handleUnmarkPaymentPaid(invoice.id)}
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
                      partialPayments={partialPayments.map(inv => ({
                        id: inv.id,
                        invoiceNumber: inv.invoiceNumber,
                        amount: inv.amount,
                        date: inv.invoiceDate,
                        description: inv.description,
                        isPaid: inv.isPaid,
                        paidDate: inv.paidDate,
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
                      onGenerateFinalInvoice={(invoiceDate) => handleGenerateFinalInvoice(invoiceDate)}
                      onMarkFinalInvoicePaid={handleMarkFinalInvoicePaid}
                      onUnmarkFinalInvoicePaid={handleUnmarkFinalInvoicePaid}
                      onDeleteFinalInvoice={handleDeleteFinalInvoice}
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
