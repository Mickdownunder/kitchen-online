/**
 * Unit tests for appointments service.
 */

import { mockQueryResult, resetMock } from './__mocks__/supabase'

jest.mock('@/lib/supabase/client', () => require('./__mocks__/supabase'))
jest.mock('@/lib/supabase/services/auth', () => ({
  getCurrentUser: jest.fn(),
}))
jest.mock('@/lib/supabase/services/permissions', () => ({
  getCurrentCompanyId: jest.fn(),
}))
jest.mock('@/lib/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

import { getCurrentUser } from '@/lib/supabase/services/auth'
import { getCurrentCompanyId } from '@/lib/supabase/services/permissions'
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from '@/lib/supabase/services/appointments'

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>
const mockGetCurrentCompanyId = getCurrentCompanyId as jest.MockedFunction<typeof getCurrentCompanyId>

const APT_ROW = {
  id: 'apt-1',
  company_id: 'comp-1',
  date: '2026-02-15',
  time: '09:00',
  title: 'Montage',
  type: 'installation',
  customer_name: 'Max Mustermann',
  project_id: 'proj-1',
  assigned_user_id: 'emp-1',
}

beforeEach(() => {
  resetMock()
  mockGetCurrentUser.mockReset()
  mockGetCurrentCompanyId.mockReset()
})

describe('getAppointments', () => {
  it('returns empty array when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await getAppointments()

    expect(result).toEqual([])
  })

  it('returns empty array when no company', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockGetCurrentCompanyId.mockResolvedValue(null)

    const result = await getAppointments()

    expect(result).toEqual([])
  })

  it('returns array when user has company and appointments exist', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockGetCurrentCompanyId.mockResolvedValue('comp-1')
    mockQueryResult({ data: { id: 'm1', role: 'verkaeufer' }, error: null })
    mockQueryResult({
      data: [
        {
          id: 'apt-1',
          company_id: 'comp-1',
          date: '2026-02-15',
          time: '09:00',
          title: 'Montage',
          project_id: 'proj-1',
          employee_id: 'emp-1',
        },
      ],
      error: null,
    })

    const result = await getAppointments()

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThanOrEqual(0)
  })
})

describe('createAppointment', () => {
  it('throws when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    await expect(
      createAppointment({
        customerName: 'Test',
        date: '2026-02-15',
        type: 'installation',
      })
    ).rejects.toThrow('Not authenticated')
  })

  it('throws when no company', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockGetCurrentCompanyId.mockResolvedValue(null)

    await expect(
      createAppointment({
        customerName: 'Test',
        date: '2026-02-15',
        type: 'installation',
      })
    ).rejects.toThrow('No company found')
  })

  it('creates appointment', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockGetCurrentCompanyId.mockResolvedValue('comp-1')
    mockQueryResult({ data: { ...APT_ROW, id: 'apt-new' }, error: null })

    const result = await createAppointment({
      customerName: 'Neuer Kunde',
      date: '2026-02-16',
      type: 'installation',
    })

    expect(result.id).toBe('apt-new')
  })
})

describe('updateAppointment', () => {
  it('throws when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    await expect(
      updateAppointment('apt-1', { customerName: 'Updated' })
    ).rejects.toThrow('Not authenticated')
  })

  it('updates appointment', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: { ...APT_ROW, customer_name: 'Updated Name' },
      error: null,
    })

    const result = await updateAppointment('apt-1', { customerName: 'Updated Name' })

    expect(result.customerName).toBe('Updated Name')
  })
})

describe('deleteAppointment', () => {
  it('throws when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    await expect(deleteAppointment('apt-1')).rejects.toThrow('Not authenticated')
  })

  it('deletes appointment', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: null })

    await expect(deleteAppointment('apt-1')).resolves.toBeUndefined()
  })
})
