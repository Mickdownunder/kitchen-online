import {
  CustomerDeliveryNote,
  CustomerProject,
  DeliveryNote,
  Invoice,
  ProjectDocument,
} from '@/types'
import type { DocumentItem, DocumentType } from './projectDocuments.types'

const ALLOWED_DOCUMENT_TYPES: DocumentItem['type'][] = [
  'order',
  'invoice',
  'customer-delivery-note',
]

export function mapInvoicesToDocuments(invoices: Invoice[], project: CustomerProject): DocumentItem[] {
  return invoices.map((invoice) => {
    const isPartial = invoice.type === 'partial'
    const isCredit = invoice.type === 'credit'

    return {
      id: invoice.id,
      type: 'invoice',
      title: isCredit
        ? `Stornorechnung ${invoice.invoiceNumber}`
        : isPartial
          ? `Teilrechnung ${invoice.invoiceNumber}`
          : `Schlussrechnung ${invoice.invoiceNumber}`,
      date: invoice.invoiceDate,
      number: invoice.invoiceNumber,
      status: isCredit ? 'storniert' : invoice.isPaid ? 'bezahlt' : 'offen',
      data: {
        type: isCredit ? 'credit' : isPartial ? 'partial' : 'final',
        invoice,
        payment: isPartial
          ? {
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              amount: invoice.amount,
              date: invoice.invoiceDate,
              isPaid: invoice.isPaid,
              paidDate: invoice.paidDate,
              description: invoice.description,
            }
          : undefined,
        project,
      },
    }
  })
}

export function mapCustomerDeliveryNotesToDocuments(
  customerDeliveryNotes: CustomerDeliveryNote[],
  project: CustomerProject,
): DocumentItem[] {
  return customerDeliveryNotes.map((note) => ({
    id: `customer-ls-${note.id}`,
    type: 'customer-delivery-note',
    title: `Kunden-Lieferschein ${note.deliveryNoteNumber}`,
    date: note.deliveryDate,
    number: note.deliveryNoteNumber,
    status: note.status,
    data: { note, project },
  }))
}

export function mapSupplierDeliveryNotesToDocuments(
  supplierDeliveryNotes: DeliveryNote[],
  project: CustomerProject,
): DocumentItem[] {
  return supplierDeliveryNotes
    .filter((note) => note.matchedProjectId === project.id)
    .map((note) => ({
      id: `supplier-ls-${note.id}`,
      type: 'supplier-delivery-note',
      title: `Lieferanten-Lieferschein ${note.supplierDeliveryNoteNumber}`,
      date: note.deliveryDate,
      number: note.supplierDeliveryNoteNumber,
      status: note.status,
      data: { note, project },
    }))
}

function mapProjectDocumentType(type?: ProjectDocument['type']): DocumentItem['type'] {
  const normalizedType = type?.toLowerCase() ?? 'other'

  if (
    normalizedType.includes('angebot') ||
    normalizedType.includes('offer') ||
    normalizedType.includes('ab')
  ) {
    return 'offer'
  }

  if (normalizedType.includes('plan') || normalizedType.includes('zeichnung')) {
    return 'plan'
  }

  return 'other'
}

export function mapProjectAttachmentsToDocuments(
  projectDocuments: ProjectDocument[] | undefined,
  project: CustomerProject,
): DocumentItem[] {
  if (!projectDocuments || projectDocuments.length === 0) {
    return []
  }

  return projectDocuments.map((doc, index) => ({
    id: `doc-${index}`,
    type: mapProjectDocumentType(doc.type),
    title: doc.name || `Dokument ${index + 1}`,
    date: doc.uploadedAt || new Date().toISOString(),
    data: { document: doc, project },
  }))
}

export function mapOrderToDocument(project: CustomerProject): DocumentItem | null {
  if (!project.items || project.items.length === 0) {
    return null
  }

  return {
    id: 'order-pdf',
    type: 'order',
    title: `Auftrag ${project.orderNumber}`,
    date: project.offerDate || project.orderDate || project.updatedAt || new Date().toISOString(),
    number: project.orderNumber,
    data: { project },
  }
}

export function sortDocumentsByDateDesc(documents: DocumentItem[]): DocumentItem[] {
  return [...documents].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
  )
}

export function filterDocuments(
  documents: DocumentItem[],
  filter: DocumentType,
  searchTerm: string,
): DocumentItem[] {
  const normalizedSearch = searchTerm.trim().toLowerCase()

  return documents.filter((doc) => {
    if (!ALLOWED_DOCUMENT_TYPES.includes(doc.type)) {
      return false
    }

    const matchesFilter =
      filter === 'all' ||
      (filter === 'invoices' && doc.type === 'invoice') ||
      (filter === 'customer-delivery-notes' && doc.type === 'customer-delivery-note') ||
      (filter === 'orders' && doc.type === 'order')

    if (!matchesFilter) {
      return false
    }

    if (!normalizedSearch) {
      return true
    }

    return (
      doc.title.toLowerCase().includes(normalizedSearch) ||
      doc.number?.toLowerCase().includes(normalizedSearch) ||
      doc.status?.toLowerCase().includes(normalizedSearch)
    )
  })
}

interface PublishedDocumentRow {
  name: string | null
}

export function extractPublishedDocumentKeys(rows: PublishedDocumentRow[] | null): Set<string> {
  const published = new Set<string>()

  rows?.forEach((row) => {
    if (!row.name) {
      return
    }

    const match = row.name.match(/_([\w-]+)\.pdf$/)
    if (match) {
      published.add(match[1].replace(/-/g, '/'))
    }
  })

  return published
}

export function getDocumentPublishKey(doc: DocumentItem): string {
  return doc.number || doc.id
}
