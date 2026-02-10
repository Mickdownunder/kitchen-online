import React from 'react'
import type { DocumentProps } from '@react-pdf/renderer'
import { renderToBuffer } from '@react-pdf/renderer'
import { InvoiceData, invoiceToPriorInfo } from '@/components/InvoicePDF'
import { CustomerDeliveryNotePDFDocumentServer } from '@/lib/pdf/DeliveryNotePDFServer'
import { InvoicePDFDocumentServer } from '@/lib/pdf/InvoicePDFServer'
import { OrderPDFDocumentServer } from '@/lib/pdf/OrderPDFServer'
import { getBankAccounts, getCompanySettings } from '@/lib/supabase/services/company'
import { getInvoices } from '@/lib/supabase/services/invoices'
import type { CustomerProject } from '@/types'
import type { PublishRequest } from './schema'
import { mapInvoiceItemsForInvoicePdf, mapInvoiceItemsForOrderPdf } from './helpers'
import type { RenderedDocument } from './types'

export async function renderDocumentPdf(request: PublishRequest): Promise<RenderedDocument> {
  const companySettings = await getCompanySettings()
  let bankAccount = null

  if (companySettings?.id) {
    const bankAccounts = await getBankAccounts(companySettings.id)
    bankAccount = bankAccounts.find((account) => account.isDefault) || bankAccounts[0] || null
  }

  if (request.documentType === 'invoice') {
    const invoice = request.invoice as NonNullable<PublishRequest['invoice']>

    const invoiceType =
      invoice.type === 'credit' ? 'credit' : invoice.type === 'partial' ? 'deposit' : 'final'

    let priorInvoices: ReturnType<typeof invoiceToPriorInfo>[] = []
    if (invoiceType === 'final') {
      const invoicesResult = await getInvoices(request.projectId)
      if (invoicesResult.ok) {
        priorInvoices = invoicesResult.data
          .filter((entry) => entry.type === 'partial' && entry.invoiceNumber !== invoice.invoiceNumber)
          .map(invoiceToPriorInfo)
      }
    }

    const invoiceData: InvoiceData = {
      type: invoiceType,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      date: invoice.date,
      description: invoice.description,
      isPaid: invoice.isPaid ?? false,
      paidDate: invoice.paidDate,
      project: {
        customerName: request.project.customerName,
        address: request.project.address,
        phone: request.project.phone,
        email: request.project.email,
        orderNumber: request.project.orderNumber || '',
        customerId: request.project.customerId,
        id: request.project.id,
        items: mapInvoiceItemsForInvoicePdf(request.project),
      },
      priorInvoices,
      company: companySettings,
      bankAccount,
    }

    const pdfElement = React.createElement(InvoicePDFDocumentServer, { invoice: invoiceData })
    const pdfBuffer = await renderToBuffer(pdfElement as React.ReactElement<DocumentProps>)

    const invoiceTypeLabel =
      invoice.type === 'credit'
        ? 'Stornorechnung'
        : invoice.type === 'partial'
          ? 'Teilrechnung'
          : 'Schlussrechnung'

    return {
      pdfBuffer,
      fileName: `${invoiceTypeLabel}_${invoice.invoiceNumber.replace(/\//g, '-')}.pdf`,
      portalType: 'RECHNUNGEN',
    }
  }

  if (request.documentType === 'delivery_note') {
    const deliveryNote = request.deliveryNote as NonNullable<PublishRequest['deliveryNote']>

    const deliveryNoteProject: CustomerProject = {
      id: request.project.id,
      customerName: request.project.customerName,
      address: request.project.address,
      phone: request.project.phone,
      email: request.project.email,
      orderNumber: request.project.orderNumber,
      customerId: request.project.customerId,
    } as CustomerProject

    const deliveryNoteElement = React.createElement(CustomerDeliveryNotePDFDocumentServer, {
      deliveryNote: {
        deliveryNoteNumber: deliveryNote.deliveryNoteNumber,
        deliveryDate: deliveryNote.deliveryDate,
        deliveryAddress: deliveryNote.deliveryAddress,
        items: deliveryNote.items?.map((item) => ({
          ...item,
          unit: item.unit || 'Stk',
        })),
      },
      project: deliveryNoteProject,
      company: companySettings,
    })

    const pdfBuffer = await renderToBuffer(deliveryNoteElement as React.ReactElement<DocumentProps>)

    return {
      pdfBuffer,
      fileName: `Lieferschein_${deliveryNote.deliveryNoteNumber.replace(/\//g, '-')}.pdf`,
      portalType: 'LIEFERSCHEINE',
    }
  }

  const orderProject: CustomerProject = {
    id: request.project.id,
    customerName: request.project.customerName,
    address: request.project.address,
    phone: request.project.phone,
    email: request.project.email,
    orderNumber: request.project.orderNumber,
    customerId: request.project.customerId,
    items: mapInvoiceItemsForOrderPdf(request.project),
    netAmount: (request.project.items || []).reduce((sum, item) => sum + (item.netTotal || 0), 0),
    taxAmount: (request.project.items || []).reduce(
      (sum, item) => sum + (item.netTotal || 0) * ((item.taxRate || 20) / 100),
      0,
    ),
    totalAmount: (request.project.items || []).reduce(
      (sum, item) => sum + (item.netTotal || 0) * (1 + (item.taxRate || 20) / 100),
      0,
    ),
  } as CustomerProject

  const orderElement = React.createElement(OrderPDFDocumentServer, {
    project: orderProject,
    company: companySettings,
    appendAgb: request.appendAgb ?? true,
  })

  const pdfBuffer = await renderToBuffer(orderElement as React.ReactElement<DocumentProps>)

  return {
    pdfBuffer,
    fileName: `Auftrag_${(request.project.orderNumber || request.project.id.slice(0, 8)).replace(/\//g, '-')}.pdf`,
    portalType: 'KAUFVERTRAG',
  }
}
