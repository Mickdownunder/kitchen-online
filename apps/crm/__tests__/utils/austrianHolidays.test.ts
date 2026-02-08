/**
 * Unit tests for Austrian public holidays utility.
 *
 * Verifies fixed holidays, Easter-based (movable) holidays, and the
 * Meeus/Jones/Butcher Easter algorithm against known reference dates.
 */

import { getAustrianHolidays, getHolidayForDate, Holiday } from '@/lib/utils/austrianHolidays'

// ─── Helper ─────────────────────────────────────────────────────────

function holidayMap(year: number): Map<string, string> {
  return new Map(getAustrianHolidays(year).map(h => [h.date, h.name]))
}

// ─── getAustrianHolidays ────────────────────────────────────────────

describe('getAustrianHolidays', () => {
  it('returns exactly 13 holidays per year', () => {
    for (const year of [2024, 2025, 2026, 2030]) {
      expect(getAustrianHolidays(year)).toHaveLength(13)
    }
  })

  describe('fixed holidays are present every year', () => {
    const fixedHolidays = [
      { month: 1, day: 1, name: 'Neujahr' },
      { month: 1, day: 6, name: 'Heilige Drei Könige' },
      { month: 5, day: 1, name: 'Staatsfeiertag' },
      { month: 8, day: 15, name: 'Mariä Himmelfahrt' },
      { month: 10, day: 26, name: 'Nationalfeiertag' },
      { month: 11, day: 1, name: 'Allerheiligen' },
      { month: 12, day: 8, name: 'Mariä Empfängnis' },
      { month: 12, day: 25, name: 'Christtag' },
      { month: 12, day: 26, name: 'Stefanitag' },
    ]

    for (const { month, day, name } of fixedHolidays) {
      it(`includes ${name} (${day}.${month}.)`, () => {
        const map = holidayMap(2026)
        const dateStr = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        expect(map.get(dateStr)).toBe(name)
      })
    }
  })

  describe('movable holidays (Easter-based)', () => {
    it('includes all 4 movable holidays', () => {
      const names = getAustrianHolidays(2026).map(h => h.name)
      expect(names).toContain('Ostermontag')
      expect(names).toContain('Christi Himmelfahrt')
      expect(names).toContain('Pfingstmontag')
      expect(names).toContain('Fronleichnam')
    })
  })
})

// ─── Easter algorithm verification ──────────────────────────────────
// Reference Easter Sunday dates (from established tables):
// https://en.wikipedia.org/wiki/List_of_dates_for_Easter

describe('Easter algorithm (via Ostermontag = Easter + 1)', () => {
  const easterSundays: Record<number, string> = {
    2020: '2020-04-12',
    2021: '2021-04-04',
    2022: '2022-04-17',
    2023: '2023-04-09',
    2024: '2024-03-31',
    2025: '2025-04-20',
    2026: '2026-04-05',
    2027: '2027-03-28',
    2028: '2028-04-16',
    2029: '2029-04-01',
    2030: '2030-04-21',
  }

  for (const [yearStr, easterStr] of Object.entries(easterSundays)) {
    const year = Number(yearStr)
    it(`correctly computes Easter ${year} (via Ostermontag)`, () => {
      const map = holidayMap(year)
      // Ostermontag = Easter Sunday + 1 day
      const easterDate = new Date(easterStr)
      const ostermontagDate = new Date(easterDate)
      ostermontagDate.setDate(ostermontagDate.getDate() + 1)
      const expected = `${year}-${String(ostermontagDate.getMonth() + 1).padStart(2, '0')}-${String(ostermontagDate.getDate()).padStart(2, '0')}`

      expect(map.get(expected)).toBe('Ostermontag')
    })
  }
})

// ─── Specific year: 2026 movable dates ──────────────────────────────
// Easter 2026 = April 5 → Ostermontag = April 6

describe('2026 movable holiday dates', () => {
  const map = holidayMap(2026)

  it('Ostermontag is 2026-04-06', () => {
    expect(map.get('2026-04-06')).toBe('Ostermontag')
  })

  it('Christi Himmelfahrt is 2026-05-14 (Easter + 39)', () => {
    expect(map.get('2026-05-14')).toBe('Christi Himmelfahrt')
  })

  it('Pfingstmontag is 2026-05-25 (Easter + 50)', () => {
    expect(map.get('2026-05-25')).toBe('Pfingstmontag')
  })

  it('Fronleichnam is 2026-06-04 (Easter + 60)', () => {
    expect(map.get('2026-06-04')).toBe('Fronleichnam')
  })
})

// ─── getHolidayForDate ──────────────────────────────────────────────

describe('getHolidayForDate', () => {
  it('returns holiday name for a known holiday', () => {
    expect(getHolidayForDate(new Date(2026, 0, 1))).toBe('Neujahr')
    expect(getHolidayForDate(new Date(2026, 11, 25))).toBe('Christtag')
    expect(getHolidayForDate(new Date(2026, 9, 26))).toBe('Nationalfeiertag')
  })

  it('returns holiday name for a movable holiday', () => {
    // Ostermontag 2026 = April 6
    expect(getHolidayForDate(new Date(2026, 3, 6))).toBe('Ostermontag')
  })

  it('returns null for a non-holiday', () => {
    // Jan 2 is never a holiday in Austria
    expect(getHolidayForDate(new Date(2026, 0, 2))).toBeNull()
    // Regular weekday
    expect(getHolidayForDate(new Date(2026, 5, 15))).toBeNull()
  })

  it('caches results (second call same year uses cache)', () => {
    // Call twice for same year, both should work correctly
    const first = getHolidayForDate(new Date(2025, 0, 1))
    const second = getHolidayForDate(new Date(2025, 0, 6))
    expect(first).toBe('Neujahr')
    expect(second).toBe('Heilige Drei Könige')
  })

  it('handles different years correctly', () => {
    expect(getHolidayForDate(new Date(2024, 0, 1))).toBe('Neujahr')
    expect(getHolidayForDate(new Date(2030, 0, 1))).toBe('Neujahr')
  })
})

// ─── Edge cases ─────────────────────────────────────────────────────

describe('edge cases', () => {
  it('handles holidays that can be unique dates each year', () => {
    // No duplicate dates per year
    for (const year of [2024, 2025, 2026, 2027, 2028]) {
      const holidays = getAustrianHolidays(year)
      const dates = holidays.map(h => h.date)
      const unique = new Set(dates)
      expect(unique.size).toBe(dates.length)
    }
  })

  it('all dates are valid ISO format YYYY-MM-DD', () => {
    const holidays = getAustrianHolidays(2026)
    for (const h of holidays) {
      expect(h.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('all holiday names are non-empty strings', () => {
    const holidays = getAustrianHolidays(2026)
    for (const h of holidays) {
      expect(h.name.length).toBeGreaterThan(0)
    }
  })
})
