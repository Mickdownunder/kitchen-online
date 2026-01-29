import type React from 'react'
import type { CustomerProject } from '@/types'
import { updateProject, createInvoice } from '@/lib/supabase/services'
import {
  isSecondPaymentDue,
  calculatePaymentAmounts,
  getSecondPaymentDueDate,
} from '@/lib/utils/paymentSchedule'
import { logger } from '@/lib/utils/logger'

/**
 * Background-Check für automatische Erstellung der zweiten Anzahlung
 * Prüft alle Projekte und erstellt die zweite Anzahlung, wenn:
 * - paymentSchedule konfiguriert ist
 * - autoCreateSecond === true
 * - deliveryDate vorhanden ist
 * - Fälligkeitsdatum (deliveryDate - secondDueDaysBeforeDelivery) erreicht oder überschritten
 * - secondPaymentCreated === false
 *
 * HINWEIS: Verwendet jetzt die neue invoices-Tabelle statt project.partialPayments
 */
export function schedulePaymentScheduleCheck(opts: {
  projects: CustomerProject[]
  setProjects: React.Dispatch<React.SetStateAction<CustomerProject[]>>
}): () => void {
  const timeoutId = setTimeout(async () => {
    try {
      let hasUpdates = false
      const updatedProjects: CustomerProject[] = []

      for (const project of opts.projects) {
        // Prüfe ob zweite Anzahlung fällig ist
        if (isSecondPaymentDue(project)) {
          // Bereits erstellt?
          if (project.secondPaymentCreated) {
            updatedProjects.push(project)
            continue
          }

          // Berechne Beträge
          const amounts = calculatePaymentAmounts(project)
          const dueDate = getSecondPaymentDueDate(project)

          if (amounts && project.paymentSchedule) {
            try {
              // Erstelle Rechnung über den neuen invoices-Service
              const newInvoice = await createInvoice({
                projectId: project.id,
                type: 'partial',
                amount: amounts.second,
                description: `2. Anzahlung (${project.paymentSchedule.secondPercent}%)`,
                dueDate: dueDate ? dueDate.toISOString().split('T')[0] : undefined,
                scheduleType: 'second',
              })

              // Markiere als erstellt
              await updateProject(project.id, {
                secondPaymentCreated: true,
                notes: `${project.notes || ''}\n${new Date().toLocaleDateString('de-DE')}: Zweite Anzahlung "${newInvoice.invoiceNumber}" (${amounts.second.toFixed(2)}€) automatisch erstellt.`,
              })

              const updatedProject: CustomerProject = {
                ...project,
                secondPaymentCreated: true,
              }

              updatedProjects.push(updatedProject)
              hasUpdates = true

              logger.info('Zweite Anzahlung automatisch erstellt', {
                component: 'paymentSchedule',
                projectId: project.id,
                orderNumber: project.orderNumber,
                invoiceNumber: newInvoice.invoiceNumber,
                amount: amounts.second,
              })
            } catch (error: unknown) {
              logger.error(
                'Fehler beim Erstellen der zweiten Anzahlung',
                { component: 'paymentSchedule', projectId: project.id },
                error as Error
              )
              updatedProjects.push(project)
            }
          } else {
            updatedProjects.push(project)
          }
        } else {
          updatedProjects.push(project)
        }
      }

      if (hasUpdates) {
        opts.setProjects(updatedProjects)
      }
    } catch (error: unknown) {
      logger.error(
        'Error checking payment schedule',
        { component: 'paymentSchedule' },
        error as Error
      )
    }
  }, 2000)

  return () => clearTimeout(timeoutId)
}
