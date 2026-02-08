/**
 * Unit tests for permissions service.
 */

import { mockQueryResult, mockRpcResult, resetMock } from './__mocks__/supabase'

jest.mock('@/lib/supabase/client', () => require('./__mocks__/supabase'))
jest.mock('@/lib/supabase/services/auth', () => ({
  getCurrentUser: jest.fn(),
}))
jest.mock('@/lib/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

import { getCurrentUser } from '@/lib/supabase/services/auth'
import {
  getCurrentCompanyId,
  getEffectivePermissions,
  getCompanyMembers,
  type CompanyMemberRole,
} from '@/lib/supabase/services/permissions'

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>

beforeEach(() => {
  resetMock()
  mockGetCurrentUser.mockReset()
})

describe('getEffectivePermissions', () => {
  it('returns deny-all when role is undefined and RPC fails', async () => {
    mockRpcResult({ data: null, error: new Error('RPC failed') })

    const result = await getEffectivePermissions()

    expect(result.menu_dashboard).toBe(false)
    expect(result.edit_projects).toBe(false)
  })

  it('returns permissions for verkaeufer role when RPC fails', async () => {
    mockRpcResult({ data: null, error: new Error('RPC failed') })

    const result = await getEffectivePermissions('verkaeufer' as CompanyMemberRole)

    expect(result.menu_dashboard).toBe(true)
    expect(result.menu_projects).toBe(true)
    expect(result.manage_users).toBe(false)
  })

  it('returns permissions for geschaeftsfuehrer when RPC fails', async () => {
    mockRpcResult({ data: null, error: new Error('RPC failed') })

    const result = await getEffectivePermissions('geschaeftsfuehrer' as CompanyMemberRole)

    expect(result.menu_dashboard).toBe(true)
    expect(result.manage_users).toBe(true)
  })

  it('returns permissions for buchhaltung when RPC fails', async () => {
    mockRpcResult({ data: null, error: new Error('RPC failed') })

    const result = await getEffectivePermissions('buchhaltung' as CompanyMemberRole)

    expect(result.menu_invoices).toBe(true)
    expect(result.menu_projects).toBe(false)
  })
})

describe('getCurrentCompanyId', () => {
  it('returns null when no user and RPC fails', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    mockRpcResult({ data: null, error: new Error('RPC failed') })

    const result = await getCurrentCompanyId()

    expect(result).toBeNull()
  })

  it('returns company id from RPC when successful', async () => {
    mockRpcResult({ data: 'comp-123', error: null })

    const result = await getCurrentCompanyId()

    expect(result).toBe('comp-123')
  })
})

describe('getCompanyMembers', () => {
  it('returns mapped members', async () => {
    mockQueryResult({
      data: [
        {
          id: 'm1',
          company_id: 'comp-1',
          user_id: 'user-1',
          role: 'verkaeufer',
          is_active: true,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
      ],
      error: null,
    })

    const result = await getCompanyMembers('comp-1')

    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('verkaeufer')
    expect(result[0].companyId).toBe('comp-1')
  })
})
