import { ProjectStatus, type CustomerProject, type Invoice } from '@/types'
import {
  extractPublishedDocumentKeys,
  filterDocuments,
  mapInvoicesToDocuments,
  mapOrderToDocument,
  mapProjectAttachmentsToDocuments,
} from '@/components/Project/projectDocuments.mappers'
import type { DocumentItem } from '@/components/Project/projectDocuments.types'

function makeProject(overrides: Partial<CustomerProject> = {}): CustomerProject {
  return {
    id: 'project-1',
    customerName: 'Max Mustermann',
    orderNumber: 'K-2026-0001',
    status: ProjectStatus.PLANNING,
    items: [],
    totalAmount: 0,
    netAmount: 0,
    taxAmount: 0,
    depositAmount: 0,
    isDepositPaid: false,
    isFinalPaid: false,
    isMeasured: false,
    isOrdered: false,
    isInstallationAssigned: false,
    documents: [],
    complaints: [],
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'inv-1',
    userId: 'user-1',
    projectId: 'project-1',
    invoiceNumber: 'RE-2026-0001',
    type: 'partial',
    amount: 1000,
    netAmount: 833.33,
    taxAmount: 166.67,
    taxRate: 20,
    invoiceDate: '2026-01-10',
    isPaid: false,
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-01-10T00:00:00.000Z',
    ...overrides,
  }
}

describe('projectDocuments.mappers', () => {
  it('maps invoices into document cards with correct labels', () => {
    const project = makeProject()
    const docs = mapInvoicesToDocuments(
      [
        makeInvoice({ id: 'partial-1', type: 'partial', invoiceNumber: 'TR-1', isPaid: false }),
        makeInvoice({ id: 'final-1', type: 'final', invoiceNumber: 'SR-1', isPaid: true }),
        makeInvoice({ id: 'credit-1', type: 'credit', invoiceNumber: 'ST-1', isPaid: true }),
      ],
      project,
    )

    expect(docs.map((doc) => doc.title)).toEqual([
      'Teilrechnung TR-1',
      'Schlussrechnung SR-1',
      'Stornorechnung ST-1',
    ])
    expect(docs.map((doc) => doc.status)).toEqual(['offen', 'bezahlt', 'storniert'])
    expect(docs[0].data.payment).toBeDefined()
    expect(docs[1].data.payment).toBeUndefined()
  })

  it('maps project attachments into offer/plan document types', () => {
    const project = makeProject({
      documents: [
        {
          id: 'doc-1',
          name: 'Angebot.pdf',
          mimeType: 'application/pdf',
          data: 'base64',
          uploadedAt: '2026-01-01',
          type: 'Offer',
        },
        {
          id: 'doc-2',
          name: 'Kuechenplan.pdf',
          mimeType: 'application/pdf',
          data: 'base64',
          uploadedAt: '2026-01-02',
          type: 'Other',
        },
      ],
    })

    const docs = mapProjectAttachmentsToDocuments(project.documents, project)

    expect(docs.map((doc) => doc.type)).toEqual(['offer', 'other'])
  })

  it('creates an order document only when project has items', () => {
    const withoutItems = makeProject({ items: [] })
    const withItems = makeProject({
      items: [
        {
          id: 'item-1',
          position: 1,
          description: 'Unterschrank',
          quantity: 1,
          unit: 'Stk',
          pricePerUnit: 500,
          taxRate: 20,
          netTotal: 500,
          taxAmount: 100,
          grossTotal: 600,
        },
      ],
    })

    expect(mapOrderToDocument(withoutItems)).toBeNull()
    const orderDoc = mapOrderToDocument(withItems)
    expect(orderDoc?.type).toBe('order')
    expect(orderDoc?.number).toBe('K-2026-0001')
  })

  it('filters by allowed document types, selected filter and search term', () => {
    const docs: DocumentItem[] = [
      { id: '1', type: 'invoice', title: 'Schlussrechnung SR-1', date: '2026-01-10', number: 'SR-1', status: 'offen', data: {} },
      { id: '2', type: 'customer-delivery-note', title: 'Kunden-Lieferschein LS-2', date: '2026-01-11', number: 'LS-2', status: 'sent', data: {} },
      { id: '3', type: 'supplier-delivery-note', title: 'Lieferanten-Lieferschein SL-3', date: '2026-01-12', number: 'SL-3', status: 'received', data: {} },
      { id: '4', type: 'order', title: 'Auftrag K-2026-0001', date: '2026-01-13', number: 'K-2026-0001', status: 'draft', data: {} },
    ]

    expect(filterDocuments(docs, 'all', '').map((doc) => doc.id)).toEqual(['1', '2', '4'])
    expect(filterDocuments(docs, 'invoices', '').map((doc) => doc.id)).toEqual(['1'])
    expect(filterDocuments(docs, 'orders', '2026-0001').map((doc) => doc.id)).toEqual(['4'])
  })

  it('extracts publish keys from stored document names', () => {
    const keys = extractPublishedDocumentKeys([
      { name: 'portal/RECHNUNGEN_RE-2026-0001.pdf' },
      { name: 'portal/KAUFVERTRAG_K-2026-0001.pdf' },
      { name: null },
    ])

    expect(keys.has('RE/2026/0001')).toBe(true)
    expect(keys.has('K/2026/0001')).toBe(true)
    expect(keys.size).toBe(2)
  })
})
