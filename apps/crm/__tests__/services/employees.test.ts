/**
 * Unit tests for employee service.
 */

import { mockQueryResult, resetMock } from './__mocks__/supabase'

jest.mock('@/lib/supabase/client', () => require('./__mocks__/supabase'))
jest.mock('@/lib/supabase/services/auth', () => ({
  getCurrentUser: jest.fn(),
}))
jest.mock('@/lib/utils/auditLogger', () => ({
  audit: { userRoleChanged: jest.fn() },
  logAudit: jest.fn(),
}))

import { getCurrentUser } from '@/lib/supabase/services/auth'
import { getEmployees, saveEmployee, deleteEmployee } from '@/lib/supabase/services/employees'

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>

beforeEach(() => {
  resetMock()
  mockGetCurrentUser.mockReset()
})

describe('getEmployees', () => {
  it('returns employees when companyId provided', async () => {
    mockQueryResult({
      data: [
        {
          id: 'emp-1',
          company_id: 'comp-1',
          first_name: 'Max',
          last_name: 'Mustermann',
          email: 'max@test.de',
          phone: null,
          role: 'verkaeufer',
          department: null,
          is_active: true,
          commission_rate: null,
          notes: null,
          user_id: null,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
      ],
      error: null,
    })

    const result = await getEmployees('comp-1')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('emp-1')
    expect(result[0].firstName).toBe('Max')
    expect(result[0].lastName).toBe('Mustermann')
    expect(result[0].email).toBe('max@test.de')
  })

  it('returns empty array when no company settings', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: null })

    const result = await getEmployees()

    expect(result).toEqual([])
  })

  it('returns employees via company settings when no companyId', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: { id: 'comp-1', user_id: 'user-1', company_name: 'Test' },
      error: null,
    })
    mockQueryResult({
      data: [
        {
          id: 'emp-1',
          company_id: 'comp-1',
          first_name: 'Anna',
          last_name: 'Schmidt',
          email: 'anna@test.de',
          phone: null,
          role: 'administration',
          department: null,
          is_active: true,
          commission_rate: '5.5',
          notes: null,
          user_id: null,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
      ],
      error: null,
    })

    const result = await getEmployees()

    expect(result).toHaveLength(1)
    expect(result[0].firstName).toBe('Anna')
    expect(result[0].commissionRate).toBe(5.5)
  })

  it('throws when query errors', async () => {
    mockQueryResult({ data: null, error: { message: 'DB error' } })

    await expect(getEmployees('comp-1')).rejects.toEqual({ message: 'DB error' })
  })
})

describe('saveEmployee', () => {
  it('inserts new employee when no id', async () => {
    mockQueryResult({
      data: {
        id: 'emp-new',
        company_id: 'comp-1',
        first_name: 'Lisa',
        last_name: 'Weber',
        email: 'lisa@test.de',
        phone: null,
        role: 'monteur',
        department: null,
        is_active: true,
        commission_rate: null,
        notes: null,
        user_id: null,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
      error: null,
    })

    const result = await saveEmployee({
      companyId: 'comp-1',
      firstName: 'Lisa',
      lastName: 'Weber',
      email: 'lisa@test.de',
      role: 'monteur',
    })

    expect(result.id).toBe('emp-new')
    expect(result.firstName).toBe('Lisa')
  })

  it('updates existing employee when id provided', async () => {
    mockQueryResult({
      data: {
        id: 'emp-1',
        company_id: 'comp-1',
        first_name: 'Max',
        last_name: 'Mustermann',
        email: 'max.updated@test.de',
        phone: null,
        role: 'geschaeftsfuehrer',
        department: null,
        is_active: false,
        commission_rate: null,
        notes: null,
        user_id: null,
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
      },
      error: null,
    })

    const result = await saveEmployee({
      id: 'emp-1',
      firstName: 'Max',
      lastName: 'Mustermann',
      email: 'max.updated@test.de',
      role: 'geschaeftsfuehrer',
      isActive: false,
    })

    expect(result.id).toBe('emp-1')
    expect(result.isActive).toBe(false)
  })
})

describe('deleteEmployee', () => {
  it('succeeds when delete works', async () => {
    mockQueryResult({ data: null, error: null })

    await expect(deleteEmployee('emp-1')).resolves.toBeUndefined()
  })

  it('throws when delete errors', async () => {
    mockQueryResult({ data: null, error: { message: 'Delete failed' } })

    await expect(deleteEmployee('emp-1')).rejects.toEqual({ message: 'Delete failed' })
  })
})
