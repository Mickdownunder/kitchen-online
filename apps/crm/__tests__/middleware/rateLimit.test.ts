/**
 * Unit tests for rate limit middleware.
 */

import { RateLimiter, rateLimit, getRateLimiter, getRateLimitKey } from '@/lib/middleware/rateLimit'

describe('RateLimiter', () => {
  it('allows first request', () => {
    const limiter = new RateLimiter(60000, 5)
    const result = limiter.check('user-1')

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('allows requests until limit reached', () => {
    const limiter = new RateLimiter(60000, 3)

    expect(limiter.check('user-1').allowed).toBe(true)
    expect(limiter.check('user-1').allowed).toBe(true)
    expect(limiter.check('user-1').allowed).toBe(true)
    const fourth = limiter.check('user-1')
    expect(fourth.allowed).toBe(false)
    expect(fourth.remaining).toBe(0)
  })

  it('tracks keys separately', () => {
    const limiter = new RateLimiter(60000, 2)

    expect(limiter.check('user-1').allowed).toBe(true)
    expect(limiter.check('user-2').allowed).toBe(true)
    expect(limiter.check('user-1').allowed).toBe(true)
    expect(limiter.check('user-2').allowed).toBe(true)
    expect(limiter.check('user-1').allowed).toBe(false)
    expect(limiter.check('user-2').allowed).toBe(false)
  })

  it('reset clears key', () => {
    const limiter = new RateLimiter(60000, 1)

    expect(limiter.check('user-1').allowed).toBe(true)
    expect(limiter.check('user-1').allowed).toBe(false)
    limiter.reset('user-1')
    expect(limiter.check('user-1').allowed).toBe(true)
  })
})

describe('getRateLimiter', () => {
  it('returns auth limiter for invite route', () => {
    const limiter = getRateLimiter('/api/users/invite')
    expect(limiter).toBeDefined()
  })

  it('returns api limiter for generic route', () => {
    const limiter = getRateLimiter('/api/tickets')
    expect(limiter).toBeDefined()
  })
})

describe('getRateLimitKey', () => {
  it('returns user key when userId provided', () => {
    const request = new Request('https://example.com')
    expect(getRateLimitKey(request, 'user-123')).toBe('user:user-123')
  })

  it('returns ip key when no userId', () => {
    const request = new Request('https://example.com', {
      headers: { 'x-real-ip': '192.168.1.1' },
    })
    expect(getRateLimitKey(request)).toBe('ip:192.168.1.1')
  })

  it('uses x-forwarded-for when present', () => {
    const request = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.1' },
    })
    expect(getRateLimitKey(request)).toBe('ip:10.0.0.1')
  })
})

describe('rateLimit', () => {
  it('returns result with allowed true for new key', async () => {
    const request = new Request('https://example.com/api/tickets')
    const result = await rateLimit(request, 'user-1')

    expect(result).not.toBeNull()
    expect(result?.allowed).toBe(true)
  })
})
