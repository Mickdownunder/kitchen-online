/**
 * Gemeinsame E-Mail-Versandlogik für Chat-Handler und API-Routen.
 * Sendet E-Mail direkt (ohne Human-in-the-Loop) für: Plain, invoice, deliveryNote.
 * pdfType "order" wird nicht unterstützt (Token/Sign-URL) – dafür weiterhin API + Bestätigung.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/supabase/services/email'
import { generatePDF } from '@/lib/pdf/pdfGenerator'
import { getProject } from '@/lib/supabase/services/projects'
import { getInvoices } from '@/lib/supabase/services/invoices'
import { getCompanySettingsById } from '@/lib/supabase/services/company'
import { deliveryNoteTemplate, invoiceTemplate } from '@/lib/utils/emailTemplates'
import { logger } from '@/lib/utils/logger'

export interface SendEmailPayload {
  to: string | string[]
  subject: string
  body: string
  pdfType?: 'invoice' | 'deliveryNote' | 'order'
  projectId?: string
  invoiceId?: string
  deliveryNoteId?: string
}

export interface SendEmailResult {
  success: boolean
  message: string
}

/**
 * Sendet E-Mail direkt (Plain, mit Rechnungs-PDF oder Lieferschein-PDF).
 * Für pdfType "order" wird { success: false } zurückgegeben – dann soll der Caller pendingEmail nutzen.
 */
export async function sendEmailFromPayload(
  supabase: SupabaseClient,
  userId: string,
  payload: SendEmailPayload
): Promise<SendEmailResult> {
  const { to, subject, body: emailBody, pdfType, projectId, invoiceId, deliveryNoteId } = payload
  const toArray = Array.isArray(to) ? to : [to].filter(Boolean)
  if (!toArray.length || !subject) {
    return { success: false, message: 'E-Mail-Parameter unvollständig (to, subject).' }
  }

  const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
  if (companyError || !companyId) {
    return { success: false, message: 'Keine Firma zugeordnet.' }
  }

  const companySettings = await getCompanySettingsById(companyId, supabase)
  const companyName =
    companySettings?.displayName || companySettings?.companyName || 'Ihr Unternehmen'

  // pdfType "order" erfordert Token/Sign-URL – nicht hier, Caller soll pendingEmail nutzen
  if (pdfType === 'order') {
    return {
      success: false,
      message: 'Auftrag per E-Mail (mit Unterschrift-Link) bitte im Chat mit „Senden“ bestätigen.',
    }
  }

  let emailHtml = emailBody
  let emailText = emailBody
  let generatedPDF: { pdf: string; filename: string } | null = null

  if (pdfType === 'invoice' || pdfType === 'deliveryNote') {
    if (!projectId) {
      return { success: false, message: 'projectId ist bei PDF-Anhang erforderlich.' }
    }
    const projectResult = await getProject(projectId, supabase)
    if (!projectResult.ok || !projectResult.data) {
      return { success: false, message: 'Projekt nicht gefunden.' }
    }
    const project = projectResult.data

    if (pdfType === 'invoice') {
      const invoicesResult = await getInvoices(projectId)
      const invoices = invoicesResult.ok ? invoicesResult.data : []
      let invoice = null
      if (invoiceId) {
        const index = parseInt(invoiceId)
        const partials = invoices.filter((inv: { type: string }) => inv.type === 'partial')
        if (!isNaN(index) && partials[index]) {
          invoice = partials[index]
        } else {
          invoice = invoices.find((inv: { id: string }) => inv.id === invoiceId)
        }
      }
      if (!invoice) {
        const partials = invoices.filter((inv: { type: string }) => inv.type === 'partial')
        const finalInv = invoices.find((inv: { type: string }) => inv.type === 'final')
        if (partials.length > 0) invoice = partials[partials.length - 1]
        else if (finalInv) invoice = finalInv
      }
      if (!invoice) {
        return { success: false, message: 'Keine Rechnung zum Anhängen gefunden.' }
      }
      const invoiceInput = {
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        date: invoice.invoiceDate,
        description: invoice.description,
        type: invoice.type,
        dueDate: invoice.dueDate,
        isPaid: invoice.isPaid,
        paidDate: invoice.paidDate,
      }
      generatedPDF = await generatePDF({
        type: 'invoice',
        project,
        invoice: invoiceInput,
      })
      const template = invoiceTemplate(project, invoiceInput, companyName)
      emailHtml = template.html
      emailText = template.text
    } else {
      // deliveryNote
      generatedPDF = await generatePDF({
        type: 'deliveryNote',
        project,
        deliveryNoteId,
      })
      const templateData = deliveryNoteTemplate(
        project,
        deliveryNoteId || '',
        companyName
      )
      emailHtml = templateData.html
      emailText = templateData.text
    }
  }

  try {
    await sendEmail({
      to: toArray,
      subject,
      html: emailHtml,
      text: emailText,
      from: companySettings?.email,
      fromName: companyName,
      attachments: generatedPDF
        ? [
            {
              filename: generatedPDF.filename,
              content: generatedPDF.pdf,
              contentType: 'application/pdf',
            },
          ]
        : undefined,
    })
    logger.info('E-Mail versendet (sendEmailFromPayload)', {
      component: 'lib/email/sendEmailFromPayload',
      to: toArray,
      subject,
      pdfType,
      projectId,
    })
    const pdfHint = generatedPDF ? ` mit Anhang "${generatedPDF.filename}"` : ''
    return {
      success: true,
      message: `✅ E-Mail an ${toArray.join(', ')}${pdfHint} versendet.`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unbekannter Fehler'
    logger.error('E-Mail-Versand fehlgeschlagen', {
      component: 'lib/email/sendEmailFromPayload',
      to: toArray,
      subject,
    }, err instanceof Error ? err : new Error(String(err)))
    return { success: false, message: `❌ Versand fehlgeschlagen: ${msg}` }
  }
}
