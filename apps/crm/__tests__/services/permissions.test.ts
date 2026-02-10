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
  upsertRolePermission,
  upsertUserPermission,
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

  it('returns permissions from RPC when RPC succeeds with data', async () => {
    mockRpcResult({
      data: [
        { permission_code: 'menu_dashboard', allowed: true },
        { permission_code: 'edit_projects', allowed: true },
        { permission_code: 'create_invoices', allowed: false },
      ],
      error: null,
    })

    const result = await getEffectivePermissions()

    expect(result.menu_dashboard).toBe(true)
    expect(result.edit_projects).toBe(true)
    expect(result.create_invoices).toBe(false)
    expect(result.manage_users).toBe(false)
  })

  it('falls back to role when RPC returns empty array', async () => {
    mockRpcResult({ data: [], error: null })

    const result = await getEffectivePermissions('verkaeufer' as CompanyMemberRole)

    expect(result.menu_dashboard).toBe(true)
    expect(result.edit_projects).toBe(true)
    expect(result.create_invoices).toBe(false)
  })

  it('falls back to role when RPC returns null', async () => {
    mockRpcResult({ data: null, error: null })

    const result = await getEffectivePermissions('geschaeftsfuehrer' as CompanyMemberRole)

    expect(result.manage_users).toBe(true)
  })

  it('ignores unknown permission_code from RPC', async () => {
    mockRpcResult({
      data: [
        { permission_code: 'menu_dashboard', allowed: true },
        { permission_code: 'unknown_code', allowed: true },
      ],
      error: null,
    })

    const result = await getEffectivePermissions()

    expect(result.menu_dashboard).toBe(true)
  })

  it('falls back to role when RPC fails with code P0001', async () => {
    mockRpcResult({ data: null, error: { code: 'P0001', message: 'custom exception' } })

    const result = await getEffectivePermissions('verkaeufer' as CompanyMemberRole)

    expect(result.menu_dashboard).toBe(true)
    expect(result.edit_projects).toBe(true)
    expect(result.create_invoices).toBe(false)
  })

  it('returns deny-all for undefined role when RPC fails (fail-closed)', async () => {
    mockRpcResult({ data: null, error: new Error('RPC failed') })

    const result = await getEffectivePermissions(undefined as unknown as CompanyMemberRole)

    expect(result.menu_dashboard).toBe(false)
    expect(result.manage_users).toBe(false)
    expect(result.create_invoices).toBe(false)
    expect(result.edit_projects).toBe(false)
  })

  it('returns deny-all for unknown role string when RPC fails (fail-closed)', async () => {
    mockRpcResult({ data: null, error: new Error('RPC failed') })

    const result = await getEffectivePermissions('customer' as CompanyMemberRole)

    expect(result.menu_dashboard).toBe(false)
    expect(result.manage_users).toBe(false)
    expect(result.edit_projects).toBe(false)
  })

  it('verkaeufer cannot create_invoices or manage_users when RPC fails', async () => {
    mockRpcResult({ data: null, error: new Error('RPC failed') })

    const result = await getEffectivePermissions('verkaeufer' as CompanyMemberRole)

    expect(result.edit_projects).toBe(true)
    expect(result.create_invoices).toBe(false)
    expect(result.manage_users).toBe(false)
    expect(result.menu_invoices).toBe(false)
  })

  it('monteur cannot manage_users or create_invoices when RPC fails', async () => {
    mockRpcResult({ data: null, error: new Error('RPC failed') })

    const result = await getEffectivePermissions('monteur' as CompanyMemberRole)

    expect(result.edit_projects).toBe(true)
    expect(result.menu_deliveries).toBe(true)
    expect(result.manage_users).toBe(false)
    expect(result.create_invoices).toBe(false)
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

  it('returns company id from company_members when RPC fails (fallback)', async () => {
    mockRpcResult({ data: null, error: new Error('RPC failed') })
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: { company_id: 'comp-fallback' }, error: null })

    const result = await getCurrentCompanyId()

    expect(result).toBe('comp-fallback')
  })

  it('returns company id from second company_members query when first returns no row', async () => {
    mockRpcResult({ data: null, error: new Error('RPC failed') })
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: null })
    mockQueryResult({ data: { company_id: 'comp-second' }, error: null })

    const result = await getCurrentCompanyId()

    expect(result).toBe('comp-second')
  })

  it('returns null when company_members returns PGRST116', async () => {
    mockRpcResult({ data: null, error: new Error('RPC failed') })
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: { code: 'PGRST116' } })

    const result = await getCurrentCompanyId()

    expect(result).toBeNull()
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

describe('upsertRolePermission', () => {
  it('succeeds when RPC returns no error', async () => {
    mockRpcResult({ data: null, error: null })

    await expect(
      upsertRolePermission('comp-1', 'verkaeufer', 'menu_projects', true)
    ).resolves.toBeUndefined()
  })
})

describe('upsertUserPermission', () => {
  it('succeeds when RPC returns no error', async () => {
    mockRpcResult({ data: null, error: null })

    await expect(
      upsertUserPermission(
        'comp-1',
        '550e8400-e29b-41d4-a716-446655440000',
        'menu_tickets',
        true
      )
    ).resolves.toBeUndefined()
  })
})
