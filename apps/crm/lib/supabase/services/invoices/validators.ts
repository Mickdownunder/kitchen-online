import type { InvoiceType } from '@/types'
import { fail, ok, type ServiceResult } from '@/lib/types/service'
import type {
  AuthenticatedUserLike,
  AuthorizedUserId,
  PostgrestErrorLike,
} from './types'

export function ensureAuthenticatedUserId(user: unknown): AuthorizedUserId {
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

export function toInternalErrorResult(error: unknown): ServiceResult<never> {
  const postgrestError = error as PostgrestErrorLike
  return fail('INTERNAL', postgrestError.message || 'Unknown error', error)
}

export function getTodayIsoDate(): string {
  return new Date().toISOString().split('T')[0]
}

export function getTodayLocaleDateDeAT(): string {
  return new Date().toLocaleDateString('de-AT')
}

export function ensureInvoiceCanBeCancelled(type: InvoiceType): ServiceResult<void> {
  if (type === 'credit') {
    return fail('VALIDATION', 'Eine Stornorechnung kann nicht storniert werden')
  }

  return ok(undefined)
}

export function resolveCancelAmount(
  partialAmount: number | undefined,
  remainingAmount: number,
): ServiceResult<number> {
  if (partialAmount !== undefined && partialAmount > 0) {
    if (partialAmount > remainingAmount) {
      return fail(
        'VALIDATION',
        `Teilstorno-Betrag (${partialAmount.toFixed(2)}€) übersteigt den noch stornierbaren Betrag (${remainingAmount.toFixed(2)}€)`,
      )
    }

    return ok(partialAmount)
  }

  return ok(remainingAmount)
}
