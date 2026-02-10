import {
  ensureAuthenticatedUserId,
  ensureInvoiceCanBeCancelled,
  getTodayIsoDate,
  getTodayLocaleDateDeAT,
  isNotFoundError,
  resolveCancelAmount,
  toInternalErrorResult,
} from '@/lib/supabase/services/invoices/validators'

describe('invoices validators', () => {
  it('validates authenticated users', () => {
    const okResult = ensureAuthenticatedUserId({ id: 'user-1' })
    expect(okResult.ok).toBe(true)
    if (okResult.ok) expect(okResult.data).toBe('user-1')

    const failResult = ensureAuthenticatedUserId(null)
    expect(failResult.ok).toBe(false)
    if (!failResult.ok) expect(failResult.code).toBe('UNAUTHORIZED')
  })

  it('detects not-found errors', () => {
    expect(isNotFoundError({ code: 'PGRST116' })).toBe(true)
    expect(isNotFoundError({ code: 'OTHER' })).toBe(false)
  })

  it('maps unknown errors to INTERNAL service errors', () => {
    const result = toInternalErrorResult({ message: 'db failed' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL')
      expect(result.message).toBe('db failed')
    }
  })

  it('checks whether invoice type can be cancelled', () => {
    const allowed = ensureInvoiceCanBeCancelled('partial')
    expect(allowed.ok).toBe(true)

    const blocked = ensureInvoiceCanBeCancelled('credit')
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.code).toBe('VALIDATION')
  })

  it('resolves partial cancel amount and validates overflow', () => {
    const amount = resolveCancelAmount(300, 500)
    expect(amount.ok).toBe(true)
    if (amount.ok) expect(amount.data).toBe(300)

    const overflow = resolveCancelAmount(900, 500)
    expect(overflow.ok).toBe(false)
    if (!overflow.ok) expect(overflow.code).toBe('VALIDATION')

    const fallback = resolveCancelAmount(undefined, 500)
    expect(fallback.ok).toBe(true)
    if (fallback.ok) expect(fallback.data).toBe(500)
  })

  it('returns stable date formats', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-10T12:30:00.000Z'))

    expect(getTodayIsoDate()).toBe('2026-02-10')
    expect(getTodayLocaleDateDeAT()).toMatch(/^10\./)

    jest.useRealTimers()
  })
})
