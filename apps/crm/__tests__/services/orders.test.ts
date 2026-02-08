/**
 * Unit tests for orders service.
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
import { getOrders, getOrder, getOrderByNumber, getOrderByProject } from '@/lib/supabase/services/orders'

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>

beforeEach(() => {
  resetMock()
  mockGetCurrentUser.mockReset()
})

describe('getOrders', () => {
  it('returns empty array when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await getOrders()

    expect(result).toEqual([])
  })

  it('returns mapped orders when user authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: [
        {
          id: 'order-1',
          user_id: 'user-1',
          project_id: 'proj-1',
          order_number: 'K-2026-0001',
          status: 'active',
          created_at: '2026-01-15T00:00:00Z',
          updated_at: '2026-01-15T00:00:00Z',
        },
      ],
      error: null,
    })

    const result = await getOrders()

    expect(result).toHaveLength(1)
    expect(result[0].orderNumber).toBe('K-2026-0001')
  })

  it('filters by projectId when provided', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: [], error: null })

    await getOrders('proj-1')

    expect(mockGetCurrentUser).toHaveBeenCalled()
  })
})

describe('getOrder', () => {
  it('returns null when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await getOrder('order-1')

    expect(result).toBeNull()
  })

  it('returns order when found', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: {
        id: 'order-1',
        user_id: 'user-1',
        project_id: 'proj-1',
        order_number: 'K-2026-0001',
        status: 'active',
        created_at: '2026-01-15T00:00:00Z',
        updated_at: '2026-01-15T00:00:00Z',
      },
      error: null,
    })

    const result = await getOrder('order-1')

    expect(result).not.toBeNull()
    expect(result?.orderNumber).toBe('K-2026-0001')
  })
})

describe('getOrderByNumber', () => {
  it('returns null when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    expect(await getOrderByNumber('K-2026-0001')).toBeNull()
  })

  it('returns order when found', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: {
        id: 'order-1',
        user_id: 'user-1',
        project_id: 'proj-1',
        order_number: 'K-2026-0001',
        status: 'active',
        created_at: '2026-01-15T00:00:00Z',
        updated_at: '2026-01-15T00:00:00Z',
      },
      error: null,
    })

    const result = await getOrderByNumber('K-2026-0001')
    expect(result).not.toBeNull()
    expect(result?.orderNumber).toBe('K-2026-0001')
  })
})

describe('getOrderByProject', () => {
  it('returns null when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    expect(await getOrderByProject('proj-1')).toBeNull()
  })

  it('returns order when found', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: {
        id: 'order-1',
        user_id: 'user-1',
        project_id: 'proj-1',
        order_number: 'K-2026-0001',
        status: 'active',
        created_at: '2026-01-15T00:00:00Z',
        updated_at: '2026-01-15T00:00:00Z',
      },
      error: null,
    })

    const result = await getOrderByProject('proj-1')
    expect(result).not.toBeNull()
    expect(result?.projectId).toBe('proj-1')
  })
})
