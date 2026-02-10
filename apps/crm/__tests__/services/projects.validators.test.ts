import type { InvoiceItem } from '@/types'
import {
  generateAccessCode,
  resolveUnit,
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
    expect(() => validateItems([makeItem({ quantity: 0 })])).toThrow('Ungültige Menge')
  })

  it('validates invoice items and rejects negative prices', () => {
    expect(() => validateItems([makeItem({ pricePerUnit: -1 })])).toThrow('Ungültiger Preis')
  })

  it('accepts valid items', () => {
    expect(() => validateItems([makeItem()])).not.toThrow()
  })
})
