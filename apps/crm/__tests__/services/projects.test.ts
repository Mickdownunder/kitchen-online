/**
 * Unit tests for getProject (accepts optional client for API routes).
 */

import { mockQueryResult, resetMock } from './__mocks__/supabase'

jest.mock('@/lib/supabase/client', () => require('./__mocks__/supabase'))
jest.mock('@/lib/supabase/services/auth', () => ({ getCurrentUser: jest.fn() }))
const mockGetNextOrderNumber = jest.fn()
jest.mock('@/lib/supabase/services/company', () => ({
  getNextOrderNumber: (...args: unknown[]) => mockGetNextOrderNumber(...args),
}))
jest.mock('@/lib/supabase/services/invoices', () => ({
  createInvoice: jest.fn(),
  getInvoices: jest.fn(),
}))
jest.mock('@/lib/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))
jest.mock('@/lib/utils/auditLogger', () => ({
  audit: { projectCreated: jest.fn(), projectDeleted: jest.fn(), projectUpdated: jest.fn() },
}))

import { getProject, getProjects, createProject, updateProject, deleteProject } from '@/lib/supabase/services/projects'
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
  mockGetNextOrderNumber.mockResolvedValue('K-2026-0001')
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

describe('createProject', () => {
  it('throws when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    await expect(
      createProject({
        customerName: 'Test',
        orderNumber: 'K-2026-0001',
        status: 'Planung',
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
      })
    ).rejects.toThrow('Not authenticated')
  })

  it('creates project with minimal data', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: { ...PROJECT_ROW, id: 'proj-new', customer_name: 'Neuer Kunde' },
      error: null,
    })
    mockQueryResult({
      data: { ...PROJECT_ROW, id: 'proj-new', customer_name: 'Neuer Kunde' },
      error: null,
    })

    const result = await createProject({
      customerName: 'Neuer Kunde',
      orderNumber: 'K-2026-0002',
      status: 'Planung',
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
    })

    expect(result.id).toBe('proj-new')
    expect(result.customerName).toBe('Neuer Kunde')
  })
})

describe('updateProject', () => {
  it('throws when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    await expect(
      updateProject('proj-1', { customerName: 'Updated' })
    ).rejects.toThrow('Not authenticated')
  })

  it('updates project', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: null })
    mockQueryResult({
      data: { ...PROJECT_ROW, customer_name: 'Updated Name' },
      error: null,
    })

    const result = await updateProject('proj-1', { customerName: 'Updated Name' })

    expect(result.customerName).toBe('Updated Name')
  })
})

describe('deleteProject', () => {
  it('deletes project', async () => {
    mockQueryResult({ data: PROJECT_ROW, error: null })
    mockQueryResult({ data: null, error: null })

    await expect(deleteProject('proj-1')).resolves.toBeUndefined()
  })

  it('deletes project when getProject fails', async () => {
    mockQueryResult({ data: null, error: { code: 'PGRST116' } })
    mockQueryResult({ data: null, error: null })

    await expect(deleteProject('proj-1')).resolves.toBeUndefined()
  })
})
