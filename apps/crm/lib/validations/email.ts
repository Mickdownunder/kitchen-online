import { z } from 'zod'

/**
 * Validation schemas for Email sending
 */

// Attachment Schema
const emailAttachmentSchema = z.object({
  filename: z.string().min(1).max(255, 'Dateiname darf maximal 255 Zeichen haben'),
  content: z.string(), // Base64 encoded
  contentType: z.string().regex(
    /^[a-z]+\/[a-z0-9\-\+\.]+$/i,
    'Ungültiger Content-Type'
  ),
})

// Main Email Schema
export const sendEmailSchema = z.object({
  to: z.union([
    z.string().email('Ungültige E-Mail-Adresse'),
    z.array(z.string().email('Ungültige E-Mail-Adresse'))
      .min(1, 'Mindestens ein Empfänger erforderlich')
      .max(10, 'Maximal 10 Empfänger erlaubt'),
  ]),
  subject: z.string()
    .min(1, 'Betreff ist erforderlich')
    .max(200, 'Betreff darf maximal 200 Zeichen haben'),
  html: z.string().max(500000, 'HTML-Inhalt zu groß').optional(),
  text: z.string().max(100000, 'Text-Inhalt zu groß').optional(),
  from: z.string().email('Ungültige Absender-E-Mail').optional(),
  replyTo: z.string().email('Ungültige Reply-To E-Mail').optional(),
  attachments: z.array(emailAttachmentSchema)
    .max(5, 'Maximal 5 Anhänge erlaubt')
    .optional(),
}).refine(
  data => data.html || data.text,
  { message: 'Entweder html oder text ist erforderlich' }
)

export type SendEmailInput = z.infer<typeof sendEmailSchema>
export type EmailAttachment = z.infer<typeof emailAttachmentSchema>
