import { z } from 'zod'

/**
 * Rate limiting middleware
 * Uses in-memory store (for single-instance deployments)
 * For multi-instance, consider Redis or similar
 */

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

export class RateLimiter {
  private store: RateLimitStore = {}
  private windowMs: number
  private maxRequests: number

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
  }

  private cleanup(): void {
    const now = Date.now()
    for (const key in this.store) {
      if (this.store[key].resetTime < now) {
        delete this.store[key]
      }
    }
  }

  check(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    this.cleanup()

    const now = Date.now()
    const entry = this.store[key]

    if (!entry || entry.resetTime < now) {
      // New window
      this.store[key] = {
        count: 1,
        resetTime: now + this.windowMs,
      }
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs,
      }
    }

    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      }
    }

    entry.count++
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetTime: entry.resetTime,
    }
  }

  reset(key: string): void {
    delete this.store[key]
  }
}

// Create rate limiters for different endpoints
const apiRateLimiter = new RateLimiter(60000, 100) // 100 requests per minute
const authRateLimiter = new RateLimiter(60000, 10) // 10 requests per minute (stricter for auth)
const aiRateLimiter = new RateLimiter(60000, 20) // 20 requests per minute (AI is expensive)

/**
 * Get rate limiter for a specific route
 */
export function getRateLimiter(route: string): RateLimiter {
  if (route.includes('/api/users/invite') || route.includes('/api/users/process-invite')) {
    return authRateLimiter
  }
  if (route.includes('/api/chat') || route.includes('/api/extract-project')) {
    return aiRateLimiter
  }
  return apiRateLimiter
}

/**
 * Get identifier for rate limiting (IP or user ID)
 */
export function getRateLimitKey(request: Request, userId?: string): string {
  // Prefer user-based limiting for authenticated requests
  if (userId) {
    return `user:${userId}`
  }

  // Fallback to IP-based limiting
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : request.headers.get('x-real-ip') || 'unknown'
  return `ip:${ip}`
}

/**
 * Rate limit middleware
 */
export async function rateLimit(
  request: Request,
  userId?: string,
  customLimiter?: RateLimiter
): Promise<{ allowed: boolean; remaining: number; resetTime: number } | null> {
  const route = new URL(request.url).pathname
  const limiter = customLimiter || getRateLimiter(route)
  const key = getRateLimitKey(request, userId)

  return limiter.check(key)
}

/**
 * Zod schema for CSRF token validation
 */
export const csrfTokenSchema = z.object({
  csrfToken: z.string().min(1, 'CSRF Token ist erforderlich'),
})

/**
 * Simple CSRF protection using double-submit cookie pattern
 * For production, consider using a library like csurf or csrf
 */
export function generateCSRFToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function validateCSRFToken(request: Request, token: string): boolean {
  const cookieToken = request.headers.get('x-csrf-token')
  return cookieToken === token && token.length > 0
}
