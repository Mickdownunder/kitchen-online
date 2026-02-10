import { fail, ok, type ServiceResult } from '@/lib/types/service'
import type { AuthenticatedUserLike, PostgrestErrorLike } from './types'

export function ensureAuthenticatedUserId(user: unknown): ServiceResult<string> {
  if (!user || typeof user !== 'object') {
    return fail('UNAUTHORIZED', 'Not authenticated')
  }

  const candidate = user as Partial<AuthenticatedUserLike>
  if (typeof candidate.id !== 'string' || candidate.id.length === 0) {
    return fail('UNAUTHORIZED', 'Not authenticated')
  }

  return ok(candidate.id)
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

export function toInternalErrorResult(error: unknown): ServiceResult<never> {
  const postgrestError = error as PostgrestErrorLike
  return fail('INTERNAL', postgrestError.message || 'Unknown error', error)
}
