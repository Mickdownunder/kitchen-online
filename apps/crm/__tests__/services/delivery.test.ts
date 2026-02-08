/**
 * Unit tests for delivery service.
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
import { getDeliveryNotes, getDeliveryNote } from '@/lib/supabase/services/delivery'

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>

beforeEach(() => {
  resetMock()
  mockGetCurrentUser.mockReset()
})

describe('getDeliveryNotes', () => {
  it('returns empty array when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await getDeliveryNotes()

    expect(result).toEqual([])
  })

  it('returns mapped delivery notes when user authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: [
        {
          id: 'dn-1',
          user_id: 'user-1',
          supplier_name: 'Lieferant GmbH',
          supplier_delivery_note_number: 'LS-001',
          delivery_date: '2026-01-15',
          received_date: '2026-01-15',
          status: 'received',
          delivery_note_items: [],
        },
      ],
      error: null,
    })

    const result = await getDeliveryNotes()

    expect(result).toHaveLength(1)
    expect(result[0].supplierName).toBe('Lieferant GmbH')
  })

  it('returns empty array when query errors', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: { message: 'DB error' } })

    const result = await getDeliveryNotes()

    expect(result).toEqual([])
  })
})

describe('getDeliveryNote', () => {
  it('returns null when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await getDeliveryNote('dn-1')

    expect(result).toBeNull()
  })

  it('returns delivery note when found', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: {
        id: 'dn-1',
        user_id: 'user-1',
        supplier_name: 'Lieferant GmbH',
        supplier_delivery_note_number: 'LS-001',
        delivery_date: '2026-01-15',
        received_date: '2026-01-15',
        status: 'received',
        delivery_note_items: [],
      },
      error: null,
    })

    const result = await getDeliveryNote('dn-1')

    expect(result).not.toBeNull()
    expect(result?.supplierName).toBe('Lieferant GmbH')
  })
})
