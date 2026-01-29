import { Reminder } from '@/types'

/**
 * Generic invoice-like interface for calculations
 * Works with both legacy PartialPayment and new Invoice type
 */
interface InvoiceLike {
  date?: string
  invoiceDate?: string
  dueDate?: string
  isPaid?: boolean
  reminders?: Reminder[]
}

/**
 * Berechnet das Fälligkeitsdatum für eine Rechnung
 */
export function calculateDueDate(
  invoice: InvoiceLike,
  defaultPaymentTerms?: number
): string | null {
  // Wenn dueDate bereits vorhanden, verwende es
  if (invoice.dueDate) {
    return invoice.dueDate
  }

  // Hole das Datum (unterstützt sowohl date als auch invoiceDate)
  const dateStr = invoice.date || invoice.invoiceDate
  if (!dateStr) return null

  // Berechne aus date + defaultPaymentTerms
  if (defaultPaymentTerms !== undefined && defaultPaymentTerms >= 0) {
    const invoiceDate = new Date(dateStr)
    invoiceDate.setDate(invoiceDate.getDate() + defaultPaymentTerms)
    return invoiceDate.toISOString().split('T')[0]
  }

  return null
}

/**
 * Berechnet die Anzahl überfälliger Tage
 * @returns Anzahl Tage (negativ = noch nicht fällig, 0 = heute fällig, positiv = überfällig)
 */
export function calculateOverdueDays(dueDate: string | null | undefined): number | null {
  if (!dueDate) return null

  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const diffTime = today.getTime() - due.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Bestimmt die nächste Mahnungsstufe basierend auf bereits gesendeten Mahnungen
 */
export function getNextReminderType(reminders?: Reminder[]): 'first' | 'second' | 'final' | null {
  if (!reminders || reminders.length === 0) {
    return 'first'
  }

  const hasFirst = reminders.some(r => r.type === 'first')
  const hasSecond = reminders.some(r => r.type === 'second')
  const hasFinal = reminders.some(r => r.type === 'final')

  if (!hasFirst) return 'first'
  if (!hasSecond) return 'second'
  if (!hasFinal) return 'final'

  return null // Alle Mahnungen bereits gesendet
}

/**
 * Prüft ob eine Mahnung gesendet werden kann
 */
export function canSendReminder(
  invoice: InvoiceLike,
  reminderType: 'first' | 'second' | 'final',
  daysBetweenReminders: number = 7
): boolean {
  // Rechnung muss unbezahlt sein
  if (invoice.isPaid) return false

  // Für erste Mahnung: Rechnung muss fällig sein
  if (reminderType === 'first') {
    if (!invoice.dueDate) return false
    const overdueDays = calculateOverdueDays(invoice.dueDate)
    if (overdueDays === null || overdueDays < 0) return false
    // Prüfe ob bereits erste Mahnung gesendet wurde
    const hasFirst = invoice.reminders?.some(r => r.type === 'first')
    return !hasFirst
  }

  // Für zweite Mahnung: Erste Mahnung muss gesendet sein und X Tage vergangen
  if (reminderType === 'second') {
    const firstReminder = invoice.reminders?.find(r => r.type === 'first')
    if (!firstReminder) return false

    const firstSentDate = new Date(firstReminder.sentAt)
    const today = new Date()
    const daysSinceFirst = Math.ceil(
      (today.getTime() - firstSentDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceFirst < daysBetweenReminders) return false

    // Prüfe ob bereits zweite Mahnung gesendet wurde
    const hasSecond = invoice.reminders?.some(r => r.type === 'second')
    return !hasSecond
  }

  // Für letzte Mahnung: Zweite Mahnung muss gesendet sein und X Tage vergangen
  if (reminderType === 'final') {
    const secondReminder = invoice.reminders?.find(r => r.type === 'second')
    if (!secondReminder) return false

    const secondSentDate = new Date(secondReminder.sentAt)
    const today = new Date()
    const daysSinceSecond = Math.ceil(
      (today.getTime() - secondSentDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceSecond < daysBetweenReminders) return false

    // Prüfe ob bereits letzte Mahnung gesendet wurde
    const hasFinal = invoice.reminders?.some(r => r.type === 'final')
    return !hasFinal
  }

  return false
}

/**
 * Gibt die letzte gesendete Mahnung zurück
 */
export function getLastReminder(reminders?: Reminder[]): Reminder | null {
  if (!reminders || reminders.length === 0) return null

  // Sortiere nach sentAt (neueste zuerst)
  const sorted = [...reminders].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
  )

  return sorted[0]
}

/**
 * Gibt die Mahnungsstufe als Text zurück
 */
export function getReminderStatusText(reminders?: Reminder[]): string {
  if (!reminders || reminders.length === 0) return 'Keine'

  const lastReminder = getLastReminder(reminders)
  if (!lastReminder) return 'Keine'

  const sentDate = new Date(lastReminder.sentAt).toLocaleDateString('de-DE')

  switch (lastReminder.type) {
    case 'first':
      return `1. Mahnung (${sentDate})`
    case 'second':
      return `2. Mahnung (${sentDate})`
    case 'final':
      return `Letzte Mahnung (${sentDate})`
    default:
      return 'Keine'
  }
}

/**
 * Berechnet Verzugszinsen (optional)
 */
export function calculateLatePaymentInterest(
  amount: number,
  overdueDays: number,
  interestRate: number = 9.2 // Österreichischer Standard
): number {
  if (overdueDays <= 0) return 0

  // Verzugszinsen pro Jahr: (Betrag * Zinssatz / 100) * (Tage / 365)
  const yearlyInterest = (amount * interestRate) / 100
  const dailyInterest = yearlyInterest / 365
  const totalInterest = dailyInterest * overdueDays

  return Math.round(totalInterest * 100) / 100 // Auf 2 Dezimalstellen runden
}
