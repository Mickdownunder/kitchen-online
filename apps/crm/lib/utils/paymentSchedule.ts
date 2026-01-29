import { CustomerProject, PaymentSchedule, PartialPayment } from '@/types'

/**
 * MIGRATION NOTE:
 * Die Funktionen createFirstPayment() und createSecondPayment() erstellen noch
 * PartialPayment-Objekte für das Legacy-System (project.partialPayments).
 *
 * Für neue Implementierungen:
 * - Verwende createInvoice() aus '@/lib/supabase/services/invoices' direkt
 * - Die Beträge können weiterhin mit calculatePaymentAmounts() berechnet werden
 *
 * @see lib/supabase/services/invoices.ts
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
    first: Math.round(((total * schedule.firstPercent) / 100) * 100) / 100,
    second: Math.round(((total * schedule.secondPercent) / 100) * 100) / 100,
    final: Math.round(((total * schedule.finalPercent) / 100) * 100) / 100,
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

/**
 * Prüft ob eine erste Anzahlung bereits erstellt wurde (automatisch oder manuell)
 */
export function hasFirstPayment(project: CustomerProject): boolean {
  if (!project.partialPayments || project.partialPayments.length === 0) return false

  // Prüfe ob eine Anzahlung mit scheduleType 'first' existiert
  return project.partialPayments.some(p => p.scheduleType === 'first')
}

/**
 * Prüft ob eine zweite Anzahlung bereits erstellt wurde (automatisch oder manuell)
 */
export function hasSecondPayment(project: CustomerProject): boolean {
  if (!project.partialPayments || project.partialPayments.length === 0) return false

  // Prüfe ob eine Anzahlung mit scheduleType 'second' existiert
  return project.partialPayments.some(p => p.scheduleType === 'second')
}

/**
 * Erstellt eine PartialPayment für die erste Anzahlung basierend auf dem Zahlungsschema
 */
export function createFirstPayment(
  project: CustomerProject,
  invoiceNumber?: string
): PartialPayment | null {
  if (!project.paymentSchedule || !project.paymentSchedule.autoCreateFirst) return null
  if (hasFirstPayment(project)) return null // Bereits erstellt

  const amounts = calculatePaymentAmounts(project)
  if (!amounts) return null

  const paymentNumber = (project.partialPayments?.length || 0) + 1
  const defaultInvoiceNumber =
    invoiceNumber ||
    (project.invoiceNumber
      ? `${project.invoiceNumber}-A${paymentNumber}`
      : `R-${new Date().getFullYear()}-${project.orderNumber}-A${paymentNumber}`)

  return {
    id: `partial-${Date.now()}`,
    invoiceNumber: defaultInvoiceNumber,
    amount: amounts.first,
    date: project.orderDate || new Date().toISOString().split('T')[0],
    description: `${project.paymentSchedule.firstPercent}% Anzahlung`,
    isPaid: false,
    scheduleType: 'first',
  }
}

/**
 * Erstellt eine PartialPayment für die zweite Anzahlung basierend auf dem Zahlungsschema
 */
export function createSecondPayment(
  project: CustomerProject,
  invoiceNumber?: string
): PartialPayment | null {
  if (!project.paymentSchedule || !project.paymentSchedule.autoCreateSecond) return null
  if (!project.deliveryDate) return null // Kein Liefertermin = keine automatische Erstellung
  if (hasSecondPayment(project) || project.secondPaymentCreated) return null // Bereits erstellt

  const amounts = calculatePaymentAmounts(project)
  if (!amounts) return null

  const dueDate = getSecondPaymentDueDate(project)
  if (!dueDate) return null

  const paymentNumber = (project.partialPayments?.length || 0) + 1
  const defaultInvoiceNumber =
    invoiceNumber ||
    (project.invoiceNumber
      ? `${project.invoiceNumber}-A${paymentNumber}`
      : `R-${new Date().getFullYear()}-${project.orderNumber}-A${paymentNumber}`)

  const dueDateStr = dueDate.toISOString().split('T')[0]

  return {
    id: `partial-${Date.now()}`,
    invoiceNumber: defaultInvoiceNumber,
    amount: amounts.second,
    date: new Date().toISOString().split('T')[0], // Heute erstellt
    dueDate: dueDateStr, // Fälligkeitsdatum
    description: `${project.paymentSchedule.secondPercent}% Anzahlung (fällig ${dueDateStr})`,
    isPaid: false,
    scheduleType: 'second',
  }
}
