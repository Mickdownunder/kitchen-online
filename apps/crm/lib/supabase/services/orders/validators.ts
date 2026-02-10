import type { OrderStatus } from '@/types'
import type { AuthenticatedUserLike, OrderStats, PostgrestErrorLike } from './types'

const NOT_AUTHENTICATED_MESSAGE = 'Not authenticated'

export function getAuthenticatedUserId(user: unknown): string | null {
  if (!user || typeof user !== 'object') {
    return null
  }

  const candidate = user as Partial<AuthenticatedUserLike>
  if (typeof candidate.id !== 'string' || candidate.id.length === 0) {
    return null
  }

  return candidate.id
}

export function requireAuthenticatedUserId(user: unknown): string {
  const userId = getAuthenticatedUserId(user)
  if (!userId) {
    throw new Error(NOT_AUTHENTICATED_MESSAGE)
  }

  return userId
}

export function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const postgrestError = error as PostgrestErrorLike
  return postgrestError.code === 'PGRST116'
}

export function toOrderStatus(status: string | null): OrderStatus {
  return (status || 'draft') as OrderStatus
}

export function emptyOrderStats(): OrderStats {
  return {
    total: 0,
    draft: 0,
    sent: 0,
    confirmed: 0,
    cancelled: 0,
  }
}
