import { CustomerProject, Invoice, CustomerDeliveryNote } from '@/types'
import { logger } from '@/lib/utils/logger'

// ============================================
// PORTAL DOCUMENT SERVICE
// ============================================
// Publishes documents to the customer portal by calling the API route
// which generates the PDF and uploads to storage

export type PortalDocumentType =
  | 'RECHNUNGEN'
  | 'LIEFERSCHEINE'
  | 'KAUFVERTRAG'
  | 'PLANE'
  | 'INSTALLATIONSPLANE'
  | 'AUSMESSBERICHT'

interface PublishInvoiceParams {
  invoice: Invoice
  project: CustomerProject
}

interface PublishDeliveryNoteParams {
  deliveryNote: CustomerDeliveryNote
  project: CustomerProject
}

interface PublishOrderParams {
  project: CustomerProject
  appendAgb?: boolean
}

interface PublishResult {
  success: boolean
  documentId?: string
  error?: string
}

/**
 * Publishes an invoice PDF to the customer portal
 * Call this after creating an invoice
 */
export async function publishInvoiceToPortal(params: PublishInvoiceParams): Promise<PublishResult> {
  const { invoice, project } = params

  try {
    const response = await fetch('/api/portal/publish-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentType: 'invoice',
        projectId: project.id,
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          type: invoice.type,
          amount: invoice.amount,
          date: invoice.invoiceDate,
          description: invoice.description,
        },
        project: {
          id: project.id,
          customerName: project.customerName,
          address: project.address,
          phone: project.phone,
          email: project.email,
          orderNumber: project.orderNumber,
          customerId: project.customerId,
          items: project.items?.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            pricePerUnit: item.pricePerUnit,
            netTotal: item.netTotal,
            taxRate: item.taxRate,
          })),
        },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      logger.error('publishInvoiceToPortal: API error', {
        component: 'portalDocuments',
        status: response.status,
        error: data.error,
      })
      return { success: false, error: data.error }
    }

    logger.info(`Invoice published to portal: ${invoice.invoiceNumber}`, {
      component: 'portalDocuments',
      documentId: data.documentId,
      projectId: project.id,
    })

    return { success: true, documentId: data.documentId }
  } catch (error) {
    logger.error('publishInvoiceToPortal: Failed', {
      component: 'portalDocuments',
      invoiceId: invoice.id,
      error,
    })
    return { success: false, error: 'Netzwerkfehler' }
  }
}

/**
 * Publishes a customer delivery note PDF to the customer portal
 * Call this after creating a delivery note
 */
export async function publishDeliveryNoteToPortal(params: PublishDeliveryNoteParams): Promise<PublishResult> {
  const { deliveryNote, project } = params

  try {
    const response = await fetch('/api/portal/publish-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentType: 'delivery_note',
        projectId: project.id,
        deliveryNote: {
          id: deliveryNote.id,
          deliveryNoteNumber: deliveryNote.deliveryNoteNumber,
          deliveryDate: deliveryNote.deliveryDate,
          deliveryAddress: deliveryNote.deliveryAddress,
          items: deliveryNote.items,
        },
        project: {
          id: project.id,
          customerName: project.customerName,
          address: project.address,
          phone: project.phone,
          email: project.email,
          orderNumber: project.orderNumber,
          customerId: project.customerId,
        },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      // 501 means not implemented yet - don't log as error
      if (response.status === 501) {
        logger.warn('publishDeliveryNoteToPortal: Not implemented yet', {
          component: 'portalDocuments',
        })
        return { success: false, error: 'Nicht implementiert' }
      }
      logger.error('publishDeliveryNoteToPortal: API error', {
        component: 'portalDocuments',
        status: response.status,
        error: data.error,
      })
      return { success: false, error: data.error }
    }

    logger.info(`Delivery note published to portal: ${deliveryNote.deliveryNoteNumber}`, {
      component: 'portalDocuments',
      documentId: data.documentId,
      projectId: project.id,
    })

    return { success: true, documentId: data.documentId }
  } catch (error) {
    logger.error('publishDeliveryNoteToPortal: Failed', {
      component: 'portalDocuments',
      deliveryNoteId: deliveryNote.id,
      error,
    })
    return { success: false, error: 'Netzwerkfehler' }
  }
}

/**
 * Publishes an order/contract PDF to the customer portal
 * Call this when order is finalized
 */
export async function publishOrderToPortal(params: PublishOrderParams): Promise<PublishResult> {
  const { project, appendAgb = true } = params

  try {
    const response = await fetch('/api/portal/publish-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentType: 'order',
        projectId: project.id,
        appendAgb,
        project: {
          id: project.id,
          customerName: project.customerName,
          address: project.address,
          phone: project.phone,
          email: project.email,
          orderNumber: project.orderNumber,
          customerId: project.customerId,
          items: project.items?.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            pricePerUnit: item.pricePerUnit,
            netTotal: item.netTotal,
            taxRate: item.taxRate,
          })),
        },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      // 501 means not implemented yet
      if (response.status === 501) {
        logger.warn('publishOrderToPortal: Not implemented yet', {
          component: 'portalDocuments',
        })
        return { success: false, error: 'Nicht implementiert' }
      }
      logger.error('publishOrderToPortal: API error', {
        component: 'portalDocuments',
        status: response.status,
        error: data.error,
      })
      return { success: false, error: data.error }
    }

    logger.info(`Order published to portal: ${project.orderNumber}`, {
      component: 'portalDocuments',
      documentId: data.documentId,
      projectId: project.id,
    })

    return { success: true, documentId: data.documentId }
  } catch (error) {
    logger.error('publishOrderToPortal: Failed', {
      component: 'portalDocuments',
      projectId: project.id,
      error,
    })
    return { success: false, error: 'Netzwerkfehler' }
  }
}
