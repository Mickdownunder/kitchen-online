/**
 * Zentrale Formatierungs-Utilities
 *
 * Diese Funktionen ersetzen die duplizierten lokalen Implementierungen
 * in den einzelnen Komponenten.
 */

/**
 * Formatiert einen Geldbetrag im deutschen Format
 * @param value - Der zu formatierende Betrag
 * @returns Formatierter String (z.B. "1.234,56")
 */
export const formatCurrency = (value: number): string => {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Formatiert einen Geldbetrag mit Währungssymbol
 * @param value - Der zu formatierende Betrag
 * @param currency - Währungscode (default: EUR)
 * @returns Formatierter String (z.B. "1.234,56 €")
 */
export const formatCurrencyWithSymbol = (value: number, currency = 'EUR'): string => {
  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency,
  })
}

/**
 * Optionen für die Datumsformatierung
 */
export interface FormatDateOptions {
  /** Wochentag anzeigen (z.B. "Mo") */
  showWeekday?: boolean
  /** Locale (default: de-DE) */
  locale?: 'de-DE' | 'de-AT'
  /** Nur Monat und Jahr anzeigen */
  monthYearOnly?: boolean
}

/**
 * Formatiert ein Datum im deutschen Format
 * @param dateStr - ISO-Datumsstring oder undefined
 * @param options - Optionale Formatierungsoptionen
 * @returns Formatierter String (z.B. "01.02.2025") oder "-" wenn leer
 */
export const formatDate = (dateStr?: string, options?: FormatDateOptions): string => {
  if (!dateStr) return '-'

  const locale = options?.locale ?? 'de-DE'

  if (options?.monthYearOnly) {
    return new Date(dateStr).toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    })
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(options?.showWeekday && { weekday: 'short' }),
  }

  return new Date(dateStr).toLocaleDateString(locale, formatOptions)
}

/**
 * Formatiert ein Datum mit optionaler Uhrzeit
 * @param dateStr - ISO-Datumsstring
 * @param timeStr - Uhrzeit-String (z.B. "14:30")
 * @returns Formatierter String (z.B. "01.02.2025 14:30 Uhr")
 */
export const formatDateTime = (dateStr?: string, timeStr?: string): string => {
  if (!dateStr) return '-'
  const date = formatDate(dateStr)
  return timeStr ? `${date} ${timeStr} Uhr` : date
}

/**
 * Formatiert ein Datum relativ zum heutigen Tag
 * @param dateStr - ISO-Datumsstring
 * @returns "Heute", "Gestern", "Morgen" oder formatiertes Datum
 */
export const formatRelativeDate = (dateStr?: string): string => {
  if (!dateStr) return '-'

  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Heute'
  if (diffDays === 1) return 'Morgen'
  if (diffDays === -1) return 'Gestern'

  return formatDate(dateStr)
}

/**
 * Gibt das heutige Datum als ISO-String zurück (YYYY-MM-DD)
 */
export const getTodayISO = (): string => {
  return new Date().toISOString().split('T')[0]
}

/**
 * Formatiert eine Kalenderwoche
 * @param date - Datum
 * @returns String (z.B. "KW 5")
 */
export const formatWeekNumber = (date: Date): string => {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7)
  return `KW ${weekNumber}`
}
