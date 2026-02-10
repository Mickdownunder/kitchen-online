import {
  ensureAuthenticatedUserId,
  ensureNonEmptyCategoryName,
  getTodayIsoDate,
  isNotFoundError,
  toInternalErrorResult,
} from '@/lib/supabase/services/supplierInvoices/validators'

describe('supplierInvoices validators', () => {
  describe('ensureAuthenticatedUserId', () => {
    it('returns the user id for valid auth objects', () => {
      expect(ensureAuthenticatedUserId({ id: 'user-1' })).toEqual({
        ok: true,
        data: 'user-1',
      })
    })

    it('returns unauthorized for invalid auth payloads', () => {
      const noUser = ensureAuthenticatedUserId(null)
      expect(noUser.ok).toBe(false)
      if (!noUser.ok) {
        expect(noUser.code).toBe('UNAUTHORIZED')
        expect(noUser.message).toBe('Nicht authentifiziert')
      }

      const noId = ensureAuthenticatedUserId({})
      expect(noId.ok).toBe(false)
      if (!noId.ok) {
        expect(noId.code).toBe('UNAUTHORIZED')
      }
    })
  })

  describe('isNotFoundError', () => {
    it('detects PostgREST not-found error code', () => {
      expect(isNotFoundError({ code: 'PGRST116' })).toBe(true)
    })

    it('returns false for other values', () => {
      expect(isNotFoundError({ code: 'PGRST999' })).toBe(false)
      expect(isNotFoundError(undefined)).toBe(false)
      expect(isNotFoundError('PGRST116')).toBe(false)
    })
  })

  describe('ensureNonEmptyCategoryName', () => {
    it('trims and returns a valid category name', () => {
      expect(ensureNonEmptyCategoryName('  Zubehör  ')).toEqual({
        ok: true,
        data: 'Zubehör',
      })
    })

    it('returns validation error when category name is blank', () => {
      const result = ensureNonEmptyCategoryName('   ')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.code).toBe('VALIDATION')
        expect(result.message).toBe('Kategorie-Name darf nicht leer sein')
      }
    })
  })

  it('returns today in ISO date format', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-10T21:30:00.000Z'))

    expect(getTodayIsoDate()).toBe('2026-02-10')

    jest.useRealTimers()
  })

  it('maps unknown errors to internal failures', () => {
    const result = toInternalErrorResult(new Error('DB error'))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL')
      expect(result.message).toBe('DB error')
    }
  })
})
