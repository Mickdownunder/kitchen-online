/**
 * Unit tests for the customers service.
 *
 * All Supabase interactions are mocked via __mocks__/supabase.ts.
 * The auth module is mocked to control getCurrentUser() results.
 */

import { mockQueryResult, resetMock } from './__mocks__/supabase'

// ─── Mock wiring ──────────────────────────────────────────────────────

jest.mock('@/lib/supabase/client', () => require('./__mocks__/supabase'))
jest.mock('@/lib/supabase/services/auth', () => ({
  getCurrentUser: jest.fn(),
}))

import { getCurrentUser } from '@/lib/supabase/services/auth'
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '@/lib/supabase/services/customers'

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>

// ─── Fixtures ─────────────────────────────────────────────────────────

const CUSTOMER_ROW = {
  id: 'cust-1',
  user_id: 'user-1',
  salutation: 'Herr',
  first_name: 'Max',
  last_name: 'Mustermann',
  company_name: null,
  street: 'Hauptstraße',
  house_number: '1',
  postal_code: '1010',
  city: 'Wien',
  country: 'Österreich',
  phone: '+431234567',
  mobile: null,
  email: 'max@example.com',
  alternative_email: null,
  tax_id: null,
  payment_terms: 14,
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const MOCK_USER = { id: 'user-1', email: 'admin@example.com' }

// ─── Tests ────────────────────────────────────────────────────────────

beforeEach(() => {
  resetMock()
  mockGetCurrentUser.mockReset()
})

// ─── getCustomers ──────────────────────────────────────────────────────

describe('getCustomers', () => {
  it('returns ok with mapped customers on success', async () => {
    mockQueryResult({ data: [CUSTOMER_ROW], error: null })

    const result = await getCustomers()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe('cust-1')
      expect(result.data[0].firstName).toBe('Max')
      expect(result.data[0].lastName).toBe('Mustermann')
      expect(result.data[0].address.street).toBe('Hauptstraße')
      expect(result.data[0].contact.email).toBe('max@example.com')
    }
  })

  it('returns fail on DB error', async () => {
    mockQueryResult({ data: null, error: { message: 'Connection failed' } })

    const result = await getCustomers()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL')
      expect(result.message).toBe('Connection failed')
    }
  })
})

// ─── getCustomer ──────────────────────────────────────────────────────

describe('getCustomer', () => {
  it('returns ok with mapped customer', async () => {
    mockQueryResult({ data: CUSTOMER_ROW, error: null })

    const result = await getCustomer('cust-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('cust-1')
      expect(result.data.paymentTerms).toBe(14)
    }
  })

  it('returns NOT_FOUND on error', async () => {
    mockQueryResult({ data: null, error: { message: 'not found', code: 'PGRST116' } })

    const result = await getCustomer('nonexistent')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('NOT_FOUND')
    }
  })
})

// ─── createCustomer ────────────────────────────────────────────────────

describe('createCustomer', () => {
  const NEW_CUSTOMER = {
    firstName: 'Anna',
    lastName: 'Test',
    salutation: 'Frau' as const,
    address: {
      street: 'Testgasse',
      houseNumber: '5',
      postalCode: '1020',
      city: 'Wien',
    },
    contact: {
      phone: '+430000000',
      email: 'anna@test.com',
    },
  }

  it('returns UNAUTHORIZED when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await createCustomer(NEW_CUSTOMER)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
    }
  })

  it('returns ok with created customer on success', async () => {
    mockGetCurrentUser.mockResolvedValue(MOCK_USER as ReturnType<typeof getCurrentUser> extends Promise<infer T> ? T : never)
    const createdRow = {
      ...CUSTOMER_ROW,
      id: 'cust-new',
      first_name: 'Anna',
      last_name: 'Test',
    }
    mockQueryResult({ data: createdRow, error: null })

    const result = await createCustomer(NEW_CUSTOMER)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('cust-new')
      expect(result.data.firstName).toBe('Anna')
    }
  })

  it('returns INTERNAL on DB insert error', async () => {
    mockGetCurrentUser.mockResolvedValue(MOCK_USER as ReturnType<typeof getCurrentUser> extends Promise<infer T> ? T : never)
    mockQueryResult({ data: null, error: { message: 'unique violation' } })

    const result = await createCustomer(NEW_CUSTOMER)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL')
      expect(result.message).toBe('unique violation')
    }
  })
})

// ─── updateCustomer ────────────────────────────────────────────────────

describe('updateCustomer', () => {
  it('returns ok with updated customer', async () => {
    const updatedRow = { ...CUSTOMER_ROW, first_name: 'Updated' }
    mockQueryResult({ data: updatedRow, error: null })

    const result = await updateCustomer('cust-1', { firstName: 'Updated' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.firstName).toBe('Updated')
    }
  })

  it('returns INTERNAL on DB error', async () => {
    mockQueryResult({ data: null, error: { message: 'not found' } })

    const result = await updateCustomer('nonexistent', { firstName: 'X' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL')
    }
  })
})

// ─── deleteCustomer ────────────────────────────────────────────────────

describe('deleteCustomer', () => {
  it('returns ok(undefined) on success', async () => {
    mockQueryResult({ data: null, error: null })

    const result = await deleteCustomer('cust-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toBeUndefined()
    }
  })

  it('returns INTERNAL on DB error', async () => {
    mockQueryResult({ data: null, error: { message: 'FK constraint' } })

    const result = await deleteCustomer('cust-1')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL')
      expect(result.message).toBe('FK constraint')
    }
  })
})
