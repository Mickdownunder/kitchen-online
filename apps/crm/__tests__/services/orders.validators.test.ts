import {
  emptyOrderStats,
  getAuthenticatedUserId,
  isNotFoundError,
  requireAuthenticatedUserId,
  toOrderStatus,
} from '@/lib/supabase/services/orders/validators'

describe('orders validators', () => {
  describe('getAuthenticatedUserId', () => {
    it('returns user id for valid user object', () => {
      expect(getAuthenticatedUserId({ id: 'user-1' })).toBe('user-1')
    })

    it('returns null for invalid values', () => {
      expect(getAuthenticatedUserId(null)).toBeNull()
      expect(getAuthenticatedUserId({})).toBeNull()
      expect(getAuthenticatedUserId({ id: '' })).toBeNull()
      expect(getAuthenticatedUserId('user-1')).toBeNull()
    })
  })

  describe('requireAuthenticatedUserId', () => {
    it('returns user id for valid object', () => {
      expect(requireAuthenticatedUserId({ id: 'user-1' })).toBe('user-1')
    })

    it('throws for missing user id', () => {
      expect(() => requireAuthenticatedUserId({})).toThrow('Not authenticated')
    })
  })

  describe('isNotFoundError', () => {
    it('detects Postgrest not found code', () => {
      expect(isNotFoundError({ code: 'PGRST116' })).toBe(true)
    })

    it('returns false for non-not-found errors', () => {
      expect(isNotFoundError({ code: 'OTHER' })).toBe(false)
      expect(isNotFoundError(null)).toBe(false)
      expect(isNotFoundError('PGRST116')).toBe(false)
    })
  })

  describe('toOrderStatus', () => {
    it('keeps known status values', () => {
      expect(toOrderStatus('confirmed')).toBe('confirmed')
    })

    it('falls back to draft for null', () => {
      expect(toOrderStatus(null)).toBe('draft')
    })
  })

  it('returns a zeroed stats object', () => {
    expect(emptyOrderStats()).toEqual({
      total: 0,
      draft: 0,
      sent: 0,
      confirmed: 0,
      cancelled: 0,
    })
  })
})
