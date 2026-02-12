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

import type { InvoiceItem } from '@/types'
import { ProjectStatus } from '@/types'
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

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('proj-1')
      expect(result.data.customerName).toBe('Max Mustermann')
      expect(result.data.orderNumber).toBe('K-2026-0001')
    }
  })

  it('returns not found when row is missing (PGRST116)', async () => {
    mockQueryResult({ data: null, error: { code: 'PGRST116', message: 'Row not found' } })

    const result = await getProject('nonexistent', supabase as never)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('NOT_FOUND')
    }
  })

  it('returns internal error when query fails', async () => {
    mockQueryResult({ data: null, error: new Error('Connection error') })

    const result = await getProject('proj-1', supabase as never)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL')
      expect(result.message).toBe('Connection error')
    }
  })

  it('uses provided client instead of default supabase', async () => {
    mockQueryResult({ data: PROJECT_ROW, error: null })

    const result = await getProject('proj-1', supabase as never)

    expect(result.ok).toBe(true)
    expect(supabase.from).toHaveBeenCalledWith('projects')
  })
})

describe('getProjects', () => {
  it('returns unauthorized result when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await getProjects()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
    }
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

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].customerName).toBe('Max Mustermann')
    }
  })

  it('returns internal error when query fails', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: new Error('DB error') })

    const result = await getProjects()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL')
      expect(result.message).toBe('DB error')
    }
  })
})

describe('createProject', () => {
  it('returns unauthorized when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await createProject({
      customerName: 'Test',
      orderNumber: 'K-2026-0001',
      status: ProjectStatus.PLANNING,
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

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
    }
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
      status: ProjectStatus.PLANNING,
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

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('proj-new')
      expect(result.data.customerName).toBe('Neuer Kunde')
    }
  })

  it('creates project with items', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: { ...PROJECT_ROW, id: 'proj-new', order_number: 'K-2026-0002' },
      error: null,
    })
    mockQueryResult({ data: null, error: null })
    mockQueryResult({
      data: { ...PROJECT_ROW, id: 'proj-new', order_number: 'K-2026-0002', invoice_items: [{ id: 'item-1', description: 'Item' }] },
      error: null,
    })

    const result = await createProject({
      customerName: 'Neuer Kunde',
      orderNumber: 'K-2026-0002',
      status: ProjectStatus.PLANNING,
      items: [{ description: 'Artikel 1', quantity: 1, pricePerUnit: 100 }] as InvoiceItem[],
      totalAmount: 100,
      netAmount: 100,
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

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('proj-new')
    }
  })

  it('returns INTERNAL when project insert fails', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: { message: 'unique violation' } })

    const result = await createProject({
      customerName: 'Test',
      orderNumber: 'K-2026-0001',
      status: ProjectStatus.PLANNING,
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

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INTERNAL')
  })

  it('returns INTERNAL when insertItems fails and rollback runs', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: { ...PROJECT_ROW, id: 'proj-new', order_number: 'K-2026-0002' },
      error: null,
    })
    mockQueryResult({ data: null, error: { message: 'item insert failed' } })
    mockQueryResult({ data: null, error: null })

    const result = await createProject({
      customerName: 'Test',
      orderNumber: 'K-2026-0002',
      status: ProjectStatus.PLANNING,
      items: [{ description: 'Artikel', quantity: 1, pricePerUnit: 10 }] as InvoiceItem[],
      totalAmount: 10,
      netAmount: 10,
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

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL')
      expect(result.message).toContain('Artikel')
    }
  })
})

describe('updateProject', () => {
  it('returns unauthorized when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await updateProject('proj-1', { customerName: 'Updated' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
    }
  })

  it('updates project', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: null })
    mockQueryResult({
      data: { ...PROJECT_ROW, customer_name: 'Updated Name' },
      error: null,
    })

    const result = await updateProject('proj-1', { customerName: 'Updated Name' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.customerName).toBe('Updated Name')
    }
  })

  it('returns existing project when no fields and no items to update', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: { ...PROJECT_ROW }, error: null })

    const result = await updateProject('proj-1', {})

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.id).toBe('proj-1')
  })

  it('returns INTERNAL when project update fails', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: { message: 'constraint' } })

    const result = await updateProject('proj-1', { customerName: 'X' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INTERNAL')
  })

  it('updates project with items (upsertItems path)', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: [], error: null })
    mockQueryResult({
      data: { id: 'item-new' },
      error: null,
    })
    mockQueryResult({
      data: { ...PROJECT_ROW, invoice_items: [{ id: 'item-new' }] },
      error: null,
    })

    const result = await updateProject('proj-1', {
      items: [{ description: 'Neuer Artikel', quantity: 1, pricePerUnit: 50 }] as InvoiceItem[],
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.id).toBe('proj-1')
  })

  it('updates project with items – update existing item (upsertItems update path)', async () => {
    const existingItemId = '550e8400-e29b-41d4-a716-446655440000'
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: [{ id: existingItemId }], error: null })
    mockQueryResult({ data: null, error: null })
    mockQueryResult({
      data: { ...PROJECT_ROW, invoice_items: [{ id: existingItemId, description: 'Geändert' }] },
      error: null,
    })

    const result = await updateProject('proj-1', {
      items: [
        { id: existingItemId, description: 'Geändert', quantity: 2, pricePerUnit: 100 },
      ] as InvoiceItem[],
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.id).toBe('proj-1')
  })

  it('updates project with items – delete removed items (toDelete path)', async () => {
    const keptId = '550e8400-e29b-41d4-a716-446655440001'
    const removedId = '550e8400-e29b-41d4-a716-446655440002'
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: [{ id: keptId }, { id: removedId }], error: null })
    mockQueryResult({ data: null, error: null })
    mockQueryResult({ data: null, error: null })
    mockQueryResult({
      data: { ...PROJECT_ROW, invoice_items: [{ id: keptId }] },
      error: null,
    })

    const result = await updateProject('proj-1', {
      items: [{ id: keptId, description: 'Behalten', quantity: 1, pricePerUnit: 50 }] as InvoiceItem[],
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.id).toBe('proj-1')
  })

  it('returns INTERNAL when upsertItems update of existing item fails', async () => {
    const existingItemId = '550e8400-e29b-41d4-a716-446655440000'
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: [{ id: existingItemId }], error: null })
    mockQueryResult({ data: null, error: { message: 'update failed' } })

    const result = await updateProject('proj-1', {
      items: [{ id: existingItemId, description: 'X', quantity: 1, pricePerUnit: 10 }] as InvoiceItem[],
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL')
      expect(result.message).toContain('Aktualisieren')
    }
  })
})

describe('deleteProject', () => {
  it('deletes project', async () => {
    mockQueryResult({ data: PROJECT_ROW, error: null })
    mockQueryResult({ data: null, error: null })

    await expect(deleteProject('proj-1')).resolves.toEqual({ ok: true, data: undefined })
  })

  it('deletes project when project lookup fails', async () => {
    mockQueryResult({ data: null, error: { code: 'PGRST116' } })
    mockQueryResult({ data: null, error: null })

    await expect(deleteProject('proj-1')).resolves.toEqual({ ok: true, data: undefined })
  })

  it('returns INTERNAL when project delete fails', async () => {
    mockQueryResult({ data: PROJECT_ROW, error: null })
    mockQueryResult({ data: null, error: { message: 'FK constraint' } })

    const result = await deleteProject('proj-1')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL')
      expect(result.message).toBe('FK constraint')
    }
  })
})
