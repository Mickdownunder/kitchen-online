/**
 * Public hook facade for ProjectDocumentsTab.
 * Internally split into query and action hooks to keep responsibilities clear.
 */

'use client'

import {
  BankAccount,
  CompanySettings,
  CustomerProject,
  Invoice,
} from '@/types'
import { getInvoices } from '@/lib/supabase/services'
import { logger } from '@/lib/utils/logger'
import type { InvoiceData } from '../InvoicePDF'
import { useProjectDocumentActions } from './useProjectDocumentActions'
import { useProjectDocumentQueries } from './useProjectDocumentQueries'
import type { DocumentItem } from './projectDocuments.types'

export type { DocumentItem, DocumentType } from './projectDocuments.types'

/**
 * Builds the InvoiceData payload needed for PDF generation.
 * Fetches fresh invoice data from the API to ensure isPaid status is current.
 * Falls back to cached doc.data.invoice when the fresh fetch fails.
 */
export async function buildInvoiceData(
  doc: DocumentItem,
  project: CustomerProject,
  companySettings: CompanySettings | null,
  bankAccount: BankAccount | null,
): Promise<InvoiceData | null> {
  let currentInvoice: Invoice | null = null
  let priorInvoices: {
    id: string
    invoiceNumber: string
    amount: number
    date: string
    description?: string
  }[] = []

  try {
    const allInvoicesResult = await getInvoices(project.id)
    if (!allInvoicesResult.ok) {
      throw new Error('Failed to load invoices')
    }

    const allInvoices = allInvoicesResult.data

    currentInvoice = allInvoices.find((invoice) => invoice.id === doc.id) || null

    if (currentInvoice && currentInvoice.type === 'final') {
      priorInvoices = allInvoices
        .filter(
          (invoice) =>
            invoice.type === 'partial' && invoice.invoiceNumber !== currentInvoice!.invoiceNumber,
        )
        .map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          date: invoice.invoiceDate,
          description: invoice.description,
        }))
    }
  } catch (error) {
    logger.debug('Could not load invoices for PDF', { component: 'ProjectDocumentsTab', error })
  }

  // Fallback to cached data
  if (!currentInvoice) {
    currentInvoice = doc.data.invoice
  }

  if (!currentInvoice) {
    return null
  }

  return {
    type:
      currentInvoice.type === 'credit'
        ? 'credit'
        : currentInvoice.type === 'partial'
          ? 'deposit'
          : 'final',
    invoiceNumber: currentInvoice.invoiceNumber,
    amount: currentInvoice.amount,
    date: currentInvoice.invoiceDate,
    description: currentInvoice.description,
    isPaid: currentInvoice.isPaid,
    paidDate: currentInvoice.paidDate,
    originalInvoiceNumber: currentInvoice.originalInvoiceNumber,
    project: {
      customerName: project.customerName,
      address: project.address,
      phone: project.phone,
      email: project.email,
      orderNumber: project.orderNumber,
      customerId: project.customerId,
      id: project.id,
      items: project.items,
    },
    priorInvoices,
    company: companySettings,
    bankAccount,
  }
}

export function useProjectDocuments(project: CustomerProject) {
  const {
    markDocumentAsPublished,
    ...queryState
  } = useProjectDocumentQueries(project)

  const actionState = useProjectDocumentActions({
    project,
    companySettings: queryState.companySettings,
    onDocumentPublished: markDocumentAsPublished,
  })

  return {
    ...queryState,
    ...actionState,
  }
}
