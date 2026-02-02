import { CustomerProject } from '@/types'
import { getProjects } from '@/lib/supabase/services/projects'
import { createCustomerDeliveryNote } from '@/lib/supabase/services/delivery'
import { getCompanySettings } from '@/lib/supabase/services/company'
import { deliveryNoteTemplate, invoiceTemplate } from '@/lib/utils/emailTemplates'
import { logger } from '@/lib/utils/logger'

/**
 * Workflow-Orchestration für komplexe Multi-Step-Aktionen
 */

export interface WorkflowStep {
  name: string
  execute: () => Promise<unknown>
  validate?: (result: unknown) => boolean
  retryOnFailure?: boolean
  maxRetries?: number
  // KRITISCH: Optionale Rollback-Funktion für Fehlerbehandlung
  rollback?: (result: unknown) => Promise<void>
}

export interface WorkflowResult {
  success: boolean
  steps: Array<{
    name: string
    success: boolean
    result?: unknown
    error?: string
  }>
  totalDuration: number
}

/**
 * Führt einen Workflow mit mehreren Schritten aus
 * KRITISCH: Bei Fehler werden Rollback-Funktionen für erfolgreich abgeschlossene Schritte aufgerufen
 */
export async function executeWorkflow(steps: WorkflowStep[]): Promise<WorkflowResult> {
  const startTime = Date.now()
  const results: WorkflowResult['steps'] = []
  const successfulSteps: Array<{ step: WorkflowStep; result: unknown }> = []

  logger.info('Workflow gestartet', {
    component: 'workflows',
    stepCount: steps.length,
  })

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    let success = false
    let result: unknown = undefined
    let error: string | undefined = undefined
    const maxRetries = step.maxRetries || 3
    let retryCount = 0

    while (retryCount < maxRetries && !success) {
      try {
        logger.debug(`Workflow Schritt ${i + 1}/${steps.length}: ${step.name}`, {
          component: 'workflows',
          attempt: retryCount + 1,
        })

        result = await step.execute()

        // Validation
        if (step.validate) {
          success = step.validate(result)
          if (!success) {
            throw new Error(`Validation fehlgeschlagen für Schritt: ${step.name}`)
          }
        } else {
          // Default validation: Prüfe ob Ergebnis nicht null/undefined ist
          success = result !== null && result !== undefined
        }

        if (success) {
          logger.info(`Workflow Schritt ${i + 1}/${steps.length} erfolgreich: ${step.name}`, {
            component: 'workflows',
          })
          // Track successful step for potential rollback
          successfulSteps.push({ step, result })
        }
      } catch (err: unknown) {
        error = err instanceof Error ? err.message : 'Unbekannter Fehler'
        logger.warn(`Workflow Schritt ${i + 1}/${steps.length} fehlgeschlagen: ${step.name}`, {
          component: 'workflows',
          error,
          attempt: retryCount + 1,
        })

        if (step.retryOnFailure !== false && retryCount < maxRetries - 1) {
          retryCount++
          // Kurze Pause vor Retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
          continue
        } else {
          success = false
        }
      }
    }

    results.push({
      name: step.name,
      success,
      result,
      error,
    })

    // Wenn Schritt fehlgeschlagen ist, führe Rollback für erfolgreiche Schritte aus
    if (!success) {
      logger.error('Workflow fehlgeschlagen, starte Rollback', {
        component: 'workflows',
        failedStep: step.name,
        successfulStepsCount: successfulSteps.length,
      })

      // KRITISCH: Rollback in umgekehrter Reihenfolge
      for (let j = successfulSteps.length - 1; j >= 0; j--) {
        const { step: successfulStep, result: stepResult } = successfulSteps[j]
        if (successfulStep.rollback) {
          try {
            logger.info(`Rollback für Schritt: ${successfulStep.name}`, {
              component: 'workflows',
            })
            await successfulStep.rollback(stepResult)
            logger.info(`Rollback erfolgreich für Schritt: ${successfulStep.name}`, {
              component: 'workflows',
            })
          } catch (rollbackError: unknown) {
            logger.error(`Rollback fehlgeschlagen für Schritt: ${successfulStep.name}`, {
              component: 'workflows',
              error: rollbackError instanceof Error ? rollbackError.message : 'Unknown error',
            })
            // Continue with other rollbacks even if one fails
          }
        }
      }

      // Stoppe Workflow nach Fehler und Rollback
      if (step.retryOnFailure === false) {
        break
      }
    }
  }

  const totalDuration = Date.now() - startTime
  const allSuccess = results.every(r => r.success)

  logger.info('Workflow abgeschlossen', {
    component: 'workflows',
    success: allSuccess,
    duration: totalDuration,
    stepsCompleted: results.filter(r => r.success).length,
    stepsTotal: results.length,
  })

  return {
    success: allSuccess,
    steps: results,
    totalDuration,
  }
}

/**
 * Workflow: Erstelle Lieferscheine für Projekte mit Installation nächsten Monat und versende sie
 */
export async function monthlyInstallationDeliveryWorkflow(
  recipientEmail: string
): Promise<WorkflowResult> {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0)

  logger.info('Starte Monthly Installation Delivery Workflow', {
    component: 'workflows',
    month: `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`,
    recipientEmail,
  })

  // Type for delivery note created in workflow
  interface WorkflowDeliveryNote {
    id: string
    deliveryNoteNumber: string
    deliveryDate: string
    deliveryAddress?: string
    items: Array<{ position: number; description: string; quantity: number; unit: string }>
  }

  // KRITISCH: Shared state für Daten zwischen Schritten
  // Verhindert Race Conditions durch erneutes Laden von Daten
  let cachedProjects: CustomerProject[] = []
  let createdDeliveryNotes: Array<{
    project: CustomerProject
    deliveryNote: WorkflowDeliveryNote
  }> = []

  // Schritt 1: Finde Projekte mit Installation nächsten Monat
  const step1: WorkflowStep = {
    name: 'Finde Projekte mit Installation nächsten Monat',
    execute: async () => {
      const allProjects = await getProjects()
      const targetProjects = allProjects.filter(p => {
        if (!p.installationDate) return false
        const installDate = new Date(p.installationDate)
        return installDate >= nextMonth && installDate <= nextMonthEnd
      })

      // Cache die Projekte für nachfolgende Schritte
      cachedProjects = targetProjects

      logger.info(`Gefundene Projekte für nächsten Monat: ${targetProjects.length}`, {
        component: 'workflows',
      })

      return targetProjects
    },
    validate: (result: unknown) => Array.isArray(result),
  }

  // Schritt 2: Erstelle Lieferscheine für alle Projekte
  const step2: WorkflowStep = {
    name: 'Erstelle Lieferscheine',
    execute: async () => {
      // KRITISCH: Verwende gecachte Projekte statt erneut zu laden
      const projects = cachedProjects
      const deliveryNotes = []

      for (const project of projects) {
        try {
          // Prüfe ob bereits geliefert - Lieferschein sollte dann bereits existieren
          if (project.isDelivered) {
            logger.debug(`Projekt ${project.orderNumber} ist bereits geliefert`, {
              component: 'workflows',
            })
            continue
          }

          const deliveryNote = await createCustomerDeliveryNote({
            projectId: project.id,
            deliveryNoteNumber: undefined, // Fortlaufend aus Stammdaten (getNextDeliveryNoteNumber)
            deliveryDate:
              project.installationDate ||
              project.deliveryDate ||
              new Date().toISOString().split('T')[0],
            items:
              project.items?.map((item, index) => ({
                position: index + 1,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
              })) || [],
            status: 'draft',
          })

          deliveryNotes.push({
            project,
            deliveryNote: {
              id: deliveryNote.id,
              deliveryNoteNumber: deliveryNote.deliveryNoteNumber,
              deliveryDate: deliveryNote.deliveryDate,
              deliveryAddress: deliveryNote.deliveryAddress,
              items: deliveryNote.items || [],
            },
          })
          logger.info(`Lieferschein erstellt für Projekt ${project.orderNumber}`, {
            component: 'workflows',
            deliveryNoteId: deliveryNote.id,
          })
        } catch (error: unknown) {
          logger.error(
            `Fehler beim Erstellen des Lieferscheins für Projekt ${project.orderNumber}`,
            {
              component: 'workflows',
            },
            error instanceof Error ? error : undefined
          )
          // Weiter mit nächstem Projekt
        }
      }

      // Cache die erstellten Lieferscheine für nachfolgende Schritte
      createdDeliveryNotes = deliveryNotes

      return deliveryNotes
    },
    validate: (result: unknown) => Array.isArray(result),
  }

  // Schritt 3: Versende Lieferscheine per E-Mail
  const step3: WorkflowStep = {
    name: 'Versende Lieferscheine per E-Mail',
    execute: async () => {
      // KRITISCH: Verwende gecachte Lieferscheine statt erneut zu erstellen
      const deliveryNotes = createdDeliveryNotes
      const emailResults: Array<{ project: string; success: boolean; error?: string }> = []

      // Hole Company Name für Email-Templates
      const companySettings = await getCompanySettings()
      const companyName =
        companySettings?.displayName || companySettings?.companyName || 'Ihr Unternehmen'

      for (const { project, deliveryNote } of deliveryNotes) {
        try {
          const template = deliveryNoteTemplate(project, deliveryNote.id, companyName)

          // Generiere PDF für Lieferschein
          let attachments:
            | Array<{ filename: string; content: string; contentType: string }>
            | undefined
          try {
            const pdfResponse = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/delivery-note/pdf`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  deliveryNote: {
                    deliveryNoteNumber: deliveryNote.deliveryNoteNumber,
                    deliveryDate: deliveryNote.deliveryDate,
                    deliveryAddress: deliveryNote.deliveryAddress,
                    items: deliveryNote.items,
                  },
                  project: {
                    customerName: project.customerName,
                    address: project.address,
                    phone: project.phone,
                    email: project.email,
                    orderNumber: project.orderNumber,
                    customerId: project.customerId,
                    id: project.id,
                    items: project.items,
                  },
                }),
              }
            )

            if (pdfResponse.ok) {
              const pdfData = (await pdfResponse.json()) as { filename: string; pdf: string }
              attachments = [
                {
                  filename: pdfData.filename,
                  content: pdfData.pdf,
                  contentType: 'application/pdf',
                },
              ]
            }
          } catch (pdfError) {
            logger.warn(
              `PDF-Generierung fehlgeschlagen für Lieferschein ${deliveryNote.deliveryNoteNumber}`,
              {
                component: 'workflows',
              },
              pdfError instanceof Error ? pdfError : undefined
            )
            // Weiter ohne PDF
          }

          // Verwende API-Route statt direkt sendEmail (server-seitig)
          const emailResponse = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/email/send`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: recipientEmail,
                subject: template.subject,
                html: template.html,
                text: template.text,
                attachments,
              }),
            }
          )

          if (!emailResponse.ok) {
            const errorData = (await emailResponse.json().catch(() => ({}))) as { error?: string }
            throw new Error(errorData.error || `HTTP ${emailResponse.status}`)
          }

          emailResults.push({ project: project.orderNumber || '', success: true })
          logger.info(`E-Mail versendet für Projekt ${project.orderNumber}`, {
            component: 'workflows',
          })
        } catch (error: unknown) {
          logger.error(
            `Fehler beim Versenden der E-Mail für Projekt ${project.orderNumber}`,
            {
              component: 'workflows',
            },
            error instanceof Error ? error : undefined
          )
          emailResults.push({
            project: project.orderNumber || '',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      return emailResults
    },
    validate: (result: unknown) => Array.isArray(result) && result.length > 0,
  }

  return executeWorkflow([step1, step2, step3])
}

/**
 * Workflow: Erstelle Rechnungen für Projekte und versende sie
 */
export async function invoiceWorkflow(
  projectIds: string[],
  recipientEmail: string
): Promise<WorkflowResult> {
  logger.info('Starte Invoice Workflow', {
    component: 'workflows',
    projectCount: projectIds.length,
    recipientEmail,
  })

  // Schritt 1: Hole Projekte
  const step1: WorkflowStep = {
    name: 'Hole Projekte',
    execute: async () => {
      const allProjects = await getProjects()
      return allProjects.filter(p => projectIds.includes(p.id))
    },
    validate: (result: unknown) => Array.isArray(result) && result.length > 0,
  }

  // Schritt 2: Erstelle Rechnungen (wird von KI über createFinalInvoice gemacht)
  // Schritt 3: Versende Rechnungen per E-Mail
  const step2: WorkflowStep = {
    name: 'Versende Rechnungen per E-Mail',
    execute: async () => {
      const projects = (await step1.execute()) as CustomerProject[]
      const emailResults: Array<{ project: string; success: boolean; error?: string }> = []

      // Hole Company Name für Email-Templates
      const companySettings = await getCompanySettings()
      const companyName =
        companySettings?.displayName || companySettings?.companyName || 'Ihr Unternehmen'

      // Import invoices service
      const { getInvoices } = await import('@/lib/supabase/services/invoices')

      for (const project of projects) {
        try {
          // Load invoices from database for this project
          const projectInvoices = await getInvoices(project.id)
          const finalInvoice = projectInvoices.find(inv => inv.type === 'final')

          if (!finalInvoice) {
            logger.warn(`Projekt ${project.orderNumber} hat keine Schlussrechnung`, {
              component: 'workflows',
            })
            continue
          }

          // Create invoice object compatible with template
          const invoiceForTemplate = {
            invoiceNumber: finalInvoice.invoiceNumber,
            amount: finalInvoice.amount,
            date: finalInvoice.invoiceDate,
            isPaid: finalInvoice.isPaid,
          }

          const template = invoiceTemplate(project, invoiceForTemplate, companyName)

          // Generiere PDF für Rechnung
          let attachments:
            | Array<{ filename: string; content: string; contentType: string }>
            | undefined
          try {
            const pdfResponse = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/invoice/pdf`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  invoice: {
                    invoiceNumber: finalInvoice.invoiceNumber,
                    amount: finalInvoice.amount,
                    date: finalInvoice.invoiceDate,
                    type: 'final',
                  },
                  project: {
                    customerName: project.customerName,
                    address: project.address,
                    phone: project.phone,
                    email: project.email,
                    orderNumber: project.orderNumber,
                    customerId: project.customerId,
                    id: project.id,
                    items: project.items,
                  },
                }),
              }
            )

            if (pdfResponse.ok) {
              const pdfData = (await pdfResponse.json()) as { filename: string; pdf: string }
              attachments = [
                {
                  filename: pdfData.filename,
                  content: pdfData.pdf,
                  contentType: 'application/pdf',
                },
              ]
            }
          } catch (pdfError) {
            logger.warn(
              `PDF-Generierung fehlgeschlagen für Projekt ${project.orderNumber}`,
              {
                component: 'workflows',
              },
              pdfError instanceof Error ? pdfError : undefined
            )
            // Weiter ohne PDF
          }

          // Verwende API-Route statt direkt sendEmail (server-seitig)
          const emailResponse = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/email/send`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: recipientEmail,
                subject: template.subject,
                html: template.html,
                text: template.text,
                attachments,
              }),
            }
          )

          if (!emailResponse.ok) {
            const errorData = (await emailResponse.json().catch(() => ({}))) as { error?: string }
            throw new Error(errorData.error || `HTTP ${emailResponse.status}`)
          }

          emailResults.push({ project: project.orderNumber || '', success: true })
        } catch (error: unknown) {
          logger.error(
            `Fehler beim Versenden der Rechnung für Projekt ${project.orderNumber}`,
            {
              component: 'workflows',
            },
            error instanceof Error ? error : undefined
          )
          emailResults.push({
            project: project.orderNumber || '',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      return emailResults
    },
    validate: (result: unknown) => Array.isArray(result),
  }

  return executeWorkflow([step1, step2])
}
