import { deliveryNoteTemplate, invoiceTemplate } from '@/lib/utils/emailTemplates'
import { getCompanySettings } from '@/lib/supabase/services'
import { logger } from '@/lib/utils/logger'
import {
  getAllowedEmailRecipients,
  isEmailAllowed,
  formatWhitelistError,
} from '@/lib/ai/emailWhitelist'
import type { HandlerContext } from '../utils/handlerTypes'
import type { PendingEmailAction } from '../types/pendingEmail'

export async function handleSendEmail(
  ctx: HandlerContext
): Promise<string | PendingEmailAction> {
  const { args, projects, findProject } = ctx

  try {
    const emailTo = args.to as string | undefined
    const emailSubject = args.subject as string | undefined
    const emailBody = args.body as string | undefined
    const pdfType = args.pdfType as string | undefined
    const emailProjectId = args.projectId as string | undefined
    const emailType = args.emailType as string | undefined
    const invoiceIdArg = args.invoiceId as string | undefined
    const deliveryNoteIdArg = args.deliveryNoteId as string | undefined

    if (!emailTo || !emailSubject || !emailBody) {
      return '❌ E-Mail-Parameter unvollständig. Benötigt: to, subject, body'
    }

    // E-Mail-Whitelist: Immer prüfen (Projekt + Mitarbeiter)
    const allowedEmails = await getAllowedEmailRecipients({
      projects,
      projectId: emailProjectId,
      includeEmployees: true,
    })
    const { allowed, disallowed } = isEmailAllowed(emailTo, allowedEmails)
    if (!allowed) {
      return formatWhitelistError(disallowed)
    }

    const bodyPreview =
      emailBody.length > 150 ? `${emailBody.slice(0, 150)}...` : emailBody

    // Human-in-the-loop: Pending zurückgeben statt sofort senden
    if (pdfType) {
      if (!emailProjectId) {
        return '❌ projectId ist erforderlich wenn pdfType gesetzt ist'
      }
      return {
        type: 'pendingEmail',
        functionName: 'sendEmail',
        to: emailTo,
        subject: emailSubject,
        bodyPreview,
        api: '/api/email/send-with-pdf',
        payload: {
          to: emailTo.split(',').map((e: string) => e.trim()),
          subject: emailSubject,
          body: emailBody,
          pdfType,
          projectId: emailProjectId,
          invoiceId: invoiceIdArg,
          deliveryNoteId: deliveryNoteIdArg,
        },
        functionCallId: '',
        projectId: emailProjectId,
      }
    }

    // Alte Logik für emailType: Payload bauen (html, text, attachments)
    const project = emailProjectId ? findProject(emailProjectId) : null
    let html = emailBody
    let text = emailBody
    let attachments: Array<{
      filename: string
      content: string
      contentType: string
    }> | undefined

    if (project && emailType) {
      try {
        const companySettings = await getCompanySettings()
        const companyName =
          companySettings?.displayName ||
          companySettings?.companyName ||
          'Ihr Unternehmen'

        if (emailType === 'deliveryNote' && project) {
          const template = deliveryNoteTemplate(project, '', companyName)
          html = template.html
          text = template.text

          try {
            const deliveryNote = {
              deliveryNoteNumber: `LS-${project.orderNumber}`,
              deliveryDate:
                project.deliveryDate || new Date().toISOString(),
              deliveryAddress: project.address,
              items:
                project.items?.map((item, index) => ({
                  position: index + 1,
                  description: item.description,
                  quantity: item.quantity,
                  unit: item.unit || 'Stk',
                })) || [],
            }

            const pdfResponse = await fetch('/api/delivery-note/pdf', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ deliveryNote, project }),
            })

            if (pdfResponse.ok) {
              const pdfData = await pdfResponse.json()
              if (pdfData.pdf && pdfData.filename) {
                attachments = [
                  {
                    filename: pdfData.filename,
                    content: pdfData.pdf,
                    contentType: 'application/pdf',
                  },
                ]
                logger.debug('[sendEmail] PDF für Lieferschein generiert', {
                  component: 'emailHandlers',
                  filename: pdfData.filename,
                })
              }
            }
          } catch (pdfError) {
            logger.warn('[sendEmail] PDF-Generierung Lieferschein fehlgeschlagen', {
              component: 'emailHandlers',
            })
          }
        } else if (emailType === 'invoice' && project) {
          const { getInvoices } = await import(
            '@/lib/supabase/services/invoices'
          )
          const projectInvoices = await getInvoices(project.id)
          const invoice =
            projectInvoices.find(inv => inv.type === 'final') ||
            projectInvoices.find(inv => inv.type === 'partial')

          if (invoice) {
            const invoiceForTemplate = {
              invoiceNumber: invoice.invoiceNumber,
              amount: invoice.amount,
              date: invoice.invoiceDate,
              isPaid: invoice.isPaid,
            }
            const template = invoiceTemplate(
              project,
              invoiceForTemplate,
              companyName
            )
            html = template.html
            text = template.text

            try {
              const pdfResponse = await fetch('/api/invoice/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  invoice: {
                    invoiceNumber: invoice.invoiceNumber,
                    amount: invoice.amount,
                    date: invoice.invoiceDate,
                    type:
                      invoice.type === 'credit'
                        ? 'credit'
                        : invoice.type === 'final'
                          ? 'final'
                          : 'deposit',
                  },
                  project,
                }),
              })

              if (pdfResponse.ok) {
                const pdfData = await pdfResponse.json()
                if (pdfData.pdf && pdfData.filename) {
                  attachments = [
                    {
                      filename: pdfData.filename,
                      content: pdfData.pdf,
                      contentType: 'application/pdf',
                    },
                  ]
                }
              }
            } catch (pdfError) {
              logger.warn('[sendEmail] PDF-Generierung Rechnung fehlgeschlagen', {
                component: 'emailHandlers',
              })
            }
          }
        }
      } catch (templateError) {
        logger.warn('[sendEmail] Template-Fehler, verwende body', {
          component: 'emailHandlers',
        })
      }
    }

    if (!html.includes('<')) {
      html = html.replace(/\n/g, '<br>')
    }

    return {
      type: 'pendingEmail',
      functionName: 'sendEmail',
      to: emailTo,
      subject: emailSubject,
      bodyPreview,
      api: '/api/email/send',
      payload: {
        to: emailTo.split(',').map((e: string) => e.trim()),
        subject: emailSubject,
        html,
        text,
        attachments:
          attachments && attachments.length > 0 ? attachments : undefined,
      },
      functionCallId: '',
      projectId: project?.id,
    }
  } catch (error: unknown) {
    console.error('Error in handleSendEmail:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Unbekannter Fehler'
    return `❌ Fehler beim Vorbereiten der E-Mail: ${errorMessage}`
  }
}
