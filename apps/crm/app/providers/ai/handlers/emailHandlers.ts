import { deliveryNoteTemplate, invoiceTemplate } from '@/lib/utils/emailTemplates'
import { getCompanySettings, updateProject } from '@/lib/supabase/services'
import { logger } from '@/lib/utils/logger'
import type { HandlerContext } from '../utils/handlerTypes'

export async function handleSendEmail(ctx: HandlerContext): Promise<string> {
  const { args, findProject, setProjects } = ctx

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

    // E-Mail-Whitelist (Best Practice): Nur an im Projekt/Kunde hinterlegte Adressen
    const projectForWhitelist = emailProjectId ? findProject(emailProjectId) : null
    const allowedEmails = projectForWhitelist?.email
      ? [projectForWhitelist.email.trim().toLowerCase()]
      : []
    const toAddresses = emailTo.split(',').map((e: string) => e.trim().toLowerCase())
    if (allowedEmails.length > 0) {
      const disallowed = toAddresses.filter(addr => !allowedEmails.includes(addr))
      if (disallowed.length > 0) {
        return `❌ E-Mail-Adresse(n) "${disallowed.join(', ')}" sind nicht als Empfänger freigegeben. Bitte nur an im Projekt hinterlegte Kunden-E-Mail versenden.`
      }
    }

    // NEUE PROFESSIONELLE LÖSUNG: Wenn pdfType gesetzt ist, nutze neue API mit frischen DB-Daten
    if (pdfType) {
      if (!emailProjectId) {
        return '❌ projectId ist erforderlich wenn pdfType gesetzt ist'
      }

      try {
        const emailResponse = await fetch('/api/email/send-with-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: emailTo.split(',').map((email: string) => email.trim()),
            subject: emailSubject,
            body: emailBody,
            pdfType,
            projectId: emailProjectId,
            invoiceId: invoiceIdArg,
            deliveryNoteId: deliveryNoteIdArg,
          }),
        })

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json().catch(() => ({}))
          throw new Error((errorData as { error?: string }).error || `HTTP ${emailResponse.status}`)
        }

        const result = (await emailResponse.json()) as { pdfFilename?: string }
        const project = findProject(emailProjectId)

        if (project) {
          const noteDate = new Date().toLocaleDateString('de-DE')
          await updateProject(project.id, {
            notes: `${project.notes || ''}\n${noteDate}: E-Mail mit ${pdfType === 'invoice' ? 'Rechnung' : 'Lieferschein'} an ${emailTo} versendet: ${emailSubject}`,
          })
          setProjects(prev =>
            prev.map(p =>
              p.id === project.id
                ? {
                    ...p,
                    notes: `${p.notes || ''}\n${noteDate}: E-Mail mit ${pdfType === 'invoice' ? 'Rechnung' : 'Lieferschein'} an ${emailTo} versendet: ${emailSubject}`,
                  }
                : p
            )
          )
        }

        return `✅ E-Mail mit PDF (${result.pdfFilename || pdfType}) erfolgreich an ${emailTo} versendet: "${emailSubject}"`
      } catch (error: unknown) {
        console.error('Error sending email with PDF:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
        return `❌ Fehler beim Versenden der E-Mail mit PDF: ${errorMessage}`
      }
    }

    // RÜCKWÄRTSKOMPATIBILITÄT: Alte Logik für emailType (wird später entfernt)
    const project = emailProjectId ? findProject(emailProjectId) : null
    let html = emailBody
    let text = emailBody
    let attachments: Array<{ filename: string; content: string; contentType: string }> | undefined

    // Verwende Template wenn projectId und emailType vorhanden
    if (project && emailType) {
      try {
        // Hole Company Name für Email-Templates
        const companySettings = await getCompanySettings()
        const companyName =
          companySettings?.displayName || companySettings?.companyName || 'Ihr Unternehmen'

        if (emailType === 'deliveryNote' && project) {
          const template = deliveryNoteTemplate(project, '', companyName)
          html = template.html
          text = template.text

          // Generiere PDF für Lieferschein
          try {
            // Erstelle minimale deliveryNote-Struktur aus Projekt-Daten
            const deliveryNote = {
              deliveryNoteNumber: `LS-${project.orderNumber}`,
              deliveryDate: project.deliveryDate || new Date().toISOString(),
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
                logger.debug('[sendEmail] PDF erfolgreich generiert für Lieferschein', {
                  component: 'handleFunctionCall',
                  filename: pdfData.filename,
                })
              } else {
                console.warn('[sendEmail] PDF-Response ungültig:', pdfData)
              }
            } else {
              const errorData = await pdfResponse.json().catch(() => ({}))
              console.error('[sendEmail] PDF-Generierung fehlgeschlagen:', {
                status: pdfResponse.status,
                statusText: pdfResponse.statusText,
                error: errorData,
              })
            }
          } catch (pdfError) {
            console.error('[sendEmail] PDF-Generierung für Lieferschein fehlgeschlagen:', pdfError)
            const errObj = pdfError as Error & { response?: unknown }
            console.error('[sendEmail] PDF-Error Details:', {
              message: errObj?.message,
              stack: errObj?.stack,
              response: errObj?.response,
            })
            // Weiter ohne PDF - aber logge den Fehler deutlich
          }
        } else if (emailType === 'invoice' && project) {
          // Load invoices from database for this project
          const { getInvoices } = await import('@/lib/supabase/services/invoices')
          const projectInvoices = await getInvoices(project.id)

          // Find the most recent invoice (prefer final, then partial)
          const invoice =
            projectInvoices.find(inv => inv.type === 'final') ||
            projectInvoices.find(inv => inv.type === 'partial')

          if (invoice) {
            // Create invoice object compatible with template
            const invoiceForTemplate = {
              invoiceNumber: invoice.invoiceNumber,
              amount: invoice.amount,
              date: invoice.invoiceDate,
              isPaid: invoice.isPaid,
            }
            const template = invoiceTemplate(project, invoiceForTemplate, companyName)
            html = template.html
            text = template.text

            // Generiere PDF für Rechnung
            try {
              const pdfResponse = await fetch('/api/invoice/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  invoice: {
                    invoiceNumber: invoice.invoiceNumber,
                    amount: invoice.amount,
                    date: invoice.invoiceDate,
                    type: invoice.type === 'credit' ? 'credit' : invoice.type === 'final' ? 'final' : 'deposit',
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
                  logger.debug('[sendEmail] PDF erfolgreich generiert für Rechnung', {
                    component: 'handleFunctionCall',
                    filename: pdfData.filename,
                  })
                } else {
                  console.warn('[sendEmail] PDF-Response ungültig:', pdfData)
                }
              } else {
                const errorData = await pdfResponse.json().catch(() => ({}))
                console.error('[sendEmail] PDF-Generierung fehlgeschlagen:', {
                  status: pdfResponse.status,
                  statusText: pdfResponse.statusText,
                  error: errorData,
                })
              }
            } catch (pdfError) {
              console.error('[sendEmail] PDF-Generierung für Rechnung fehlgeschlagen:', pdfError)
              const pdfErr = pdfError as Error
              console.error('[sendEmail] PDF-Error Details:', {
                message: pdfErr?.message,
                stack: pdfErr?.stack,
              })
              // Weiter ohne PDF - aber logge den Fehler deutlich
            }
          }
        } else if (emailType === 'complaint' && project) {
          // TODO: Hole Complaint aus DB wenn projectId vorhanden
          // Für jetzt verwende body
        }
      } catch (templateError) {
        console.warn('[sendEmail] Template-Fehler, verwende body:', templateError)
        // Verwende body als Fallback
      }
    }

    // Konvertiere body zu HTML wenn nötig
    if (!html.includes('<')) {
      html = html.replace(/\n/g, '<br>')
    }

    // Rufe API-Route auf statt direkt sendEmail (server-seitig)
    const emailResponse = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: emailTo.split(',').map((email: string) => email.trim()),
        subject: emailSubject,
        html,
        text,
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
      }),
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json().catch(() => ({}))
      throw new Error((errorData as { error?: string }).error || `HTTP ${emailResponse.status}`)
    }

    const noteDate = new Date().toLocaleDateString('de-DE')
    if (project) {
      await updateProject(project.id, {
        notes: `${project.notes || ''}\n${noteDate}: E-Mail an ${emailTo} versendet: ${emailSubject}`,
      })
      setProjects(prev =>
        prev.map(p =>
          p.id === project.id
            ? {
                ...p,
                notes: `${p.notes || ''}\n${noteDate}: E-Mail an ${emailTo} versendet: ${emailSubject}`,
              }
            : p
        )
      )
    }

    return `✅ E-Mail erfolgreich an ${emailTo} versendet: "${emailSubject}"`
  } catch (error: unknown) {
    console.error('Error sending email:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return `❌ Fehler beim Versenden der E-Mail: ${errorMessage}`
  }
}
