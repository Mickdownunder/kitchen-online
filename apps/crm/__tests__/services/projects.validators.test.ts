import type { InvoiceItem } from '@/types'
import {
  ensureAuthenticatedUserId,
  generateAccessCode,
  isNotFoundError,
  resolveUnit,
  toInternalErrorResult,
  validateItems,
} from '@/lib/supabase/services/projects/validators'

function makeItem(overrides: Partial<InvoiceItem> = {}): InvoiceItem {
  return {
    id: 'item-1',
    position: 1,
    description: 'Artikel',
    quantity: 1,
    unit: 'Stk',
    pricePerUnit: 100,
    taxRate: 20,
    netTotal: 100,
    taxAmount: 20,
    grossTotal: 120,
    ...overrides,
  }
}

describe('projects validators', () => {
  it('resolves units to supported values', () => {
    expect(resolveUnit('stk')).toBe('Stk')
    expect(resolveUnit('qm')).toBe('m²')
    expect(resolveUnit('unknown')).toBe('Stk')
  })

  it('generates uppercase alphanumeric access codes', () => {
    const code = generateAccessCode(16)

    expect(code).toHaveLength(16)
    expect(code).toMatch(/^[A-Z0-9]+$/)
  })

  it('validates invoice items and rejects invalid quantity', () => {
    const result = validateItems([makeItem({ quantity: 0 })])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('VALIDATION')
      expect(result.message).toContain('Ungültige Menge')
    }
  })

  it('validates invoice items and rejects negative prices', () => {
    const result = validateItems([makeItem({ pricePerUnit: -1 })])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('VALIDATION')
      expect(result.message).toContain('Ungültiger Preis')
    }
  })

  it('accepts valid items', () => {
    const result = validateItems([makeItem()])
    expect(result).toEqual({ ok: true, data: undefined })
  })

  it('returns unauthorized when no user id is present', () => {
    const result = ensureAuthenticatedUserId(null)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
      expect(result.message).toBe('Not authenticated')
    }
  })

  it('detects PostgREST not found errors', () => {
    expect(isNotFoundError({ code: 'PGRST116' })).toBe(true)
    expect(isNotFoundError({ code: 'PGRST999' })).toBe(false)
  })

  it('maps unknown errors to internal service failures', () => {
    const error = new Error('boom')
    const result = toInternalErrorResult(error)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL')
      expect(result.message).toBe('boom')
    }
  })
})
