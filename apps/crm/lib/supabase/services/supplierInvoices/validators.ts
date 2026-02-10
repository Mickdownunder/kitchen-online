import type { AuthenticatedUserLike, PostgrestErrorLike } from './types'

const NOT_AUTHENTICATED_MESSAGE = 'Nicht authentifiziert'

export function getTodayIsoDate(): string {
  return new Date().toISOString().split('T')[0]
}

export function requireAuthenticatedUserId(user: unknown): string {
  if (!user || typeof user !== 'object') {
    throw new Error(NOT_AUTHENTICATED_MESSAGE)
  }

  const candidate = user as Partial<AuthenticatedUserLike>
  if (typeof candidate.id !== 'string' || candidate.id.length === 0) {
    throw new Error(NOT_AUTHENTICATED_MESSAGE)
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

export function requireNonEmptyCategoryName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('Kategorie-Name darf nicht leer sein')
  }

  return trimmed
}
