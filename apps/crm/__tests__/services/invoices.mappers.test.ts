import {
  buildInvoiceStats,
  mapCreateInvoiceToInsert,
  mapInvoiceFromRow,
  mapInvoiceUpdateToRow,
  mapInvoiceWithProjectFromRow,
} from '@/lib/supabase/services/invoices/mappers'
import type {
  InvoiceRowExt,
  InvoiceStatsRow,
  InvoiceWithProjectRow,
} from '@/lib/supabase/services/invoices/types'

function makeInvoiceRow(overrides: Partial<InvoiceRowExt> = {}): InvoiceRowExt {
  return {
    id: 'inv-1',
    user_id: 'user-1',
    project_id: 'project-1',
    invoice_number: 'RE-2026-0001',
    type: 'partial',
    amount: 1200,
    net_amount: 1000,
    tax_amount: 200,
    tax_rate: 20,
    invoice_date: '2026-02-01',
    due_date: '2026-02-05',
    is_paid: false,
    paid_date: null,
    description: 'Beschreibung',
    notes: 'Notiz',
    schedule_type: 'first',
    reminders: [],
    original_invoice_id: null,
    original_invoice_number: null,
    created_at: '2026-02-01T00:00:00.000Z',
    updated_at: '2026-02-02T00:00:00.000Z',
    ...overrides,
  }
}

describe('invoices mappers', () => {
  it('maps invoice row to domain object', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-10T00:00:00.000Z'))

    const mapped = mapInvoiceFromRow(makeInvoiceRow())

    expect(mapped.invoiceNumber).toBe('RE-2026-0001')
    expect(mapped.type).toBe('partial')
    expect(mapped.amount).toBe(1200)
    expect(mapped.overdueDays).toBe(5)

    jest.useRealTimers()
  })

  it('maps invoice with project relation', () => {
    const row: InvoiceWithProjectRow = {
      ...makeInvoiceRow(),
      project: {
        id: 'project-1',
        customer_name: 'Max Mustermann',
        order_number: 'K-2026-0001',
        customer_address: 'Musterstrasse 1',
        customer_phone: '+43123456',
        customer_email: 'max@example.com',
        customer_id: 'cust-1',
        total_amount: 1200,
        net_amount: 1000,
        tax_amount: 200,
      },
    }

    const mapped = mapInvoiceWithProjectFromRow(row)

    expect(mapped.project).toEqual(
      expect.objectContaining({
        id: 'project-1',
        customerName: 'Max Mustermann',
        orderNumber: 'K-2026-0001',
      }),
    )
  })

  it('maps create params to insert with calculated tax amounts', () => {
    const insert = mapCreateInvoiceToInsert('user-1', 'RE-2026-0002', {
      projectId: 'project-1',
      type: 'partial',
      amount: 1199.994,
      taxRate: 20,
      invoiceDate: '2026-02-10',
    })

    expect(insert).toEqual(
      expect.objectContaining({
        user_id: 'user-1',
        invoice_number: 'RE-2026-0002',
        amount: 1199.99,
        net_amount: 999.99,
        tax_amount: 200,
        is_paid: false,
      }),
    )
  })

  it('maps update input to partial update payload', () => {
    const update = mapInvoiceUpdateToRow({
      amount: 99.999,
      netAmount: 83.333,
      taxAmount: 16.666,
      reminders: [{ date: '2026-02-10', type: 'email', sentAt: '2026-02-10T00:00:00.000Z' }],
      description: 'Neu',
    })

    expect(update).toEqual(
      expect.objectContaining({
        amount: 100,
        net_amount: 83.33,
        tax_amount: 16.67,
        description: 'Neu',
      }),
    )
    expect(Array.isArray(update.reminders)).toBe(true)
  })

  it('builds invoice stats from DB rows', () => {
    const rows: InvoiceStatsRow[] = [
      { id: '1', amount: 1200, is_paid: true, type: 'partial', due_date: '2026-01-01', invoice_date: '2026-01-01' },
      { id: '2', amount: 800, is_paid: false, type: 'final', due_date: '2026-02-01', invoice_date: '2026-02-01' },
      { id: '3', amount: -500, is_paid: true, type: 'credit', due_date: null, invoice_date: '2026-02-02' },
    ]

    const stats = buildInvoiceStats(rows, '2026-03-01')

    expect(stats).toEqual({
      totalInvoiced: 1500,
      totalPaid: 700,
      totalOutstanding: 800,
      partialCount: 1,
      finalCount: 1,
      creditCount: 1,
      creditAmount: 500,
      paidCount: 2,
      overdueCount: 1,
    })
  })
})
