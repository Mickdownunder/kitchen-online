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
import {
  getOrders,
  getOrder,
  getOrderByNumber,
  getOrderByProject,
  getOrdersWithProject,
  createOrder,
  updateOrder,
  deleteOrder,
  sendOrder,
  confirmOrder,
  cancelOrder,
  upsertOrderForProject,
  getOrderStats,
} from '@/lib/supabase/services/orders'

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>

beforeEach(() => {
  resetMock()
  mockGetCurrentUser.mockReset()
})

describe('getOrders', () => {
  it('returns unauthorized when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await getOrders()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
    }
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

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].orderNumber).toBe('K-2026-0001')
    }
  })

  it('filters by projectId when provided', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: [], error: null })

    const result = await getOrders('proj-1')

    expect(result.ok).toBe(true)
    expect(mockGetCurrentUser).toHaveBeenCalled()
  })
})

describe('getOrder', () => {
  it('returns unauthorized when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await getOrder('order-1')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
    }
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

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.orderNumber).toBe('K-2026-0001')
    }
  })
})

describe('getOrderByNumber', () => {
  it('returns unauthorized when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const result = await getOrderByNumber('K-2026-0001')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
    }
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
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.orderNumber).toBe('K-2026-0001')
    }
  })
})

describe('getOrderByProject', () => {
  it('returns unauthorized when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const result = await getOrderByProject('proj-1')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
    }
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
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.projectId).toBe('proj-1')
    }
  })
})

const ORDER_ROW = {
  id: 'order-1',
  user_id: 'user-1',
  project_id: 'proj-1',
  order_number: 'K-2026-0001',
  status: 'active',
  created_at: '2026-01-15T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
}

describe('createOrder', () => {
  it('returns unauthorized when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const result = await createOrder({ projectId: 'proj-1', orderNumber: 'K-2026-0001' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
    }
  })

  it('creates order', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: { ...ORDER_ROW, id: 'order-new' }, error: null })

    const result = await createOrder({ projectId: 'proj-1', orderNumber: 'K-2026-0001' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('order-new')
    }
  })
})

describe('updateOrder', () => {
  it('returns unauthorized when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const result = await updateOrder('order-1', { status: 'sent' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
    }
  })

  it('updates order', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: { ...ORDER_ROW, status: 'sent' }, error: null })

    const result = await updateOrder('order-1', { status: 'sent' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.status).toBe('sent')
    }
  })
})

describe('deleteOrder', () => {
  it('succeeds when user authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: null })

    await expect(deleteOrder('order-1')).resolves.toEqual({ ok: true, data: undefined })
  })

  it('returns INTERNAL on delete error', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: { message: 'constraint' } })

    const result = await deleteOrder('order-1')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INTERNAL')
  })
})

describe('sendOrder', () => {
  it('updates order status to sent', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: { ...ORDER_ROW, status: 'sent' }, error: null })

    const result = await sendOrder('order-1')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.status).toBe('sent')
  })

  it('returns UNAUTHORIZED when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const result = await sendOrder('order-1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('UNAUTHORIZED')
  })
})

describe('confirmOrder', () => {
  it('updates order status to confirmed', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: { ...ORDER_ROW, status: 'confirmed' }, error: null })

    const result = await confirmOrder('order-1')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.status).toBe('confirmed')
  })
})

describe('cancelOrder', () => {
  it('updates order status to cancelled', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: { ...ORDER_ROW, status: 'cancelled' }, error: null })

    const result = await cancelOrder('order-1')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.status).toBe('cancelled')
  })
})

describe('upsertOrderForProject', () => {
  it('updates existing order when order exists for project', async () => {
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
    mockQueryResult({
      data: {
        id: 'order-1',
        user_id: 'user-1',
        project_id: 'proj-1',
        order_number: 'K-2026-0002',
        status: 'active',
        created_at: '2026-01-15T00:00:00Z',
        updated_at: '2026-01-15T00:00:00Z',
      },
      error: null,
    })

    const result = await upsertOrderForProject('proj-1', 'K-2026-0002', {})

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('order-1')
      expect(result.data.orderNumber).toBe('K-2026-0002')
    }
  })

  it('creates order when no order exists for project', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: { code: 'PGRST116' } })
    mockQueryResult({
      data: {
        id: 'order-new',
        user_id: 'user-1',
        project_id: 'proj-1',
        order_number: 'K-2026-0001',
        status: 'draft',
        created_at: '2026-01-15T00:00:00Z',
        updated_at: '2026-01-15T00:00:00Z',
      },
      error: null,
    })

    const result = await upsertOrderForProject('proj-1', 'K-2026-0001', {})

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('order-new')
      expect(result.data.projectId).toBe('proj-1')
    }
  })
})

describe('getOrdersWithProject', () => {
  it('returns orders with project data', async () => {
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
          projects: { id: 'proj-1', customer_name: 'Test', total_amount: 1000 },
        },
      ],
      error: null,
    })

    const result = await getOrdersWithProject()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].orderNumber).toBe('K-2026-0001')
    }
  })
})

describe('getOrderStats', () => {
  it('returns unauthorized when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await getOrderStats()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
    }
  })

  it('returns order stats', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: [{ status: 'active' }, { status: 'sent' }], error: null })

    const result = await getOrderStats()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toBeDefined()
      expect(typeof result.data.total).toBe('number')
    }
  })
})
