import type { InvoiceItem } from '@/types'
import { logger } from '@/lib/utils/logger'
import type { ServiceErrorLike } from './types'

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

export function validateItems(items: InvoiceItem[]): void {
  for (const item of items) {
    if (item.quantity !== undefined && item.quantity <= 0) {
      throw new Error(
        `Ungültige Menge für Artikel "${item.description || 'Unbekannt'}": ${item.quantity}. Menge muss größer als 0 sein.`,
      )
    }

    if (item.pricePerUnit !== undefined && item.pricePerUnit < 0) {
      throw new Error(
        `Ungültiger Preis für Artikel "${item.description || 'Unbekannt'}": ${item.pricePerUnit}. Preis darf nicht negativ sein.`,
      )
    }
  }
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
