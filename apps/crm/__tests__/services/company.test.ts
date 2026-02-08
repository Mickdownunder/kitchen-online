/**
 * Unit tests for getCompanyIdForUser.
 *
 * Tests the two-step lookup: company_members → company_settings fallback.
 */

jest.mock('@/lib/supabase/client', () => require('./__mocks__/supabase'))
const mockGetCurrentUser = jest.fn()
jest.mock('@/lib/supabase/services/auth', () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}))
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))
jest.mock('@/lib/utils/auditLogger', () => ({
  audit: { companySettingsUpdated: jest.fn() },
  logAudit: jest.fn(),
}))

import {
  getCompanyIdForUser,
  getCompanySettingsById,
  getCompanySettings,
  saveCompanySettings,
} from '@/lib/supabase/services/company'

// ─── Mock Supabase client builder ───────────────────────────────────

interface MockBuilder {
  from: jest.Mock
  select: jest.Mock
  eq: jest.Mock
  maybeSingle: jest.Mock
  single: jest.Mock
  // track calls for assertions
  _fromCalls: string[]
}

function createMockClient(config: {
  members?: { data: unknown; error: unknown }
  settings?: { data: unknown; error: unknown }
}): MockBuilder {
  const fromCalls: string[] = []
  let callIndex = 0

  const client = {
    _fromCalls: fromCalls,
    from: jest.fn().mockImplementation((table: string) => {
      fromCalls.push(table)
      return client
    }),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockImplementation(() => {
      callIndex++
      // First maybeSingle call = company_members
      if (callIndex === 1) {
        return Promise.resolve(config.members ?? { data: null, error: null })
      }
      // Second maybeSingle call = company_settings
      return Promise.resolve(config.settings ?? { data: null, error: null })
    }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  } as unknown as MockBuilder

  return client
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('getCompanyIdForUser', () => {
  it('returns company_id from company_members when found', async () => {
    const client = createMockClient({
      members: { data: { company_id: 'comp-abc' }, error: null },
    })

    const result = await getCompanyIdForUser('user-1', client as never)

    expect(result).toBe('comp-abc')
    expect(client._fromCalls[0]).toBe('company_members')
  })

  it('falls back to company_settings when company_members has no match', async () => {
    const client = createMockClient({
      members: { data: null, error: null },
      settings: { data: { id: 'comp-xyz' }, error: null },
    })

    const result = await getCompanyIdForUser('user-2', client as never)

    expect(result).toBe('comp-xyz')
    expect(client._fromCalls).toContain('company_members')
    expect(client._fromCalls).toContain('company_settings')
  })

  it('returns null when neither table has a match', async () => {
    const client = createMockClient({
      members: { data: null, error: null },
      settings: { data: null, error: null },
    })

    const result = await getCompanyIdForUser('user-3', client as never)

    expect(result).toBeNull()
  })

  it('falls back to company_settings when company_members query errors', async () => {
    const client = createMockClient({
      members: { data: null, error: { message: 'permission denied' } },
      settings: { data: { id: 'comp-fallback' }, error: null },
    })

    const result = await getCompanyIdForUser('user-4', client as never)

    expect(result).toBe('comp-fallback')
  })

  it('returns null when both queries error', async () => {
    const client = createMockClient({
      members: { data: null, error: { message: 'err1' } },
      settings: { data: null, error: { message: 'err2' } },
    })

    const result = await getCompanyIdForUser('user-5', client as never)

    expect(result).toBeNull()
  })

  it('prefers company_members over company_settings', async () => {
    const client = createMockClient({
      members: { data: { company_id: 'from-members' }, error: null },
      settings: { data: { id: 'from-settings' }, error: null },
    })

    const result = await getCompanyIdForUser('user-6', client as never)

    // Should return members result without even querying settings
    expect(result).toBe('from-members')
  })
})

describe('getCompanySettingsById', () => {
  function createClientForSettings(result: { data: unknown; error: unknown }) {
    const client = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue(result),
    }
    return client
  }

  it('returns mapped company settings when found', async () => {
    const dbRow = {
      id: 'comp-1',
      user_id: 'user-1',
      company_name: 'Test GmbH',
      display_name: 'Test',
      legal_form: 'GmbH',
      street: 'Musterstr.',
      house_number: '1',
      postal_code: '1010',
      city: 'Wien',
      country: 'AT',
      default_tax_rate: 20,
      next_invoice_number: 1,
    }
    const client = createClientForSettings({ data: dbRow, error: null })

    const result = await getCompanySettingsById('comp-1', client as never)

    expect(result).not.toBeNull()
    expect(result?.id).toBe('comp-1')
    expect(result?.companyName).toBe('Test GmbH')
  })

  it('returns null when not found', async () => {
    const client = createClientForSettings({ data: null, error: { code: 'PGRST116' } })

    const result = await getCompanySettingsById('nonexistent', client as never)

    expect(result).toBeNull()
  })

  it('returns null when query errors', async () => {
    const client = createClientForSettings({ data: null, error: { message: 'DB error' } })

    const result = await getCompanySettingsById('comp-1', client as never)

    expect(result).toBeNull()
  })
})

describe('getCompanySettings', () => {
  const { mockQueryResult, resetMock } = require('./__mocks__/supabase')

  beforeEach(() => {
    mockGetCurrentUser.mockReset()
    resetMock?.()
  })

  it('returns null when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await getCompanySettings()

    expect(result).toBeNull()
  })

  it('returns settings when user authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: {
        id: 'comp-1',
        user_id: 'user-1',
        company_name: 'Test GmbH',
        display_name: 'Test',
        default_tax_rate: 20,
      },
      error: null,
    })

    const result = await getCompanySettings()

    expect(result).not.toBeNull()
    expect(result?.companyName).toBe('Test GmbH')
  })
})

describe('saveCompanySettings', () => {
  const { mockQueryResult, resetMock } = require('./__mocks__/supabase')

  beforeEach(() => {
    mockGetCurrentUser.mockReset()
    resetMock?.()
  })

  it('throws when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    await expect(
      saveCompanySettings({ companyName: 'Updated GmbH' })
    ).rejects.toThrow('Not authenticated')
  })

  it('saves company settings', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: {
        id: 'comp-1',
        user_id: 'user-1',
        company_name: 'Updated GmbH',
        display_name: 'Updated',
      },
      error: null,
    })

    const result = await saveCompanySettings({ companyName: 'Updated GmbH' })

    expect(result.companyName).toBe('Updated GmbH')
  })
})
