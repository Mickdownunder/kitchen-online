import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProject } from '@/lib/supabase/services/projects'
import { getInvoice } from '@/lib/supabase/services/invoices'
import { reminderTemplate } from '@/lib/utils/emailTemplates'
import { calculateOverdueDays, canSendReminder } from '@/hooks/useInvoiceCalculations'
import { logger } from '@/lib/utils/logger'
import { apiErrors } from '@/lib/utils/errorHandling'
import { getCompanySettings } from '@/lib/supabase/services/company'

/**
 * API-Route: Vorschau der Mahnungs-E-Mail (ohne Versand)
 * Gibt Betreff, E-Mail-Text, Empfänger und PDF-Beschreibung zurück.
 */
export async function POST(request: NextRequest) {
  const apiLogger = logger.api('/api/reminders/preview', 'POST')

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return apiErrors.unauthorized()
    }

    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      return apiErrors.forbidden()
    }

    const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
      p_permission_code: 'mark_payments',
    })
    if (permError || !hasPermission) {
      return apiErrors.forbidden()
    }

    const body = await request.json()
    const { projectId, invoiceId, reminderType } = body

    if (!projectId || !invoiceId || !reminderType) {
      return apiErrors.badRequest()
    }

    if (!['first', 'second', 'final'].includes(reminderType)) {
      return apiErrors.validation()
    }

    const project = await getProject(projectId)
    if (!project) {
      return apiErrors.notFound()
    }

    const invoiceResult = await getInvoice(invoiceId)
    if (!invoiceResult.ok) {
      return apiErrors.notFound()
    }
    const invoice = invoiceResult.data

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

    if (invoice.isPaid) {
      return apiErrors.badRequest()
    }

    const companySettings = await getCompanySettings()
    const daysBetweenReminders =
      reminderType === 'first'
        ? companySettings?.reminderDaysBetweenFirst || 7
        : reminderType === 'second'
          ? companySettings?.reminderDaysBetweenSecond || 7
          : companySettings?.reminderDaysBetweenFinal || 7

    if (
      !canSendReminder(
        invoiceForReminder,
        reminderType as 'first' | 'second' | 'final',
        daysBetweenReminders
      )
    ) {
      return apiErrors.badRequest()
    }

    const dueDate = invoiceForReminder.dueDate || invoiceForReminder.date
    const overdueDays = calculateOverdueDays(dueDate) || 0
    const recipientEmail = project.email || ''

    const companyName =
      companySettings?.displayName || companySettings?.companyName || 'Ihr Unternehmen'
    const emailTemplate = reminderTemplate(
      project,
      invoiceForReminder,
      reminderType as 'first' | 'second' | 'final',
      overdueDays,
      companyName
    )

    const reminderTypeLabel =
      reminderType === 'first'
        ? '1. Mahnung'
        : reminderType === 'second'
          ? '2. Mahnung'
          : 'Letzte Mahnung'

    const pdfDescription =
      reminderType === 'first'
        ? '1. Mahnung (freundliche Zahlungserinnerung, Rechnungsdetails, Fälligkeit, offener Betrag, Zahlungsfrist 7 Tage)'
        : reminderType === 'second'
          ? '2. Mahnung (dringende Aufforderung, Hinweis auf 1. Mahnung, Zahlungsfrist 5 Tage, Androhung rechtlicher Schritte)'
          : 'Letzte Mahnung (letzte Aufforderung, Hinweis auf vorherige Mahnungen, Zahlungsfrist 3 Tage, Androhung Inkasso und rechtliche Schritte)'

    apiLogger.end(apiLogger.start())
    return NextResponse.json({
      recipientEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
      reminderTypeLabel,
      pdfDescription,
      invoiceNumber: invoice.invoiceNumber,
      customerName: project.customerName,
    })
  } catch (error: unknown) {
    logger.error('Reminder preview failed', { component: 'api/reminders/preview' }, error as Error)
    return apiErrors.internal(error as Error, { component: 'api/reminders/preview' })
  }
}
