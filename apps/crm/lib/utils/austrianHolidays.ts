/**
 * Austrian statutory public holidays (gesetzliche Feiertage Österreich).
 * Based on Arbeitsruhegesetz – keine kirchlichen Gedenktage, nur echte Feiertage.
 */

export interface Holiday {
  /** ISO date string YYYY-MM-DD */
  date: string
  /** German label */
  name: string
}

/**
 * Computes Easter Sunday for a given year (Meeus/Jones/Butcher algorithm).
 */
function getEasterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Returns all Austrian public holidays for a given year.
 */
export function getAustrianHolidays(year: number): Holiday[] {
  const easter = getEasterSunday(year)

  const addDays = (d: Date, days: number): Date => {
    const r = new Date(d)
    r.setDate(r.getDate() + days)
    return r
  }

  const holidays: Holiday[] = []

  // Fixed dates
  holidays.push({ date: toDateStr(year, 1, 1), name: 'Neujahr' })
  holidays.push({ date: toDateStr(year, 1, 6), name: 'Heilige Drei Könige' })
  holidays.push({ date: toDateStr(year, 5, 1), name: 'Staatsfeiertag' })
  holidays.push({ date: toDateStr(year, 8, 15), name: 'Mariä Himmelfahrt' })
  holidays.push({ date: toDateStr(year, 10, 26), name: 'Nationalfeiertag' })
  holidays.push({ date: toDateStr(year, 11, 1), name: 'Allerheiligen' })
  holidays.push({ date: toDateStr(year, 12, 8), name: 'Mariä Empfängnis' })
  holidays.push({ date: toDateStr(year, 12, 25), name: 'Christtag' })
  holidays.push({ date: toDateStr(year, 12, 26), name: 'Stefanitag' })

  // Easter-based (Month is 0-indexed in Date)
  const ostermontag = addDays(easter, 1)
  holidays.push({
    date: toDateStr(ostermontag.getFullYear(), ostermontag.getMonth() + 1, ostermontag.getDate()),
    name: 'Ostermontag',
  })

  const himmelfahrt = addDays(easter, 39)
  holidays.push({
    date: toDateStr(himmelfahrt.getFullYear(), himmelfahrt.getMonth() + 1, himmelfahrt.getDate()),
    name: 'Christi Himmelfahrt',
  })

  const pfingstmontag = addDays(easter, 50)
  holidays.push({
    date: toDateStr(pfingstmontag.getFullYear(), pfingstmontag.getMonth() + 1, pfingstmontag.getDate()),
    name: 'Pfingstmontag',
  })

  const fronleichnam = addDays(easter, 60)
  holidays.push({
    date: toDateStr(fronleichnam.getFullYear(), fronleichnam.getMonth() + 1, fronleichnam.getDate()),
    name: 'Fronleichnam',
  })

  return holidays
}

/** Cache: year -> Map of dateStr -> name */
const cache = new Map<number, Map<string, string>>()

/**
 * Returns the holiday name for a given date, or null if not a holiday.
 */
export function getHolidayForDate(date: Date): string | null {
  const year = date.getFullYear()
  let yearMap = cache.get(year)
  if (!yearMap) {
    const list = getAustrianHolidays(year)
    yearMap = new Map(list.map(h => [h.date, h.name]))
    cache.set(year, yearMap)
  }
  const dateStr = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return yearMap.get(dateStr) ?? null
}
