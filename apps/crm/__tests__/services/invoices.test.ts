/**
 * Unit tests for the invoices service (critical subset).
 *
 * Covers: createInvoice, markInvoicePaid, markInvoiceUnpaid,
 *         getRemainingCancellableAmount, createCreditNote, getInvoiceStats.
 */

import { mockQueryResult, mockGetUser, resetMock } from './__mocks__/supabase'

// ─── Mock wiring ──────────────────────────────────────────────────────

jest.mock('@/lib/supabase/client', () => require('./__mocks__/supabase'))
jest.mock('@/lib/supabase/services/auth', () => ({
  getCurrentUser: jest.fn(),
}))
jest.mock('@/lib/supabase/services/company', () => ({
  getNextInvoiceNumber: jest.fn(),
}))
jest.mock('@/lib/utils/auditLogger', () => ({
  audit: {
    invoiceCreated: jest.fn(),
    invoicePaid: jest.fn(),
    invoiceUnpaid: jest.fn(),
  },
}))
jest.mock('@/lib/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

import { getCurrentUser } from '@/lib/supabase/services/auth'
import { getNextInvoiceNumber } from '@/lib/supabase/services/company'
import {
  createInvoice,
  markInvoicePaid,
  markInvoiceUnpaid,
  deleteInvoice,
  getInvoiceStats,
  getRemainingCancellableAmount,
  createCreditNote,
  getInvoice,
  getInvoices,
} from '@/lib/supabase/services/invoices'

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>
const mockGetNextInvoiceNumber = getNextInvoiceNumber as jest.MockedFunction<typeof getNextInvoiceNumber>

// ─── Fixtures ─────────────────────────────────────────────────────────

const MOCK_USER = { id: 'user-1', email: 'admin@example.com' }

const INVOICE_ROW = {
  id: 'inv-1',
  user_id: 'user-1',
  project_id: 'proj-1',
  invoice_number: 'RE-2026-0001',
  type: 'partial',
  amount: 1200,
  net_amount: 1000,
  tax_amount: 200,
  tax_rate: 20,
  invoice_date: '2026-01-15',
  due_date: '2026-02-15',
  is_paid: false,
  paid_date: null,
  description: 'Erste Anzahlung',
  notes: null,
  schedule_type: 'first',
  reminders: [],
  original_invoice_id: null,
  original_invoice_number: null,
  created_at: '2026-01-15T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
}

// ─── Helpers ──────────────────────────────────────────────────────────

function setAuthenticatedUser(): void {
  mockGetCurrentUser.mockResolvedValue(MOCK_USER as ReturnType<typeof getCurrentUser> extends Promise<infer T> ? T : never)
}

function setUnauthenticated(): void {
  mockGetCurrentUser.mockResolvedValue(null)
}

// ─── Tests ────────────────────────────────────────────────────────────

beforeEach(() => {
  resetMock()
  mockGetCurrentUser.mockReset()
  mockGetNextInvoiceNumber.mockReset()
})

// ─── getInvoice ───────────────────────────────────────────────────────

describe('getInvoice', () => {
  it('returns UNAUTHORIZED when no user', async () => {
    setUnauthenticated()
    const result = await getInvoice('inv-1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('UNAUTHORIZED')
  })

  it('returns invoice when found', async () => {
    setAuthenticatedUser()
    mockQueryResult({ data: INVOICE_ROW, error: null })
    const result = await getInvoice('inv-1')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.invoiceNumber).toBe('RE-2026-0001')
    }
  })

  it('returns NOT_FOUND when PGRST116', async () => {
    setAuthenticatedUser()
    mockQueryResult({ data: null, error: { code: 'PGRST116' } })
    const result = await getInvoice('nonexistent')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('NOT_FOUND')
  })
})

// ─── getInvoices ──────────────────────────────────────────────────────

describe('getInvoices', () => {
  it('returns UNAUTHORIZED when no user', async () => {
    setUnauthenticated()
    const result = await getInvoices()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('UNAUTHORIZED')
  })

  it('returns invoices when authenticated', async () => {
    setAuthenticatedUser()
    mockQueryResult({ data: [INVOICE_ROW], error: null })
    const result = await getInvoices()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toHaveLength(1)
  })

  it('filters by projectId when provided', async () => {
    setAuthenticatedUser()
    mockQueryResult({ data: [], error: null })
    const result = await getInvoices('proj-1')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual([])
  })
})

// ─── createInvoice ────────────────────────────────────────────────────

describe('createInvoice', () => {
  it('returns UNAUTHORIZED when no user', async () => {
    setUnauthenticated()

    const result = await createInvoice({
      projectId: 'proj-1',
      type: 'partial',
      amount: 1000,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('UNAUTHORIZED')
  })

  it('generates invoice number via getNextInvoiceNumber when not provided', async () => {
    setAuthenticatedUser()
    mockGetNextInvoiceNumber.mockResolvedValue('RE-2026-0042')
    mockQueryResult({ data: { ...INVOICE_ROW, invoice_number: 'RE-2026-0042' }, error: null })

    const result = await createInvoice({
      projectId: 'proj-1',
      type: 'partial',
      amount: 1200,
    })

    expect(mockGetNextInvoiceNumber).toHaveBeenCalled()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.invoiceNumber).toBe('RE-2026-0042')
    }
  })

  it('uses provided invoiceNumber instead of generating one', async () => {
    setAuthenticatedUser()
    mockQueryResult({ data: { ...INVOICE_ROW, invoice_number: 'CUSTOM-001' }, error: null })

    const result = await createInvoice({
      projectId: 'proj-1',
      type: 'partial',
      amount: 1200,
      invoiceNumber: 'CUSTOM-001',
    })

    expect(mockGetNextInvoiceNumber).not.toHaveBeenCalled()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.invoiceNumber).toBe('CUSTOM-001')
    }
  })

  it('auto-calculates net and tax from amount when not provided', async () => {
    setAuthenticatedUser()
    mockGetNextInvoiceNumber.mockResolvedValue('RE-2026-0001')
    // The service will compute: net = 1200 / 1.20 = 1000, tax = 200
    mockQueryResult({
      data: { ...INVOICE_ROW, amount: 1200, net_amount: 1000, tax_amount: 200 },
      error: null,
    })

    const result = await createInvoice({
      projectId: 'proj-1',
      type: 'partial',
      amount: 1200,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.amount).toBe(1200)
      expect(result.data.netAmount).toBe(1000)
      expect(result.data.taxAmount).toBe(200)
    }
  })

  it('returns INTERNAL on DB insert error', async () => {
    setAuthenticatedUser()
    mockGetNextInvoiceNumber.mockResolvedValue('RE-2026-0001')
    mockQueryResult({ data: null, error: { message: 'duplicate key' } })

    const result = await createInvoice({
      projectId: 'proj-1',
      type: 'partial',
      amount: 1000,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL')
      expect(result.message).toBe('duplicate key')
    }
  })
})

// ─── markInvoicePaid / markInvoiceUnpaid ──────────────────────────────

describe('markInvoicePaid', () => {
  it('returns ok with updated invoice', async () => {
    setAuthenticatedUser()
    mockQueryResult({
      data: { ...INVOICE_ROW, is_paid: true, paid_date: '2026-02-01' },
      error: null,
    })

    const result = await markInvoicePaid('inv-1', '2026-02-01')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.isPaid).toBe(true)
      expect(result.data.paidDate).toBe('2026-02-01')
    }
  })

  it('returns UNAUTHORIZED when no user', async () => {
    setUnauthenticated()
    const result = await markInvoicePaid('inv-1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('UNAUTHORIZED')
  })
})

describe('markInvoiceUnpaid', () => {
  it('returns ok with unpaid invoice', async () => {
    setAuthenticatedUser()
    mockQueryResult({
      data: { ...INVOICE_ROW, is_paid: false, paid_date: null },
      error: null,
    })

    const result = await markInvoiceUnpaid('inv-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.isPaid).toBe(false)
      expect(result.data.paidDate).toBeUndefined()
    }
  })
})

// ─── deleteInvoice ────────────────────────────────────────────────────

describe('deleteInvoice', () => {
  it('returns ok on success', async () => {
    setAuthenticatedUser()
    mockQueryResult({ data: null, error: null })

    const result = await deleteInvoice('inv-1')

    expect(result.ok).toBe(true)
  })

  it('returns UNAUTHORIZED when no user', async () => {
    setUnauthenticated()
    const result = await deleteInvoice('inv-1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('UNAUTHORIZED')
  })

  it('returns INTERNAL on DB error', async () => {
    setAuthenticatedUser()
    mockQueryResult({ data: null, error: { message: 'FK constraint' } })

    const result = await deleteInvoice('inv-1')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INTERNAL')
  })
})

// ─── getRemainingCancellableAmount ─────────────────────────────────────

describe('getRemainingCancellableAmount', () => {
  it('returns full amount when no credit notes exist', async () => {
    setAuthenticatedUser()
    // First call: getInvoice (via single())
    mockQueryResult({ data: { ...INVOICE_ROW, amount: 1200 }, error: null })
    // Second call: getExistingCreditNotes (via then/select)
    mockQueryResult({ data: [], error: null })

    const result = await getRemainingCancellableAmount('inv-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toBe(1200)
    }
  })

  it('subtracts existing credit note amounts', async () => {
    setAuthenticatedUser()
    // getInvoice
    mockQueryResult({ data: { ...INVOICE_ROW, amount: 1200 }, error: null })
    // getExistingCreditNotes returns one credit note with amount -500
    mockQueryResult({
      data: [{ ...INVOICE_ROW, id: 'cn-1', type: 'credit', amount: -500 }],
      error: null,
    })

    const result = await getRemainingCancellableAmount('inv-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toBe(700) // 1200 - abs(-500)
    }
  })

  it('returns 0 when fully cancelled', async () => {
    setAuthenticatedUser()
    mockQueryResult({ data: { ...INVOICE_ROW, amount: 1200 }, error: null })
    mockQueryResult({
      data: [{ ...INVOICE_ROW, id: 'cn-1', type: 'credit', amount: -1200 }],
      error: null,
    })

    const result = await getRemainingCancellableAmount('inv-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toBe(0)
    }
  })
})

// ─── createCreditNote ──────────────────────────────────────────────────

describe('createCreditNote', () => {
  it('returns UNAUTHORIZED when no user', async () => {
    setUnauthenticated()

    const result = await createCreditNote({ invoiceId: 'inv-1' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('UNAUTHORIZED')
  })

  it('rejects storno of a credit note', async () => {
    setAuthenticatedUser()
    // getInvoice returns a credit-type invoice
    mockQueryResult({
      data: { ...INVOICE_ROW, type: 'credit', amount: -500 },
      error: null,
    })

    const result = await createCreditNote({ invoiceId: 'cn-1' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('VALIDATION')
      expect(result.message).toContain('nicht storniert werden')
    }
  })

  it('rejects when already fully cancelled', async () => {
    setAuthenticatedUser()
    // getInvoice (for createCreditNote internal getInvoice)
    mockQueryResult({ data: { ...INVOICE_ROW, amount: 1200 }, error: null })
    // getInvoice (for getRemainingCancellableAmount -> getInvoice)
    mockQueryResult({ data: { ...INVOICE_ROW, amount: 1200 }, error: null })
    // getExistingCreditNotes returns full cancellation
    mockQueryResult({
      data: [{ ...INVOICE_ROW, id: 'cn-1', type: 'credit', amount: -1200 }],
      error: null,
    })

    const result = await createCreditNote({ invoiceId: 'inv-1' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('VALIDATION')
      expect(result.message).toContain('vollständig storniert')
    }
  })

  it('rejects partial amount exceeding remaining cancellable amount', async () => {
    setAuthenticatedUser()
    // getInvoice (createCreditNote)
    mockQueryResult({ data: { ...INVOICE_ROW, amount: 1200 }, error: null })
    // getInvoice (getRemainingCancellableAmount)
    mockQueryResult({ data: { ...INVOICE_ROW, amount: 1200 }, error: null })
    // getExistingCreditNotes (500 already cancelled)
    mockQueryResult({
      data: [{ ...INVOICE_ROW, id: 'cn-1', type: 'credit', amount: -500 }],
      error: null,
    })

    const result = await createCreditNote({
      invoiceId: 'inv-1',
      partialAmount: 800, // only 700 remaining
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('VALIDATION')
      expect(result.message).toContain('übersteigt')
    }
  })

  it('creates a full credit note with negative amounts', async () => {
    setAuthenticatedUser()
    mockGetNextInvoiceNumber.mockResolvedValue('RE-2026-0099')
    // getInvoice (createCreditNote)
    mockQueryResult({ data: { ...INVOICE_ROW, amount: 1200, net_amount: 1000, tax_amount: 200 }, error: null })
    // getInvoice (getRemainingCancellableAmount)
    mockQueryResult({ data: { ...INVOICE_ROW, amount: 1200 }, error: null })
    // getExistingCreditNotes (none)
    mockQueryResult({ data: [], error: null })
    // insert credit note
    mockQueryResult({
      data: {
        ...INVOICE_ROW,
        id: 'cn-new',
        type: 'credit',
        amount: -1200,
        net_amount: -1000,
        tax_amount: -200,
        invoice_number: 'RE-2026-0099',
        is_paid: true,
        original_invoice_id: 'inv-1',
      },
      error: null,
    })

    const result = await createCreditNote({ invoiceId: 'inv-1' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.type).toBe('credit')
      expect(result.data.amount).toBe(-1200)
      expect(result.data.isPaid).toBe(true)
    }
  })
})

// ─── getInvoiceStats ──────────────────────────────────────────────────

describe('getInvoiceStats', () => {
  it('returns empty stats when no user (graceful)', async () => {
    setUnauthenticated()

    const result = await getInvoiceStats(2026)

    // getInvoiceStats returns ok(EMPTY_STATS) when no user, not a fail
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.totalInvoiced).toBe(0)
      expect(result.data.paidCount).toBe(0)
    }
  })

  it('calculates stats from invoices data', async () => {
    setAuthenticatedUser()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-01T00:00:00Z'))

    mockQueryResult({
      data: [
        { id: 'i1', amount: 1200, is_paid: true, type: 'partial', due_date: '2026-01-15', invoice_date: '2026-01-01' },
        { id: 'i2', amount: 800, is_paid: false, type: 'final', due_date: '2026-02-15', invoice_date: '2026-02-01' },
        { id: 'i3', amount: -500, is_paid: true, type: 'credit', due_date: null, invoice_date: '2026-01-20' },
      ],
      error: null,
    })

    const result = await getInvoiceStats(2026)

    expect(result.ok).toBe(true)
    if (result.ok) {
      const s = result.data
      expect(s.totalInvoiced).toBe(1200 + 800 + (-500)) // 1500
      expect(s.totalPaid).toBe(1200 + (-500)) // 700 (paid invoices)
      expect(s.totalOutstanding).toBe(800) // only i2 unpaid
      expect(s.partialCount).toBe(1)
      expect(s.finalCount).toBe(1)
      expect(s.creditCount).toBe(1)
      expect(s.creditAmount).toBe(500) // abs(-500)
      expect(s.paidCount).toBe(2) // i1 + i3
      expect(s.overdueCount).toBe(1) // i2 unpaid and due_date < today (2026-03-01)
    }

    jest.useRealTimers()
  })

  it('returns INTERNAL on DB error', async () => {
    setAuthenticatedUser()
    mockQueryResult({ data: null, error: { message: 'timeout' } })

    const result = await getInvoiceStats(2026)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INTERNAL')
  })
})
