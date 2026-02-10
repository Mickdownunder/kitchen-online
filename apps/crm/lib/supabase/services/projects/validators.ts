import type { InvoiceItem } from '@/types'
import { fail, ok, type ServiceResult } from '@/lib/types/service'
import { logger } from '@/lib/utils/logger'
import type { AuthenticatedUserLike, ServiceErrorLike } from './types'

const UNIT_MAP: Record<string, InvoiceItem['unit']> = {
  Stk: 'Stk',
  stk: 'Stk',
  STK: 'Stk',
  Pkg: 'Pkg',
  pkg: 'Pkg',
  PKG: 'Pkg',
  Std: 'Std',
  std: 'Std',
  STD: 'Std',
  Paush: 'Paush',
  paush: 'Paush',
  PAUSH: 'Paush',
  m: 'm',
  M: 'm',
  lfm: 'lfm',
  LFM: 'lfm',
  'lfm.': 'lfm',
  'm²': 'm²',
  m2: 'm²',
  'M²': 'm²',
  qm: 'm²',
  QM: 'm²',
}

export function resolveUnit(raw: string): InvoiceItem['unit'] {
  return UNIT_MAP[raw] || 'Stk'
}

export function generateAccessCode(length = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''

  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }

  return result
}

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

  const postgrestError = error as ServiceErrorLike
  return postgrestError.code === 'PGRST116'
}

export function toInternalErrorResult(error: unknown): ServiceResult<never> {
  const postgrestError = error as ServiceErrorLike
  return fail('INTERNAL', postgrestError.message || 'Unknown error', error)
}

export function validateItems(items: InvoiceItem[]): ServiceResult<void> {
  for (const item of items) {
    if (item.quantity !== undefined && item.quantity <= 0) {
      return fail(
        'VALIDATION',
        `Ungültige Menge für Artikel "${item.description || 'Unbekannt'}": ${item.quantity}. Menge muss größer als 0 sein.`,
      )
    }

    if (item.pricePerUnit !== undefined && item.pricePerUnit < 0) {
      return fail(
        'VALIDATION',
        `Ungültiger Preis für Artikel "${item.description || 'Unbekannt'}": ${item.pricePerUnit}. Preis darf nicht negativ sein.`,
      )
    }
  }

  return ok(undefined)
}

export function logSupabaseError(fn: string, error: unknown): void {
  const e = error as ServiceErrorLike
  logger.error(
    `${fn} error`,
    {
      component: 'projects',
      message: e?.message,
      code: e?.code,
      details: e?.details,
      hint: e?.hint,
    },
    error as Error,
  )
}

export function logServiceError(fn: string, error: unknown): void {
  const e = error as ServiceErrorLike
  logger.error(
    `${fn} failed`,
    {
      component: 'projects',
      message: e?.message,
      code: e?.code,
      details: e?.details,
      hint: e?.hint,
    },
    error as Error,
  )
}
