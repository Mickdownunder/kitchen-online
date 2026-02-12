import { getCompanySettings } from './company'
import { logger } from '@/lib/utils/logger'

// E-Mail-Service mit Resend API
// Dokumentation: https://resend.com/docs/api-reference/emails/send-email

interface EmailAttachment {
  filename: string
  content: string // Base64 encoded
  contentType?: string
}

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  attachments?: EmailAttachment[]
  from?: string
  fromName?: string
  replyTo?: string
}

/**
 * Sendet eine E-Mail über Resend API
 */
export async function sendEmail(options: SendEmailOptions): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY ist nicht konfiguriert. Bitte setzen Sie RESEND_API_KEY in .env.local'
    )
  }

  try {
    // Hole Firmendaten für Absender (nur wenn from nicht übergeben wurde)
    let companySettings = null
    if (!options.from) {
      try {
        companySettings = await getCompanySettings()
      } catch (error) {
        // Ignoriere Fehler beim Laden der Company Settings (z.B. wenn client-seitig aufgerufen)
        logger.warn('Could not load company settings', { component: 'email' }, error as Error)
      }
    }
    // Resend: Domain muss verifiziert sein. Fallback: onboarding@resend.dev (Resend-Sandbox) oder EMAIL_FROM aus .env
    const fromEmail =
      options.from ||
      companySettings?.email ||
      process.env.EMAIL_FROM ||
      'onboarding@resend.dev'
    const fromName = options.fromName || companySettings?.companyName || 'Designstudio BaLeah'

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html || options.text?.replace(/\n/g, '<br>'),
        text: options.text,
        reply_to: options.replyTo,
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          content_type: att.contentType,
        })),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`E-Mail-Versand fehlgeschlagen: ${errorData.message || response.statusText}`)
    }

    const data = await response.json()
    logger.info('E-Mail erfolgreich versendet', {
      component: 'email',
      to: options.to,
      subject: options.subject,
      emailId: data.id,
    })
    return data?.id ? String(data.id) : null
  } catch (error: unknown) {
    logger.error(
      'Fehler beim Versenden der E-Mail',
      {
        component: 'email',
        to: options.to,
        subject: options.subject,
      },
      error as Error
    )
    throw error
  }
}

/**
 * Sendet einen Lieferschein per E-Mail
 */
export async function sendDeliveryNoteEmail(
  projectId: string,
  deliveryNoteId: string,
  recipientEmail: string
): Promise<void> {
  // STUB: Delivery note email is not yet implemented (no callers).
  // Needs: fetch delivery note from DB, generate PDF, use email template.
  await sendEmail({
    to: recipientEmail,
    subject: 'Ihr Lieferschein',
    html: '<p>Anbei finden Sie Ihren Lieferschein.</p>',
    text: 'Anbei finden Sie Ihren Lieferschein.',
  })
}

/**
 * Sendet eine Rechnung per E-Mail
 */
export async function sendInvoiceEmail(
  projectId: string,
  invoiceId: string,
  recipientEmail: string
): Promise<void> {
  // STUB: Invoice email is not yet implemented (no callers).
  // Needs: fetch invoice from DB, generate PDF, use email template.
  await sendEmail({
    to: recipientEmail,
    subject: 'Ihre Rechnung',
    html: '<p>Anbei finden Sie Ihre Rechnung.</p>',
    text: 'Anbei finden Sie Ihre Rechnung.',
  })
}
