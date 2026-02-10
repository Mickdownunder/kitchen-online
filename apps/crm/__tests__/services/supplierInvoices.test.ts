/**
 * Unit tests for supplierInvoices service (queries + commands).
 * Covers: getSupplierInvoices, getSupplierInvoice, getSupplierInvoicesByDateRange,
 * getOpenSupplierInvoices, getOverdueSupplierInvoices, getSupplierInvoiceStats,
 * getInputTaxForUVA, createSupplierInvoice, updateSupplierInvoice,
 * markSupplierInvoicePaid/Unpaid, deleteSupplierInvoice, custom categories.
 */

import { mockQueryResult, resetMock, mockGetUser } from './__mocks__/supabase'

jest.mock('@/lib/supabase/client', () => require('./__mocks__/supabase'))
jest.mock('@/lib/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

import {
  getSupplierInvoices,
  getSupplierInvoice,
  getSupplierInvoicesByDateRange,
  getOpenSupplierInvoices,
  getOverdueSupplierInvoices,
  getSupplierInvoiceCustomCategories,
  getSupplierInvoiceStats,
  getInputTaxForUVA,
  createSupplierInvoice,
  updateSupplierInvoice,
  markSupplierInvoicePaid,
  markSupplierInvoiceUnpaid,
  deleteSupplierInvoice,
  addSupplierInvoiceCustomCategory,
  deleteSupplierInvoiceCustomCategory,
} from '@/lib/supabase/services/supplierInvoices'

const SUPPLIER_INVOICE_ROW = {
  id: 'si-1',
  user_id: 'user-1',
  supplier_name: 'Lieferant GmbH',
  supplier_uid: null,
  supplier_address: null,
  invoice_number: 'E-2026-0001',
  invoice_date: '2026-01-15',
  due_date: '2026-02-15',
  net_amount: 1000,
  tax_amount: 200,
  gross_amount: 1200,
  tax_rate: 20,
  is_paid: false,
  paid_date: null,
  payment_method: null,
  category: 'material',
  skonto_percent: null,
  skonto_amount: null,
  project_id: null,
  document_url: null,
  document_name: null,
  notes: null,
  datev_account: null,
  cost_center: null,
  created_at: '2026-01-15T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
}

beforeEach(() => {
  resetMock()
})

// ─── Queries ─────────────────────────────────────────────────────────────

describe('getSupplierInvoices', () => {
  it('returns invoices when no filter', async () => {
    mockQueryResult({ data: [SUPPLIER_INVOICE_ROW], error: null })

    const result = await getSupplierInvoices()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].supplierName).toBe('Lieferant GmbH')
      expect(result.data[0].invoiceNumber).toBe('E-2026-0001')
    }
  })

  it('returns invoices filtered by projectId', async () => {
    mockQueryResult({ data: [SUPPLIER_INVOICE_ROW], error: null })

    const result = await getSupplierInvoices('proj-1')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toHaveLength(1)
  })

  it('returns INTERNAL on DB error', async () => {
    mockQueryResult({ data: null, error: { message: 'DB error' } })

    const result = await getSupplierInvoices()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL')
      expect(result.message).toBe('DB error')
    }
  })
})

describe('getSupplierInvoice', () => {
  it('returns invoice when found', async () => {
    mockQueryResult({ data: SUPPLIER_INVOICE_ROW, error: null })

    const result = await getSupplierInvoice('si-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('si-1')
      expect(result.data.invoiceNumber).toBe('E-2026-0001')
    }
  })

  it('returns NOT_FOUND when PGRST116', async () => {
    mockQueryResult({ data: null, error: { code: 'PGRST116' } })

    const result = await getSupplierInvoice('nonexistent')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('NOT_FOUND')
      expect(result.message).toContain('not found')
    }
  })

  it('returns INTERNAL on other error', async () => {
    mockQueryResult({ data: null, error: { message: 'timeout' } })

    const result = await getSupplierInvoice('si-1')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INTERNAL')
  })
})

describe('getSupplierInvoicesByDateRange', () => {
  it('returns invoices in date range', async () => {
    mockQueryResult({ data: [SUPPLIER_INVOICE_ROW], error: null })

    const result = await getSupplierInvoicesByDateRange('2026-01-01', '2026-01-31')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toHaveLength(1)
  })

  it('returns INTERNAL on error', async () => {
    mockQueryResult({ data: null, error: { message: 'error' } })

    const result = await getSupplierInvoicesByDateRange('2026-01-01', '2026-01-31')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INTERNAL')
  })
})

describe('getOpenSupplierInvoices', () => {
  it('returns open invoices', async () => {
    mockQueryResult({ data: [SUPPLIER_INVOICE_ROW], error: null })

    const result = await getOpenSupplierInvoices()

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toHaveLength(1)
  })

  it('returns INTERNAL on error', async () => {
    mockQueryResult({ data: null, error: { message: 'error' } })

    const result = await getOpenSupplierInvoices()

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INTERNAL')
  })
})

describe('getOverdueSupplierInvoices', () => {
  it('returns overdue invoices', async () => {
    mockQueryResult({ data: [SUPPLIER_INVOICE_ROW], error: null })

    const result = await getOverdueSupplierInvoices()

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toHaveLength(1)
  })

  it('returns INTERNAL on error', async () => {
    mockQueryResult({ data: null, error: { message: 'error' } })

    const result = await getOverdueSupplierInvoices()

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INTERNAL')
  })
})

describe('getSupplierInvoiceCustomCategories', () => {
  it('returns custom categories', async () => {
    mockQueryResult({
      data: [{ id: 'cat-1', user_id: 'user-1', name: 'Sonstiges', created_at: '2026-01-01' }],
      error: null,
    })

    const result = await getSupplierInvoiceCustomCategories()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Sonstiges')
    }
  })

  it('returns INTERNAL on error', async () => {
    mockQueryResult({ data: null, error: { message: 'error' } })

    const result = await getSupplierInvoiceCustomCategories()

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INTERNAL')
  })
})

describe('getSupplierInvoiceStats', () => {
  it('returns stats from date range', async () => {
    mockQueryResult({ data: [SUPPLIER_INVOICE_ROW], error: null })

    const result = await getSupplierInvoiceStats('2026-01-01', '2026-01-31')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.totalCount).toBe(1)
      expect(result.data.totalNetAmount).toBeDefined()
    }
  })

  it('returns INTERNAL when getSupplierInvoicesByDateRange fails', async () => {
    mockQueryResult({ data: null, error: { message: 'error' } })

    const result = await getSupplierInvoiceStats('2026-01-01', '2026-01-31')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INTERNAL')
  })
})

describe('getInputTaxForUVA', () => {
  it('returns input tax buckets', async () => {
    mockQueryResult({ data: [SUPPLIER_INVOICE_ROW], error: null })

    const result = await getInputTaxForUVA('2026-01-01', '2026-01-31')

    expect(result.ok).toBe(true)
    if (result.ok) expect(Array.isArray(result.data)).toBe(true)
  })

  it('returns INTERNAL when getSupplierInvoicesByDateRange fails', async () => {
    mockQueryResult({ data: null, error: { message: 'error' } })

    const result = await getInputTaxForUVA('2026-01-01', '2026-01-31')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INTERNAL')
  })
})

// ─── Commands ────────────────────────────────────────────────────────────

describe('createSupplierInvoice', () => {
  it('returns UNAUTHORIZED when no user', async () => {
    mockGetUser(null)

    const result = await createSupplierInvoice({
      supplierName: 'X',
      invoiceNumber: 'E-1',
      netAmount: 100,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('UNAUTHORIZED')
  })

  it('creates invoice and returns mapped data', async () => {
    mockGetUser({ id: 'user-1' })
    mockQueryResult({
      data: { ...SUPPLIER_INVOICE_ROW, id: 'si-new', invoice_number: 'E-2026-0002' },
      error: null,
    })

    const result = await createSupplierInvoice({
      supplierName: 'Lieferant GmbH',
      invoiceNumber: 'E-2026-0002',
      netAmount: 1000,
      invoiceDate: '2026-01-15',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('si-new')
      expect(result.data.invoiceNumber).toBe('E-2026-0002')
    }
  })

  it('returns INTERNAL on insert error', async () => {
    mockGetUser({ id: 'user-1' })
    mockQueryResult({ data: null, error: { message: 'duplicate key' } })

    const result = await createSupplierInvoice({
      supplierName: 'X',
      invoiceNumber: 'E-1',
      netAmount: 100,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL')
      expect(result.message).toBe('duplicate key')
    }
  })
})

describe('updateSupplierInvoice', () => {
  it('updates invoice and returns mapped data', async () => {
    mockQueryResult({
      data: { ...SUPPLIER_INVOICE_ROW, supplier_name: 'Updated GmbH' },
      error: null,
    })

    const result = await updateSupplierInvoice('si-1', { supplierName: 'Updated GmbH' })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.supplierName).toBe('Updated GmbH')
  })

  it('returns INTERNAL on update error', async () => {
    mockQueryResult({ data: null, error: { message: 'constraint' } })

    const result = await updateSupplierInvoice('si-1', { supplierName: 'X' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INTERNAL')
  })
})

describe('markSupplierInvoicePaid', () => {
  it('returns ok with paid invoice', async () => {
    mockQueryResult({
      data: {
        ...SUPPLIER_INVOICE_ROW,
        is_paid: true,
        paid_date: '2026-02-01',
        payment_method: 'bank_transfer',
      },
      error: null,
    })

    const result = await markSupplierInvoicePaid('si-1', '2026-02-01', 'bank_transfer')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.isPaid).toBe(true)
      expect(result.data.paidDate).toBe('2026-02-01')
    }
  })

  it('uses today when paidDate not provided', async () => {
    mockQueryResult({
      data: { ...SUPPLIER_INVOICE_ROW, is_paid: true, paid_date: '2026-02-10' },
      error: null,
    })

    const result = await markSupplierInvoicePaid('si-1')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.isPaid).toBe(true)
  })
})

describe('markSupplierInvoiceUnpaid', () => {
  it('returns ok with unpaid invoice', async () => {
    mockQueryResult({
      data: { ...SUPPLIER_INVOICE_ROW, is_paid: false, paid_date: null, payment_method: null },
      error: null,
    })

    const result = await markSupplierInvoiceUnpaid('si-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.isPaid).toBe(false)
      expect(result.data.paidDate).toBeUndefined()
    }
  })
})

describe('deleteSupplierInvoice', () => {
  it('returns ok on success', async () => {
    mockQueryResult({ data: null, error: null })

    const result = await deleteSupplierInvoice('si-1')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBeUndefined()
  })

  it('returns INTERNAL on DB error', async () => {
    mockQueryResult({ data: null, error: { message: 'FK constraint' } })

    const result = await deleteSupplierInvoice('si-1')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL')
      expect(result.message).toBe('FK constraint')
    }
  })
})

describe('addSupplierInvoiceCustomCategory', () => {
  it('returns UNAUTHORIZED when no user', async () => {
    mockGetUser(null)

    const result = await addSupplierInvoiceCustomCategory('Sonstiges')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION when name is empty', async () => {
    mockGetUser({ id: 'user-1' })

    const result = await addSupplierInvoiceCustomCategory('   ')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION')
  })

  it('creates category and returns mapped data', async () => {
    mockGetUser({ id: 'user-1' })
    mockQueryResult({
      data: { id: 'cat-new', user_id: 'user-1', name: 'Sonstiges', created_at: '2026-01-01' },
      error: null,
    })

    const result = await addSupplierInvoiceCustomCategory('Sonstiges')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('cat-new')
      expect(result.data.name).toBe('Sonstiges')
    }
  })

  it('returns INTERNAL on insert error', async () => {
    mockGetUser({ id: 'user-1' })
    mockQueryResult({ data: null, error: { message: 'unique violation' } })

    const result = await addSupplierInvoiceCustomCategory('Sonstiges')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INTERNAL')
  })
})

describe('deleteSupplierInvoiceCustomCategory', () => {
  it('returns ok on success', async () => {
    mockQueryResult({ data: null, error: null })

    const result = await deleteSupplierInvoiceCustomCategory('cat-1')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBeUndefined()
  })

  it('returns INTERNAL on DB error', async () => {
    mockQueryResult({ data: null, error: { message: 'error' } })

    const result = await deleteSupplierInvoiceCustomCategory('cat-1')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INTERNAL')
  })
})
