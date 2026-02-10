import {
  getTodayIsoDate,
  isNotFoundError,
  requireAuthenticatedUserId,
  requireNonEmptyCategoryName,
} from '@/lib/supabase/services/supplierInvoices/validators'

describe('supplierInvoices validators', () => {
  describe('requireAuthenticatedUserId', () => {
    it('returns the user id for valid auth objects', () => {
      expect(requireAuthenticatedUserId({ id: 'user-1' })).toBe('user-1')
    })

    it('throws for invalid auth payloads', () => {
      expect(() => requireAuthenticatedUserId(null)).toThrow('Nicht authentifiziert')
      expect(() => requireAuthenticatedUserId({})).toThrow('Nicht authentifiziert')
      expect(() => requireAuthenticatedUserId({ id: '' })).toThrow('Nicht authentifiziert')
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

  describe('requireNonEmptyCategoryName', () => {
    it('trims and returns a valid category name', () => {
      expect(requireNonEmptyCategoryName('  Zubehör  ')).toBe('Zubehör')
    })

    it('throws when category name is blank', () => {
      expect(() => requireNonEmptyCategoryName('   ')).toThrow(
        'Kategorie-Name darf nicht leer sein',
      )
    })
  })

  it('returns today in ISO date format', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-10T21:30:00.000Z'))

    expect(getTodayIsoDate()).toBe('2026-02-10')

    jest.useRealTimers()
  })
})
