/**
 * Unit tests for format utilities.
 */

import {
  formatCurrency,
  formatCurrencyWithSymbol,
  formatDate,
  formatDateTime,
  formatRelativeDate,
  formatWeekNumber,
} from '@/lib/utils/formatters'

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

describe('formatCurrency', () => {
  it('formats number with German locale', () => {
    expect(formatCurrency(1234.56)).toBe('1.234,56')
    expect(formatCurrency(0)).toBe('0,00')
  })

  it('formats negative values', () => {
    expect(formatCurrency(-99.99)).toBe('-99,99')
  })

  it('formats large numbers', () => {
    expect(formatCurrency(1234567.89)).toMatch(/1\.234\.567,89/)
  })
})

describe('formatCurrencyWithSymbol', () => {
  it('formats with EUR by default', () => {
    expect(formatCurrencyWithSymbol(100)).toContain('100')
    expect(formatCurrencyWithSymbol(100)).toMatch(/€|EUR/)
  })

  it('accepts custom currency', () => {
    const result = formatCurrencyWithSymbol(100, 'CHF')
    expect(result).toContain('100')
    expect(result).toMatch(/CHF|Fr/)
  })
})

describe('formatDate', () => {
  it('returns "-" for undefined', () => {
    expect(formatDate()).toBe('-')
    expect(formatDate(undefined)).toBe('-')
  })

  it('formats ISO date string', () => {
    const result = formatDate('2025-02-08')
    expect(result).toMatch(/\d{1,2}\.\d{1,2}\.\d{4}/)
  })

  it('supports monthYearOnly option', () => {
    const result = formatDate('2025-02-08', { monthYearOnly: true })
    expect(result).toMatch(/Februar|February/)
    expect(result).toContain('2025')
  })

  it('supports showWeekday option', () => {
    const result = formatDate('2025-02-08', { showWeekday: true })
    expect(result.length).toBeGreaterThan(10)
  })

  it('supports locale option', () => {
    const result = formatDate('2025-02-08', { locale: 'de-AT' })
    expect(result).toMatch(/\d{1,2}\.\d{1,2}\.\d{4}/)
  })
})

describe('formatDateTime', () => {
  it('returns "-" for undefined date', () => {
    expect(formatDateTime()).toBe('-')
  })

  it('formats date only when no time', () => {
    const result = formatDateTime('2025-02-08')
    expect(result).toMatch(/\d{1,2}\.\d{1,2}\.\d{4}/)
    expect(result).not.toContain('Uhr')
  })

  it('appends time with "Uhr" when timeStr provided', () => {
    const result = formatDateTime('2025-02-08', '14:30')
    expect(result).toContain('14:30 Uhr')
  })
})

describe('formatRelativeDate', () => {
  it('returns "-" for undefined', () => {
    expect(formatRelativeDate()).toBe('-')
  })

  it('returns "Heute" for today', () => {
    const today = toLocalIsoDate(new Date())
    expect(formatRelativeDate(today)).toBe('Heute')
  })

  it('returns "Gestern" for yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(formatRelativeDate(toLocalIsoDate(yesterday))).toBe('Gestern')
  })

  it('returns "Morgen" for tomorrow', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(formatRelativeDate(toLocalIsoDate(tomorrow))).toBe('Morgen')
  })

  it('returns formatted date for other days', () => {
    const result = formatRelativeDate('2020-01-15')
    expect(result).toMatch(/\d{1,2}\.\d{1,2}\.\d{4}/)
  })
})

describe('formatWeekNumber', () => {
  it('returns KW format', () => {
    const result = formatWeekNumber(new Date(2025, 0, 15))
    expect(result).toMatch(/^KW \d+$/)
  })

  it('returns correct week for known date', () => {
    // Jan 6, 2025 is in week 2
    const result = formatWeekNumber(new Date(2025, 0, 6))
    expect(result).toBe('KW 2')
  })
})
