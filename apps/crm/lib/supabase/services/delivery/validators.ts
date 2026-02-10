import type { AuthenticatedUserLike, PostgrestErrorLike } from './types'

export function requireAuthenticatedUserId(user: unknown): string {
  if (!user || typeof user !== 'object') {
    throw new Error('Not authenticated')
  }

  const candidate = user as Partial<AuthenticatedUserLike>
  if (typeof candidate.id !== 'string' || candidate.id.length === 0) {
    throw new Error('Not authenticated')
  }

  return candidate.id
}

export function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const postgrestError = error as PostgrestErrorLike
  return postgrestError.code === 'PGRST116'
}

export function toNumber(value: number | string | null | undefined): number {
  return parseFloat(String(value || 0))
}

export function getTodayIsoDate(): string {
  return new Date().toISOString().split('T')[0]
}
