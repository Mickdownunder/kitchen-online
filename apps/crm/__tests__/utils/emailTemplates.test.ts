/**
 * Unit tests for email template utilities.
 */

import type { CustomerProject, PartialPayment, Complaint, InvoiceItem } from '@/types'
import { ProjectStatus } from '@/types'
import {
  orderTemplate,
  invoiceTemplate,
  reminderTemplate,
  deliveryNoteTemplate,
  complaintTemplate,
} from '@/lib/utils/emailTemplates'

const MINIMAL_PROJECT = {
  id: 'proj-1',
  customerName: 'Max Mustermann',
  orderNumber: 'K-2026-0001',
  status: ProjectStatus.PLANNING,
  email: 'max@example.com',
  createdAt: '',
  updatedAt: '',
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
} satisfies CustomerProject

describe('orderTemplate', () => {
  it('returns subject, html, text with project data', () => {
    const result = orderTemplate(MINIMAL_PROJECT, 'https://example.com/sign', 'Firma GmbH')

    expect(result.subject).toContain('K-2026-0001')
    expect(result.subject).toContain('unterschreiben')
    expect(result.html).toContain('Max Mustermann')
    expect(result.html).toContain('https://example.com/sign')
    expect(result.text).toContain('K-2026-0001')
  })

  it('uses default company name when not provided', () => {
    const result = orderTemplate(MINIMAL_PROJECT, 'https://x.com')

    expect(result.html).toContain('Ihr Unternehmen')
  })
})

describe('invoiceTemplate', () => {
  const invoice = {
    invoiceNumber: 'RE-2026-0001',
    amount: 1200,
    date: '2026-01-15',
  }

  it('returns subject, html, text with invoice data', () => {
    const result = invoiceTemplate(MINIMAL_PROJECT, invoice, 'Firma GmbH')

    expect(result.subject).toBe('Rechnung RE-2026-0001')
    expect(result.html).toContain('RE-2026-0001')
    expect(result.html).toContain('1200.00')
    expect(result.text).toContain('Betrag: 1200.00 €')
  })
})

describe('reminderTemplate', () => {
  const invoice = {
    invoiceNumber: 'RE-2026-0001',
    amount: 1200,
    date: '2026-01-15',
    dueDate: '2026-01-30',
  }

  it('returns subject with reminder type for first reminder', () => {
    const result = reminderTemplate(
      MINIMAL_PROJECT,
      invoice as PartialPayment,
      'first',
      5,
      'Firma GmbH'
    )

    expect(result.subject).toBeDefined()
    expect(result.html).toContain('RE-2026-0001')
    expect(result.html).toContain('1.200') // German locale format
  })

  it('returns valid output for second reminder', () => {
    const result = reminderTemplate(
      MINIMAL_PROJECT,
      invoice as PartialPayment,
      'second',
      10,
      'Firma GmbH'
    )

    expect(result.subject).toBeDefined()
    expect(result.text).toBeDefined()
  })

  it('returns valid output for final reminder', () => {
    const result = reminderTemplate(
      MINIMAL_PROJECT,
      invoice as PartialPayment,
      'final',
      15,
      'Firma GmbH'
    )

    expect(result.subject).toContain('Rechnung')
    expect(result.html).toContain('Letzte Mahnung')
  })
})

describe('deliveryNoteTemplate', () => {
  it('returns subject and html with project data', () => {
    const result = deliveryNoteTemplate(MINIMAL_PROJECT, 'dn-1', 'Firma GmbH')

    expect(result.subject).toContain('Lieferschein')
    expect(result.subject).toContain('K-2026-0001')
    expect(result.html).toContain('Max Mustermann')
    expect(result.html).toContain('Wird noch bekannt gegeben')
  })

  it('includes items when project has items', () => {
    const projectWithItems: CustomerProject = {
      ...MINIMAL_PROJECT,
      items: [
        { id: 'item-1', position: 1, description: 'Schrank', quantity: 2, unit: 'Stk', pricePerUnit: 500, taxRate: 20, netTotal: 1000, taxAmount: 200, grossTotal: 1200 } satisfies InvoiceItem,
      ],
    }
    const result = deliveryNoteTemplate(projectWithItems, 'dn-1')

    expect(result.html).toContain('Schrank')
    expect(result.html).toContain('2')
  })
})

describe('complaintTemplate', () => {
  const complaint: Complaint = {
    id: 'c-1',
    projectId: 'proj-1',
    description: 'Tür klemmt',
    priority: 'high',
    status: 'reported',
    createdAt: '',
    updatedAt: '',
  }

  it('returns subject and html with complaint data', () => {
    const result = complaintTemplate(complaint, MINIMAL_PROJECT, 'Firma GmbH')

    expect(result.subject).toContain('Reklamation')
    expect(result.subject).toContain('K-2026-0001')
    expect(result.html).toContain('Tür klemmt')
    expect(result.html).toContain('high')
  })

  it('handles complaint with minimal fields', () => {
    const minimalComplaint: Complaint = {
      id: 'c-2',
      projectId: 'proj-1',
      description: 'Beschädigung',
      priority: 'low',
      status: 'draft',
      createdAt: '',
      updatedAt: '',
    }
    const result = complaintTemplate(minimalComplaint, MINIMAL_PROJECT)

    expect(result.html).toContain('Beschädigung')
  })
})
