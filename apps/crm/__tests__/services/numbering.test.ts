/**
 * Unit tests for numbering service (invoice, order, delivery note numbers).
 */

import { mockQueryResult, resetMock } from './__mocks__/supabase'

jest.mock('@/lib/supabase/client', () => require('./__mocks__/supabase'))
jest.mock('@/lib/supabase/services/auth', () => ({
  getCurrentUser: jest.fn(),
}))
jest.mock('@/lib/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

import { getCurrentUser } from '@/lib/supabase/services/auth'
import {
  getNextInvoiceNumber,
  peekNextInvoiceNumber,
  getNextOrderNumber,
  peekNextOrderNumber,
  getNextDeliveryNoteNumber,
  peekNextDeliveryNoteNumber,
} from '@/lib/supabase/services/numbering'

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>
const year = new Date().getFullYear()

beforeEach(() => {
  resetMock()
  mockGetCurrentUser.mockReset()
})

describe('getNextInvoiceNumber', () => {
  it('throws when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    await expect(getNextInvoiceNumber()).rejects.toThrow('Not authenticated')
  })

  it('throws when company settings not found', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: { message: 'not found' } })

    await expect(getNextInvoiceNumber()).rejects.toThrow('Firmeneinstellungen nicht gefunden')
  })

  it('returns next number when no existing invoices', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: { id: 'cs-1', user_id: 'user-1', invoice_prefix: 'R-', next_invoice_number: 1 },
      error: null,
    })
    mockQueryResult({ data: [], error: null })

    const result = await getNextInvoiceNumber()

    expect(result).toBe(`R-${year}-0001`)
  })

  it('returns next number from max existing', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: { id: 'cs-1', user_id: 'user-1', invoice_prefix: 'R-', next_invoice_number: 1 },
      error: null,
    })
    mockQueryResult({
      data: [{ invoice_number: `R-${year}-0005` }, { invoice_number: `R-${year}-0003` }],
      error: null,
    })

    const result = await getNextInvoiceNumber()

    expect(result).toBe(`R-${year}-0006`)
  })
})

describe('peekNextInvoiceNumber', () => {
  it('returns fallback when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await peekNextInvoiceNumber()

    expect(result).toBe(`R-${year}-0001`)
  })

  it('returns fallback when no company settings', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: null })
    mockQueryResult({ data: [], error: null })

    const result = await peekNextInvoiceNumber()

    expect(result).toBe(`R-${year}-0001`)
  })

  it('returns next number when settings exist', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: { id: 'cs-1', user_id: 'user-1', invoice_prefix: 'R-', next_invoice_number: 10 },
      error: null,
    })
    mockQueryResult({ data: [], error: null })

    const result = await peekNextInvoiceNumber()

    expect(result).toBe(`R-${year}-0010`)
  })
})

describe('getNextOrderNumber', () => {
  it('throws when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    await expect(getNextOrderNumber()).rejects.toThrow('Not authenticated')
  })

  it('throws when company settings not found', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: { message: 'not found' } })

    await expect(getNextOrderNumber()).rejects.toThrow('Firmeneinstellungen nicht gefunden')
  })

  it('returns next number and updates counter', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: { id: 'cs-1', user_id: 'user-1', order_prefix: 'K-', next_order_number: 1 },
      error: null,
    })
    mockQueryResult({ data: [], error: null })
    mockQueryResult({ data: null, error: null })

    const result = await getNextOrderNumber()

    expect(result).toBe(`K-${year}-0001`)
  })

  it('throws when update counter fails', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: { id: 'cs-1', user_id: 'user-1', order_prefix: 'K-', next_order_number: 1 },
      error: null,
    })
    mockQueryResult({ data: [], error: null })
    mockQueryResult({ data: null, error: { message: 'update failed' } })

    await expect(getNextOrderNumber()).rejects.toThrow('Fehler beim Aktualisieren')
  })
})

describe('peekNextOrderNumber', () => {
  it('returns fallback when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await peekNextOrderNumber()

    expect(result).toBe(`K-${year}-0001`)
  })

  it('returns next number when settings exist', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: { id: 'cs-1', user_id: 'user-1', order_prefix: 'K-', next_order_number: 5 },
      error: null,
    })
    mockQueryResult({ data: [], error: null })

    const result = await peekNextOrderNumber()

    expect(result).toBe(`K-${year}-0005`)
  })
})

describe('getNextDeliveryNoteNumber', () => {
  it('throws when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    await expect(getNextDeliveryNoteNumber()).rejects.toThrow('Not authenticated')
  })

  it('throws when company settings not found', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: { message: 'not found' } })

    await expect(getNextDeliveryNoteNumber()).rejects.toThrow('Firmeneinstellungen nicht gefunden')
  })

  it('returns next number when no existing delivery notes', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: {
        id: 'cs-1',
        user_id: 'user-1',
        delivery_note_prefix: 'LS-',
        next_delivery_note_number: 1,
      },
      error: null,
    })
    mockQueryResult({ data: [], error: null })

    const result = await getNextDeliveryNoteNumber()

    expect(result).toBe(`LS-${year}-0001`)
  })
})

describe('peekNextDeliveryNoteNumber', () => {
  it('returns fallback when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await peekNextDeliveryNoteNumber()

    expect(result).toBe(`LS-${year}-0001`)
  })

  it('returns next number when settings exist', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: {
        id: 'cs-1',
        user_id: 'user-1',
        delivery_note_prefix: 'LS-',
        next_delivery_note_number: 3,
      },
      error: null,
    })
    mockQueryResult({ data: [], error: null })

    const result = await peekNextDeliveryNoteNumber()

    expect(result).toBe(`LS-${year}-0003`)
  })
})
