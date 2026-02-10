import { fail, ok, type ServiceResult } from '@/lib/types/service'
import type { AuthenticatedUserLike, PostgrestErrorLike } from './types'

const NOT_AUTHENTICATED_MESSAGE = 'Nicht authentifiziert'

export function getTodayIsoDate(): string {
  return new Date().toISOString().split('T')[0]
}

export function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const postgrestError = error as PostgrestErrorLike
  return postgrestError.code === 'PGRST116'
}

export function ensureAuthenticatedUserId(user: unknown): ServiceResult<string> {
  if (!user || typeof user !== 'object') {
    return fail('UNAUTHORIZED', NOT_AUTHENTICATED_MESSAGE)
  }

  const candidate = user as Partial<AuthenticatedUserLike>
  if (typeof candidate.id !== 'string' || candidate.id.length === 0) {
    return fail('UNAUTHORIZED', NOT_AUTHENTICATED_MESSAGE)
  }

  return ok(candidate.id)
}

export function ensureNonEmptyCategoryName(name: string): ServiceResult<string> {
  const trimmed = name.trim()
  if (!trimmed) {
    return fail('VALIDATION', 'Kategorie-Name darf nicht leer sein')
  }

  return ok(trimmed)
}

export function toInternalErrorResult(error: unknown): ServiceResult<never> {
  const postgrestError = error as PostgrestErrorLike & { message?: string }
  return fail('INTERNAL', postgrestError.message || 'Unknown error', error)
}
