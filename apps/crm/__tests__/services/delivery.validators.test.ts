import {
  getTodayIsoDate,
  isNotFoundError,
  requireAuthenticatedUserId,
  toNumber,
} from '@/lib/supabase/services/delivery/validators'

describe('delivery validators', () => {
  it('requires authenticated user id', () => {
    expect(requireAuthenticatedUserId({ id: 'user-1' })).toBe('user-1')
    expect(() => requireAuthenticatedUserId(null)).toThrow('Not authenticated')
    expect(() => requireAuthenticatedUserId({ id: '' })).toThrow('Not authenticated')
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
})
