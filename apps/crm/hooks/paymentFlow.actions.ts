import {
  createInvoice,
  deleteInvoice,
  getInvoiceByNumber,
  markInvoicePaid,
  markInvoiceUnpaid,
  updateInvoice,
} from '@/lib/supabase/services'
import { calculateRemainingGrossAmount } from '@/lib/utils/accountingAmounts'
import { roundTo2Decimals } from '@/lib/utils/priceCalculations'
import type { CustomerProject, Invoice } from '@/types'
import type { PaymentFormData } from '@/hooks/payments.types'

const TODAY = (): string => new Date().toISOString().split('T')[0]

interface SavePaymentArgs {
  projectId: string
  paymentForm: PaymentFormData | null
  editingPaymentId: string | null
  invoiceNumber: string
}

export async function savePayment({
  projectId,
  paymentForm,
  editingPaymentId,
  invoiceNumber,
}: SavePaymentArgs): Promise<boolean> {
  if (!paymentForm || !paymentForm.amount || !paymentForm.description) {
    alert('Bitte füllen Sie Beschreibung und Betrag aus.')
    return false
  }

  const amountRounded = roundTo2Decimals(paymentForm.amount)

  if (editingPaymentId) {
    const result = await updateInvoice(editingPaymentId, {
      amount: amountRounded,
      description: paymentForm.description,
      invoiceDate: paymentForm.date || TODAY(),
    })
    if (!result.ok) {
      alert('Fehler beim Speichern der Zahlung')
      return false
    }
    return true
  }

  if (invoiceNumber) {
    const existing = await getInvoiceByNumber(invoiceNumber)
    if (existing.ok) {
      alert(
        `Die Rechnungsnummer "${invoiceNumber}" ist bereits vergeben. Bitte wählen Sie eine andere Nummer.`,
      )
      return false
    }
  }

  const createResult = await createInvoice({
    projectId,
    type: 'partial',
    amount: amountRounded,
    invoiceDate: paymentForm.date || TODAY(),
    description: paymentForm.description,
    invoiceNumber: invoiceNumber || undefined,
  })

  if (!createResult.ok) {
    alert('Fehler beim Speichern der Zahlung')
    return false
  }

  return true
}

export async function removePayment(paymentId: string): Promise<boolean> {
  if (!window.confirm('Möchten Sie diese Zahlung wirklich löschen?')) {
    return false
  }

  const result = await deleteInvoice(paymentId)
  if (!result.ok) {
    alert('Fehler beim Löschen der Zahlung')
    return false
  }

  return true
}

export async function markPaymentAsPaid(paymentId: string, paidDate: string): Promise<boolean> {
  const result = await markInvoicePaid(paymentId, paidDate)
  if (!result.ok) {
    alert('Fehler beim Markieren als bezahlt')
    return false
  }
  return true
}

export async function unmarkPaymentAsPaid(paymentId: string): Promise<boolean> {
  const result = await markInvoiceUnpaid(paymentId)
  if (!result.ok) {
    alert('Fehler beim Zurücksetzen')
    return false
  }
  return true
}

interface GenerateFinalInvoiceArgs {
  selectedProject: CustomerProject | null
  projects: CustomerProject[]
  partialPayments: Invoice[]
  finalInvoice?: Invoice
  invoiceDate: string
}

export async function generateFinalInvoice({
  selectedProject,
  projects,
  partialPayments,
  finalInvoice,
  invoiceDate,
}: GenerateFinalInvoiceArgs): Promise<boolean> {
  if (!selectedProject) {
    return false
  }

  const project = projects.find((projectItem) => projectItem.id === selectedProject.id)
  if (!project) {
    return false
  }

  const totalPartial = partialPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const remaining = calculateRemainingGrossAmount(project.totalAmount, totalPartial)

  if (remaining <= 0) {
    alert('Es gibt keinen verbleibenden Betrag für die Schlussrechnung.')
    return false
  }

  if (partialPayments.some((payment) => !payment.isPaid)) {
    alert('⚠️ Schlussrechnungen können erst erzeugt werden, wenn alle Anzahlungen bezahlt sind.')
    return false
  }

  if (finalInvoice) {
    alert('Es existiert bereits eine Schlussrechnung für dieses Projekt.')
    return false
  }

  const result = await createInvoice({
    projectId: selectedProject.id,
    type: 'final',
    amount: remaining,
    description: 'Schlussrechnung',
    invoiceDate: invoiceDate || TODAY(),
  })

  if (!result.ok) {
    alert('Fehler beim Erstellen der Schlussrechnung')
    return false
  }

  alert('Schlussrechnung wurde erstellt!')
  return true
}

export async function deleteFinalInvoice(finalInvoice: Invoice): Promise<boolean> {
  const confirmMessage = finalInvoice.isPaid
    ? 'Die Schlussrechnung ist als bezahlt markiert. Trotzdem löschen?'
    : 'Möchten Sie die Schlussrechnung wirklich löschen?'
  if (!window.confirm(confirmMessage)) {
    return false
  }

  const result = await deleteInvoice(finalInvoice.id)
  if (!result.ok) {
    alert('Fehler beim Löschen der Schlussrechnung')
    return false
  }
  return true
}
