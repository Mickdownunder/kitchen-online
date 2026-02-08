/**
 * Unit tests for getProject (accepts optional client for API routes).
 */

import { mockQueryResult, resetMock } from './__mocks__/supabase'

jest.mock('@/lib/supabase/client', () => require('./__mocks__/supabase'))
jest.mock('@/lib/supabase/services/auth', () => ({ getCurrentUser: jest.fn() }))
jest.mock('@/lib/supabase/services/company', () => ({ getNextOrderNumber: jest.fn() }))
jest.mock('@/lib/supabase/services/invoices', () => ({
  createInvoice: jest.fn(),
  getInvoices: jest.fn(),
}))
jest.mock('@/lib/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))
jest.mock('@/lib/utils/auditLogger', () => ({
  audit: { projectCreated: jest.fn(), projectDeleted: jest.fn() },
}))

import { getProject, getProjects } from '@/lib/supabase/services/projects'
import { supabase } from './__mocks__/supabase'
import { getCurrentUser } from '@/lib/supabase/services/auth'

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>

const PROJECT_ROW = {
  id: 'proj-1',
  user_id: 'user-1',
  customer_name: 'Max Mustermann',
  order_number: 'K-2026-0001',
  status: 'PLANNING',
  email: 'max@example.com',
  access_code: 'ABC123',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  invoice_items: [],
}

beforeEach(() => {
  resetMock()
})

describe('getProject', () => {
  it('returns project when found', async () => {
    mockQueryResult({ data: PROJECT_ROW, error: null })

    const result = await getProject('proj-1', supabase as never)

    expect(result).not.toBeNull()
    expect(result?.id).toBe('proj-1')
    expect(result?.customerName).toBe('Max Mustermann')
    expect(result?.orderNumber).toBe('K-2026-0001')
  })

  it('throws when row not found (PGRST116)', async () => {
    mockQueryResult({ data: null, error: { code: 'PGRST116', message: 'Row not found' } })

    await expect(getProject('nonexistent', supabase as never)).rejects.toMatchObject({
      code: 'PGRST116',
    })
  })

  it('throws when query errors', async () => {
    mockQueryResult({ data: null, error: new Error('Connection error') })

    await expect(getProject('proj-1', supabase as never)).rejects.toThrow('Connection error')
  })

  it('uses provided client instead of default supabase', async () => {
    mockQueryResult({ data: PROJECT_ROW, error: null })

    const result = await getProject('proj-1', supabase as never)

    expect(result).not.toBeNull()
    expect(supabase.from).toHaveBeenCalledWith('projects')
  })
})

describe('getProjects', () => {
  it('returns empty array when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await getProjects()

    expect(result).toEqual([])
  })

  it('returns mapped projects when user authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: [
        {
          ...PROJECT_ROW,
          id: 'proj-1',
          customer_name: 'Max Mustermann',
          order_number: 'K-2026-0001',
          invoice_items: [],
        },
      ],
      error: null,
    })

    const result = await getProjects()

    expect(result).toHaveLength(1)
    expect(result[0].customerName).toBe('Max Mustermann')
  })

  it('returns empty array when query errors', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: new Error('DB error') })

    const result = await getProjects()

    expect(result).toEqual([])
  })
})
