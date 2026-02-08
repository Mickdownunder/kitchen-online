import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/supabase/services/email'
import { getProject } from '@/lib/supabase/services/projects'
import { getInvoice, updateInvoice } from '@/lib/supabase/services/invoices'
import { reminderTemplate } from '@/lib/utils/emailTemplates'
import { calculateOverdueDays, canSendReminder } from '@/hooks/useInvoiceCalculations'
import { logger } from '@/lib/utils/logger'
import { apiErrors } from '@/lib/utils/errorHandling'
import { Reminder } from '@/types'
import { generatePDF } from '@/lib/pdf/pdfGenerator'
import { getCompanySettings } from '@/lib/supabase/services/company'

function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  return escaped.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('')
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * API-Route: Mahnung per E-Mail mit PDF versenden
 *
 * Parameter:
 * - projectId: string (erforderlich)
 * - invoiceId: string (erforderlich) - ID der PartialPayment oder 'final' für Schlussrechnung
 * - reminderType: 'first' | 'second' | 'final' (erforderlich)
 * - recipientEmail?: string (optional, falls abweichend von Projekt-E-Mail)
 */
export async function POST(request: NextRequest) {
  const apiLogger = logger.api('/api/reminders/send', 'POST')
  const startTime = apiLogger.start()

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      apiLogger.error(new Error('Not authenticated'), 401)
      return apiErrors.unauthorized()
    }

    // Check company context
    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      apiLogger.error(new Error('No company assigned'), 403)
      return apiErrors.forbidden()
    }

    // Check permission
    const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
      p_permission_code: 'mark_payments',
    })
    if (permError || !hasPermission) {
      apiLogger.error(new Error('No permission'), 403)
      return apiErrors.forbidden()
    }

    const body = await request.json()
    const {
      projectId,
      invoiceId,
      reminderType,
      recipientEmail: bodyRecipientEmail,
      subject: customSubject,
      html: customHtml,
      text: customText,
    } = body

    if (!projectId || !invoiceId || !reminderType) {
      apiLogger.error(new Error('Missing required fields'), 400)
      return apiErrors.badRequest()
    }

    if (!['first', 'second', 'final'].includes(reminderType)) {
      return apiErrors.validation()
    }

    // Lade Projekt FRISCH aus der Datenbank
    const project = await getProject(projectId)
    if (!project) {
      return apiErrors.notFound()
    }

    // Lade Rechnung aus der neuen invoices-Tabelle
    const invoice = await getInvoice(invoiceId)
    if (!invoice) {
      return apiErrors.notFound()
    }

    // Konvertiere für Kompatibilität
    const invoiceForReminder = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      date: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      isPaid: invoice.isPaid,
      paidDate: invoice.paidDate,
      reminders: invoice.reminders || [],
    }

    // Prüfe ob Rechnung bezahlt ist
    if (invoice.isPaid) {
      return apiErrors.badRequest()
    }

    // Lade Company Settings für Mahnungs-Einstellungen
    const companySettings = await getCompanySettings()
    const daysBetweenReminders =
      reminderType === 'first'
        ? companySettings?.reminderDaysBetweenFirst || 7
        : reminderType === 'second'
          ? companySettings?.reminderDaysBetweenSecond || 7
          : companySettings?.reminderDaysBetweenFinal || 7

    // Prüfe ob Mahnung gesendet werden kann
    if (
      !canSendReminder(
        invoiceForReminder,
        reminderType as 'first' | 'second' | 'final',
        daysBetweenReminders
      )
    ) {
      return apiErrors.badRequest()
    }

    // Berechne überfällige Tage
    const dueDate = invoiceForReminder.dueDate || invoiceForReminder.date
    const overdueDays = calculateOverdueDays(dueDate) || 0

    // Bestimme E-Mail-Adresse (Vorschau-Bestätigung kann eigene Adresse übergeben)
    const email = bodyRecipientEmail || project.email
    if (!email) {
      return apiErrors.badRequest()
    }

    // E-Mail-Inhalt: Vorschau-Overrides oder generiertes Template
    const companyName =
      companySettings?.displayName || companySettings?.companyName || 'Ihr Unternehmen'
    let subject: string
    let html: string
    let text: string
    if (customSubject != null && (customHtml != null || customText != null)) {
      subject = customSubject
      html = customHtml ?? textToHtml(customText ?? '')
      text = customText ?? stripHtml(customHtml ?? '')
    } else {
      const emailTemplate = reminderTemplate(
        project,
        invoiceForReminder,
        reminderType as 'first' | 'second' | 'final',
        overdueDays,
        companyName
      )
      subject = emailTemplate.subject
      html = emailTemplate.html
      text = emailTemplate.text
    }

    // Generiere Mahnungs-PDF
    let pdfBase64: string | null = null
    let pdfFilename: string | null = null

    try {
      const pdfResult = await generatePDF({
        type: 'reminder',
        project,
        invoice: invoiceForReminder,
        reminderType: reminderType as 'first' | 'second' | 'final',
        overdueDays,
      })
      pdfBase64 = pdfResult.pdf
      pdfFilename = pdfResult.filename
    } catch (error: unknown) {
      logger.warn('PDF-Generierung für Mahnung fehlgeschlagen, sende ohne PDF', {
        component: 'api/reminders/send',
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      })
      // Weiter ohne PDF
    }

    // Versende E-Mail (subject/html/text aus Vorschau oder Template)
    try {
      await sendEmail({
        to: email,
        subject,
        html,
        text,
        attachments: pdfBase64
          ? [
              {
                filename: pdfFilename || `Mahnung_${invoice.invoiceNumber}.pdf`,
                content: pdfBase64,
                contentType: 'application/pdf',
              },
            ]
          : undefined,
      })

      logger.info('Mahnungs-E-Mail erfolgreich versendet', {
        component: 'api/reminders/send',
        projectId,
        invoiceId,
        reminderType,
        email,
      })
    } catch (error: unknown) {
      logger.error(
        'Fehler beim Versenden der Mahnungs-E-Mail',
        {
          component: 'api/reminders/send',
          projectId,
          invoiceId,
          reminderType,
        },
        error as Error
      )
      return apiErrors.internal(error as Error, { component: 'api/reminders/send' })
    }

    // Erstelle Reminder-Objekt
    const reminder: Reminder = {
      id: `reminder-${Date.now()}`,
      type: reminderType as 'first' | 'second' | 'final',
      sentAt: new Date().toISOString(),
      sentByUserId: user.id,
      emailSent: true,
      pdfGenerated: pdfBase64 !== null,
      notes: `Mahnung per E-Mail an ${email} gesendet`,
    }

    // Speichere Reminder in der neuen invoices-Tabelle
    try {
      const updatedReminders = [...(invoice.reminders || []), reminder]
      await updateInvoice(invoiceId, {
        reminders: updatedReminders,
      })

      logger.info('Reminder erfolgreich gespeichert', {
        component: 'api/reminders/send',
        projectId,
        invoiceId,
        reminderType,
      })
    } catch (error: unknown) {
      logger.error(
        'Fehler beim Speichern des Reminders',
        {
          component: 'api/reminders/send',
          projectId,
          invoiceId,
          reminderType,
        },
        error as Error
      )
      // E-Mail wurde bereits gesendet, aber Reminder konnte nicht gespeichert werden
      // Das ist nicht kritisch, aber sollte geloggt werden
    }

    apiLogger.end(startTime)
    return NextResponse.json({
      success: true,
      message: `${reminderType === 'first' ? '1.' : reminderType === 'second' ? '2.' : 'Letzte'} Mahnung erfolgreich gesendet`,
      reminder,
    })
  } catch (error: unknown) {
    apiLogger.error(error as Error, 500)
    return apiErrors.internal(error as Error, { component: 'api/reminders/send' })
  }
}
