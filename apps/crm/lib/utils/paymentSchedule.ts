import { CustomerProject, PaymentSchedule } from '@/types'
import { roundTo2Decimals } from '@/lib/utils/priceCalculations'

/**
 * Zahlungsschema-Utilities.
 * Rechnungen werden in der invoices-Tabelle verwaltet (createInvoice aus invoices-Service).
 */

/**
 * Standard-Zahlungsschema: 40% - 40% - 20%
 */
export function getDefaultPaymentSchedule(): PaymentSchedule {
  return {
    firstPercent: 40,
    secondPercent: 40,
    finalPercent: 20,
    secondDueDaysBeforeDelivery: 21, // 3 Wochen
    autoCreateFirst: true,
    autoCreateSecond: true,
  }
}

/**
 * Validiert ob ein Zahlungsschema gültig ist (Summe = 100%)
 */
export function validatePaymentSchedule(schedule: PaymentSchedule): boolean {
  const sum = schedule.firstPercent + schedule.secondPercent + schedule.finalPercent
  return Math.abs(sum - 100) < 0.01 // Toleranz für Rundungsfehler
}

/**
 * Berechnet die Beträge für alle drei Zahlungen basierend auf dem Gesamtbetrag
 */
export function calculatePaymentAmounts(
  project: CustomerProject
): { first: number; second: number; final: number } | null {
  if (!project.paymentSchedule) return null

  const schedule = project.paymentSchedule
  const total = project.totalAmount

  return {
    first: roundTo2Decimals((total * schedule.firstPercent) / 100),
    second: roundTo2Decimals((total * schedule.secondPercent) / 100),
    final: roundTo2Decimals((total * schedule.finalPercent) / 100),
  }
}

/**
 * Prüft ob die zweite Anzahlung fällig ist (3 Wochen vor Liefertermin)
 */
export function isSecondPaymentDue(project: CustomerProject): boolean {
  if (!project.paymentSchedule || !project.deliveryDate) return false
  if (project.secondPaymentCreated) return false // Bereits erstellt

  const deliveryDate = new Date(project.deliveryDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dueDate = new Date(deliveryDate)
  dueDate.setDate(dueDate.getDate() - project.paymentSchedule.secondDueDaysBeforeDelivery)
  dueDate.setHours(0, 0, 0, 0)

  return dueDate <= today
}

/**
 * Gibt das Fälligkeitsdatum der zweiten Anzahlung zurück
 */
export function getSecondPaymentDueDate(project: CustomerProject): Date | null {
  if (!project.paymentSchedule || !project.deliveryDate) return null

  const deliveryDate = new Date(project.deliveryDate)
  const dueDate = new Date(deliveryDate)
  dueDate.setDate(dueDate.getDate() - project.paymentSchedule.secondDueDaysBeforeDelivery)

  return dueDate
}

/**
 * Berechnet die Anzahl der Tage bis zur Fälligkeit der zweiten Anzahlung
 * Negativ = bereits fällig, Positiv = noch X Tage
 */
export function getDaysUntilSecondPaymentDue(project: CustomerProject): number | null {
  if (!project.paymentSchedule || !project.deliveryDate) return null

  const dueDate = getSecondPaymentDueDate(project)
  if (!dueDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  dueDate.setHours(0, 0, 0, 0)

  const diffTime = dueDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

