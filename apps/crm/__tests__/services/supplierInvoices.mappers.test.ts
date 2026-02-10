import {
  buildInputTaxBuckets,
  buildSupplierInvoiceStats,
  mapCreateInputToInsert,
  mapCustomCategoryFromRow,
  mapSupplierInvoiceFromRow,
  mapUpdateInputToRow,
} from '@/lib/supabase/services/supplierInvoices/mappers'
import type {
  SupplierInvoiceCustomCategoryRow,
  SupplierInvoiceRow,
} from '@/lib/supabase/services/supplierInvoices/types'
import type { SupplierInvoice } from '@/types'

function makeSupplierInvoiceRow(overrides: Partial<SupplierInvoiceRow> = {}): SupplierInvoiceRow {
  return {
    id: 'si-1',
    user_id: 'user-1',
    supplier_name: 'Muster Lieferant GmbH',
    supplier_uid: 'ATU12345678',
    supplier_address: 'Musterstrasse 1',
    invoice_number: 'RE-1001',
    invoice_date: '2026-02-01',
    due_date: '2026-02-15',
    net_amount: 100,
    tax_amount: 20,
    gross_amount: 120,
    tax_rate: 20,
    is_paid: false,
    paid_date: null,
    payment_method: null,
    category: 'material',
    skonto_percent: 2,
    skonto_amount: 2.4,
    project_id: 'project-1',
    document_url: 'https://example.com/doc.pdf',
    document_name: 'doc.pdf',
    notes: 'Hinweis',
    datev_account: '3400',
    cost_center: 'CC-1',
    created_at: '2026-02-01T10:00:00.000Z',
    updated_at: '2026-02-02T10:00:00.000Z',
    ...overrides,
  }
}

function makeSupplierInvoice(overrides: Partial<SupplierInvoice> = {}): SupplierInvoice {
  return {
    id: 'si-1',
    userId: 'user-1',
    supplierName: 'Muster Lieferant GmbH',
    invoiceNumber: 'RE-1001',
    invoiceDate: '2026-02-01',
    netAmount: 100,
    taxAmount: 20,
    grossAmount: 120,
    taxRate: 20,
    isPaid: false,
    category: 'material',
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-02-02T10:00:00.000Z',
    ...overrides,
  }
}

describe('supplierInvoices mappers', () => {
  it('maps supplier invoice row to domain model', () => {
    const mapped = mapSupplierInvoiceFromRow(makeSupplierInvoiceRow())

    expect(mapped).toEqual({
      id: 'si-1',
      userId: 'user-1',
      supplierName: 'Muster Lieferant GmbH',
      supplierUid: 'ATU12345678',
      supplierAddress: 'Musterstrasse 1',
      invoiceNumber: 'RE-1001',
      invoiceDate: '2026-02-01',
      dueDate: '2026-02-15',
      netAmount: 100,
      taxAmount: 20,
      grossAmount: 120,
      taxRate: 20,
      isPaid: false,
      paidDate: undefined,
      paymentMethod: undefined,
      category: 'material',
      skontoPercent: 2,
      skontoAmount: 2.4,
      projectId: 'project-1',
      documentUrl: 'https://example.com/doc.pdf',
      documentName: 'doc.pdf',
      notes: 'Hinweis',
      datevAccount: '3400',
      costCenter: 'CC-1',
      createdAt: '2026-02-01T10:00:00.000Z',
      updatedAt: '2026-02-02T10:00:00.000Z',
    })
  })

  it('maps create input into rounded insert payload', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-10T11:00:00.000Z'))

    const insert = mapCreateInputToInsert('user-1', {
      supplierName: 'Lieferant',
      invoiceNumber: 'RE-2001',
      netAmount: 99.995,
      taxRate: 20,
      skontoAmount: 1.234,
    })

    expect(insert).toEqual(
      expect.objectContaining({
        user_id: 'user-1',
        supplier_name: 'Lieferant',
        invoice_number: 'RE-2001',
        invoice_date: '2026-02-10',
        net_amount: 100,
        tax_amount: 20,
        gross_amount: 120,
        skonto_amount: 1.23,
      }),
    )

    jest.useRealTimers()
  })

  it('maps update input to partial DB update object', () => {
    const update = mapUpdateInputToRow({
      supplierName: 'Neu',
      netAmount: 49.995,
      taxAmount: 9.999,
      grossAmount: 59.994,
      paymentMethod: 'bank',
      dueDate: '',
      documentName: '',
      projectId: null,
    })

    expect(update).toEqual({
      supplier_name: 'Neu',
      net_amount: 50,
      tax_amount: 10,
      gross_amount: 59.99,
      payment_method: 'bank',
      due_date: null,
      document_name: null,
      project_id: null,
    })
  })

  it('maps custom category row', () => {
    const row: SupplierInvoiceCustomCategoryRow = {
      id: 'cat-1',
      user_id: 'user-1',
      name: 'Sonderkategorie',
      created_at: null,
    }

    expect(mapCustomCategoryFromRow(row)).toEqual({
      id: 'cat-1',
      userId: 'user-1',
      name: 'Sonderkategorie',
      createdAt: '',
    })
  })

  it('builds supplier invoice stats including overdue and grouped sums', () => {
    const stats = buildSupplierInvoiceStats(
      [
        makeSupplierInvoice({
          id: '1',
          category: 'material',
          netAmount: 100,
          taxAmount: 20,
          grossAmount: 120,
          taxRate: 20,
          isPaid: false,
          dueDate: '2026-02-05',
        }),
        makeSupplierInvoice({
          id: '2',
          category: 'office',
          netAmount: 200,
          taxAmount: 20,
          grossAmount: 220,
          taxRate: 10,
          isPaid: true,
        }),
        makeSupplierInvoice({
          id: '3',
          category: 'material',
          netAmount: 50,
          taxAmount: 10,
          grossAmount: 60,
          taxRate: 20,
          isPaid: false,
          dueDate: '2026-02-12',
        }),
      ],
      '2026-02-10',
    )

    expect(stats.totalCount).toBe(3)
    expect(stats.totalNetAmount).toBe(350)
    expect(stats.totalTaxAmount).toBe(50)
    expect(stats.totalGrossAmount).toBe(400)
    expect(stats.paidCount).toBe(1)
    expect(stats.openCount).toBe(2)
    expect(stats.overdueCount).toBe(1)
    expect(stats.byCategory).toEqual(
      expect.arrayContaining([
        { category: 'material', count: 2, netAmount: 150, taxAmount: 30 },
        { category: 'office', count: 1, netAmount: 200, taxAmount: 20 },
      ]),
    )
    expect(stats.byTaxRate).toEqual([
      { taxRate: 20, count: 2, netAmount: 150, taxAmount: 30 },
      { taxRate: 10, count: 1, netAmount: 200, taxAmount: 20 },
    ])
  })

  it('builds and sorts input-tax buckets by tax rate descending', () => {
    const rows = buildInputTaxBuckets([
      makeSupplierInvoice({ id: '1', taxRate: 10, netAmount: 10.111, taxAmount: 1.111 }),
      makeSupplierInvoice({ id: '2', taxRate: 20, netAmount: 30.333, taxAmount: 6.667 }),
      makeSupplierInvoice({ id: '3', taxRate: 10, netAmount: 20.222, taxAmount: 2.222 }),
    ])

    expect(rows).toEqual([
      { taxRate: 20, netAmount: 30.33, taxAmount: 6.67 },
      { taxRate: 10, netAmount: 30.33, taxAmount: 3.33 },
    ])
  })
})
