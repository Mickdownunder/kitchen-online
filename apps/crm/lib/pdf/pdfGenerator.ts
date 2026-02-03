/**
 * Zentraler PDF-Generierungs-Service
 * Unterstützt alle PDF-Typen: Invoice, DeliveryNote, Offer, Statistics, Reminder
 */

import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { InvoicePDFDocumentServer } from '@/lib/pdf/InvoicePDFServer'
import { CustomerDeliveryNotePDFDocumentServer } from '@/lib/pdf/DeliveryNotePDFServer'
import { ReminderPDFDocumentServer, ReminderData } from '@/lib/pdf/ReminderPDFServer'
import { OrderPDFDocumentServer } from '@/lib/pdf/OrderPDFServer'
import { InvoiceData, invoiceToPriorInfo } from '@/components/InvoicePDF'
import type { CompanySettings } from '@/types'
import { CustomerProject, Invoice, BankAccount, InvoiceItem } from '@/types'
import { getCompanySettings, getBankAccounts } from '@/lib/supabase/services/company'
import { getInvoices } from '@/lib/supabase/services/invoices'
import { getCustomer } from '@/lib/supabase/services/customers'
import { formatCustomerAddress, formatAddressForDB } from '@/lib/utils/addressFormatter'
import { calculateOverdueDays } from '@/hooks/useInvoiceCalculations'

export type PDFType = 'invoice' | 'deliveryNote' | 'order' | 'offer' | 'statistics' | 'reminder'

// Invoice input for PDF generation - can be from DB or passed directly
export interface InvoiceInput {
  invoiceNumber: string
  amount: number
  date: string
  description?: string
  type?: 'deposit' | 'final' | 'partial' | 'credit'
  dueDate?: string
  isPaid?: boolean
  paidDate?: string
}

export interface PDFGenerationOptions {
  type: PDFType
  project?: CustomerProject
  invoice?: InvoiceInput
  // For final invoices: prior partial invoices to display
  priorInvoices?: Invoice[]
  deliveryNoteId?: string
  dateRange?: { from: string; to: string }
  reminderType?: 'first' | 'second' | 'final'
  overdueDays?: number
  appendAgb?: boolean
  /** Optional: für API-Routes übergeben, da getCompanySettings dort oft null liefert */
  companySettings?: CompanySettings | null
}

export interface GeneratedPDF {
  pdf: string // base64 encoded
  filename: string
}

/**
 * Generiert ein PDF basierend auf Typ und Optionen
 */
export async function generatePDF(options: PDFGenerationOptions): Promise<GeneratedPDF> {
  const { type, project, invoice, deliveryNoteId, companySettings: optsCompany } = options

  // Lade Company Settings – wenn in options übergeben (z.B. aus API-Route), diese verwenden
  const companySettings = optsCompany ?? (await getCompanySettings())
  // Bank-Account nur für Rechnung/Mahnung laden (Order/Lieferschein brauchen keine)
  let bankAccount: BankAccount | null = null
  if ((type === 'invoice' || type === 'reminder') && companySettings?.id) {
    try {
      const banks = await getBankAccounts(companySettings.id)
      bankAccount = banks.find(b => b.isDefault) || banks[0] || null
    } catch {
      bankAccount = null
    }
  }

  switch (type) {
    case 'invoice':
      if (!project || !invoice) {
        throw new Error('Projekt und Rechnung sind erforderlich für Invoice-PDF')
      }
      if (!companySettings) {
        throw new Error('Firmeneinstellungen sind erforderlich für Invoice-PDF')
      }
      return generateInvoicePDF(
        project,
        invoice,
        companySettings,
        bankAccount,
        options.priorInvoices
      )

    case 'deliveryNote':
      if (!project) {
        throw new Error('Projekt ist erforderlich für DeliveryNote-PDF')
      }
      if (!companySettings) {
        throw new Error('Firmeneinstellungen sind erforderlich für DeliveryNote-PDF')
      }
      return generateDeliveryNotePDF(project, deliveryNoteId, companySettings)

    case 'order':
      if (!project) {
        throw new Error('Projekt ist erforderlich für Order-PDF')
      }
      if (!companySettings) {
        throw new Error('Firmeneinstellungen sind erforderlich für Order-PDF')
      }
      return generateOrderPDF(project, companySettings, options.appendAgb ?? true)

    case 'reminder':
      if (!project || !invoice || !options.reminderType) {
        throw new Error('Projekt, Rechnung und reminderType sind erforderlich für Reminder-PDF')
      }
      if (!companySettings) {
        throw new Error('Firmeneinstellungen sind erforderlich für Reminder-PDF')
      }
      return generateReminderPDF(
        project,
        invoice,
        options.reminderType,
        options.overdueDays,
        companySettings,
        bankAccount
      )

    case 'offer':
      throw new Error('Offer-PDF wird noch nicht unterstützt')

    case 'statistics':
      throw new Error('Statistics-PDF wird noch nicht unterstützt')

    default:
      throw new Error(`Unbekannter PDF-Typ: ${type}`)
  }
}

/**
 * Generiert Invoice-PDF (Anzahlung oder Schlussrechnung)
 * Lädt automatisch vorherige Anzahlungen aus der invoices-Tabelle
 */
async function generateInvoicePDF(
  project: CustomerProject,
  invoice: InvoiceInput,
  companySettings: CompanySettings,
  bankAccount: BankAccount | null,
  priorInvoices?: Invoice[]
): Promise<GeneratedPDF> {
  // Determine invoice type
  const invoiceType =
    invoice.type === 'credit'
      ? 'credit'
      : invoice.type === 'deposit' || invoice.type === 'partial'
        ? 'deposit'
        : invoice.type === 'final'
          ? 'final'
          : invoice.invoiceNumber?.includes('A')
            ? 'deposit'
            : 'final'

  // For final invoices, load prior partial invoices from DB if not provided
  let priorPayments = priorInvoices || []
  if (invoiceType === 'final' && !priorInvoices) {
    try {
      const projectInvoices = await getInvoices(project.id)
      priorPayments = projectInvoices.filter(
        inv => inv.type === 'partial' && inv.invoiceNumber !== invoice.invoiceNumber
      )
    } catch (error) {
      console.error('Error loading prior invoices:', error)
      priorPayments = []
    }
  }

  // Kundendaten für PDF: Adresse aus Projekt oder aus Kundenstamm
  let recipientAddress = (project.address || '').trim()
  let recipientPhone = project.phone || ''
  let recipientEmail = project.email || ''
  if (!recipientAddress && project.customerId) {
    try {
      const customer = await getCustomer(project.customerId)
      if (customer) {
        recipientAddress = formatCustomerAddress(customer)
        if (!recipientPhone && customer.contact?.phone) recipientPhone = customer.contact.phone
        if (!recipientEmail && customer.contact?.email) recipientEmail = customer.contact.email
      }
    } catch {
      // Fallback: Projekt-Daten beibehalten
    }
  }
  // Fallback: Adresse aus Einzelfeldern bauen (wenn im Projekt vorhanden)
  if (!recipientAddress && (project as CustomerProject & { addressStreet?: string }).addressStreet) {
    const p = project as CustomerProject & { addressStreet?: string; addressHouseNumber?: string; addressPostalCode?: string; addressCity?: string }
    recipientAddress = formatAddressForDB(p.addressStreet, p.addressHouseNumber, p.addressPostalCode, p.addressCity)
  }

  const invoiceData: InvoiceData = {
    type: invoiceType,
    invoiceNumber: invoice.invoiceNumber,
    amount: invoice.amount,
    date: invoice.date,
    description: invoice.description,
    isPaid: invoice.isPaid,
    paidDate: invoice.paidDate,
    project: {
      customerName: project.customerName || 'Kunde',
      address: recipientAddress,
      phone: recipientPhone,
      email: recipientEmail,
      orderNumber: project.orderNumber || '',
      customerId: project.customerId,
      id: project.id,
      items: project.items || [],
    },
    priorInvoices: priorPayments.map(invoiceToPriorInfo),
    company: companySettings,
    bankAccount: bankAccount,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfElement = React.createElement(InvoicePDFDocumentServer, { invoice: invoiceData }) as any
  const pdfBuffer = await renderToBuffer(pdfElement)
  const pdfBase64 = pdfBuffer.toString('base64')

  const filename = `Rechnung_${invoice.invoiceNumber.replace(/\//g, '-')}_${project.customerName.replace(/\s/g, '_')}.pdf`

  return {
    pdf: pdfBase64,
    filename,
  }
}

/**
 * Generiert DeliveryNote-PDF
 */
async function generateDeliveryNotePDF(
  project: CustomerProject,
  deliveryNoteId: string | undefined,
  companySettings: CompanySettings
): Promise<GeneratedPDF> {
  const deliveryNote = {
    deliveryNoteNumber: `LS-${project.orderNumber}`,
    deliveryDate: project.deliveryDate || new Date().toISOString(),
    deliveryAddress: project.address,
    items:
      project.items?.map((item: InvoiceItem, index: number) => ({
        position: index + 1,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit || 'Stk',
      })) || [],
  }

  const pdfElement = React.createElement(CustomerDeliveryNotePDFDocumentServer, {
    deliveryNote: {
      deliveryNoteNumber: deliveryNote.deliveryNoteNumber,
      deliveryDate: deliveryNote.deliveryDate,
      deliveryAddress: deliveryNote.deliveryAddress,
      customerSignature: undefined,
      signedBy: undefined,
      customerSignatureDate: undefined,
      items: deliveryNote.items,
    },
    project: project,
    company: companySettings,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any
  const pdfBuffer = await renderToBuffer(pdfElement)
  const pdfBase64 = pdfBuffer.toString('base64')

  const filename = `Lieferschein_${deliveryNote.deliveryNoteNumber.replace(/\//g, '-')}_${project.customerName.replace(/\s/g, '_')}.pdf`

  return {
    pdf: pdfBase64,
    filename,
  }
}

/**
 * Generiert Order/Auftrag-PDF
 */
async function generateOrderPDF(
  project: CustomerProject,
  companySettings: CompanySettings,
  appendAgb: boolean
): Promise<GeneratedPDF> {
  try {
    const pdfElement = React.createElement(OrderPDFDocumentServer, {
      project,
      company: companySettings,
      showUnitPrices: false,
      appendAgb,
    })
    const pdfBuffer = await renderToBuffer(pdfElement as React.ReactElement)
    const pdfBase64 = pdfBuffer.toString('base64')
    const safeOrder = (project.orderNumber || project.id?.slice(0, 8) || 'Auftrag').replace(/\//g, '-')
    const safeName = (project.customerName || 'Kunde').replace(/\s/g, '_')
    const filename = `Auftrag_${safeOrder}_${safeName}.pdf`
    return { pdf: pdfBase64, filename }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Order-PDF: ${msg}`)
  }
}

/**
 * Generiert Reminder-PDF (Mahnung)
 */
async function generateReminderPDF(
  project: CustomerProject,
  invoice: InvoiceInput,
  reminderType: 'first' | 'second' | 'final',
  overdueDays: number | undefined,
  companySettings: CompanySettings,
  bankAccount: BankAccount | null
): Promise<GeneratedPDF> {
  // Berechne overdueDays falls nicht angegeben
  let calculatedOverdueDays = overdueDays
  if (calculatedOverdueDays === undefined) {
    const dueDate = invoice.dueDate || invoice.date
    calculatedOverdueDays = calculateOverdueDays(dueDate) || 0
  }

  const reminderData: ReminderData = {
    project,
    invoice,
    reminderType,
    overdueDays: calculatedOverdueDays,
    company: companySettings,
    bankAccount: bankAccount ?? undefined,
  }

  const pdfElement = React.createElement(ReminderPDFDocumentServer, {
    reminder: reminderData,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any
  const pdfBuffer = await renderToBuffer(pdfElement)
  const pdfBase64 = pdfBuffer.toString('base64')

  const reminderTypeText =
    reminderType === 'first'
      ? '1_Mahnung'
      : reminderType === 'second'
        ? '2_Mahnung'
        : 'Letzte_Mahnung'
  const filename = `${reminderTypeText}_${invoice.invoiceNumber.replace(/\//g, '-')}_${project.customerName.replace(/\s/g, '_')}.pdf`

  return {
    pdf: pdfBase64,
    filename,
  }
}
