import {
  ensureAuthenticatedUserId,
  getTodayIsoDate,
  isNotFoundError,
  toInternalErrorResult,
  toNumber,
} from '@/lib/supabase/services/delivery/validators'

describe('delivery validators', () => {
  it('returns service result for authenticated user id', () => {
    expect(ensureAuthenticatedUserId({ id: 'user-1' })).toEqual({ ok: true, data: 'user-1' })

    const missingUser = ensureAuthenticatedUserId(null)
    expect(missingUser.ok).toBe(false)
    if (!missingUser.ok) {
      expect(missingUser.code).toBe('UNAUTHORIZED')
      expect(missingUser.message).toBe('Not authenticated')
    }
  })

  it('detects not found errors', () => {
    expect(isNotFoundError({ code: 'PGRST116' })).toBe(true)
    expect(isNotFoundError({ code: 'X' })).toBe(false)
  })

  it('normalizes numeric values safely', () => {
    expect(toNumber('12.5')).toBe(12.5)
    expect(toNumber(null)).toBe(0)
    expect(toNumber(undefined)).toBe(0)
  })

  it('returns current date in iso format', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-10T13:00:00.000Z'))

    expect(getTodayIsoDate()).toBe('2026-02-10')

    jest.useRealTimers()
  })

  it('maps errors to internal service failures', () => {
    const result = toInternalErrorResult(new Error('DB error'))

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL')
      expect(result.message).toBe('DB error')
    }
  })
})
