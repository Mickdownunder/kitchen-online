import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/supabase/services/email'
import { generatePDF, PDFType } from '@/lib/pdf/pdfGenerator'
import { getProject } from '@/lib/supabase/services/projects'
import { getCompanySettings } from '@/lib/supabase/services/company'
import { deliveryNoteTemplate, invoiceTemplate } from '@/lib/utils/emailTemplates'
import { logger } from '@/lib/utils/logger'

/**
 * API-Route: E-Mail mit PDF-Anhang versenden
 *
 * Diese Route:
 * 1. Lädt Projekt/Daten FRISCH aus der Datenbank
 * 2. Generiert PDF server-seitig
 * 3. Versendet E-Mail mit PDF-Anhang
 *
 * Unterstützte PDF-Typen:
 * - invoice: Anzahlung oder Schlussrechnung
 * - deliveryNote: Kunden-Lieferschein
 * - offer: Angebot (TODO)
 * - statistics: Statistik-Export (TODO)
 */
export async function POST(request: NextRequest) {
  const apiLogger = logger.api('/api/email/send-with-pdf', 'POST')
  const startTime = apiLogger.start()

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      apiLogger.error(new Error('Not authenticated'), 401)
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    if (user.app_metadata?.role === 'customer') {
      apiLogger.error(new Error('No permission'), 403)
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Check company context
    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      apiLogger.error(new Error('No company assigned'), 403)
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 403 })
    }

    // Check permission
    const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
      p_permission_code: 'create_invoices',
    })
    if (permError || !hasPermission) {
      apiLogger.error(new Error('No permission'), 403)
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Versenden von E-Mails mit PDFs' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      to,
      subject,
      body: emailBody,
      pdfType,
      projectId,
      invoiceId, // Optional: spezifische Anzahlung (Index oder ID)
      deliveryNoteId, // Optional: spezifischer Lieferschein
    } = body

    if (!to || !subject || !pdfType) {
      apiLogger.error(new Error('Missing required fields'), 400)
      return NextResponse.json(
        { error: 'Fehlende Parameter: to, subject und pdfType sind erforderlich' },
        { status: 400 }
      )
    }

    // KRITISCH: Lade Projekt FRISCH aus der Datenbank (nicht aus Cache!)
    let project = null
    if (projectId) {
      try {
        project = await getProject(projectId)
        if (!project) {
          return NextResponse.json(
            { error: `Projekt ${projectId} nicht gefunden` },
            { status: 404 }
          )
        }
      } catch (error: unknown) {
        logger.error(
          'Fehler beim Laden des Projekts',
          {
            component: 'api/email/send-with-pdf',
            projectId,
          },
          error as Error
        )
        return NextResponse.json(
          {
            error: `Fehler beim Laden des Projekts: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
          },
          { status: 500 }
        )
      }
    }

    // Generiere PDF basierend auf Typ
    let generatedPDF: { pdf: string; filename: string } | null = null
    let emailHtml = emailBody
    let emailText = emailBody

    // Hole Company Name für Email-Templates
    const companySettings = await getCompanySettings()
    const companyName =
      companySettings?.displayName || companySettings?.companyName || 'Ihr Unternehmen'

    try {
      switch (pdfType as PDFType) {
        case 'invoice': {
          if (!project) {
            return NextResponse.json(
              { error: 'Projekt ist erforderlich für Invoice-PDF' },
              { status: 400 }
            )
          }

          // Finde die richtige Rechnung
          let invoice = null
          if (invoiceId) {
            // Wenn invoiceId ein Index ist (z.B. "0" für erste Anzahlung)
            const index = parseInt(invoiceId)
            if (!isNaN(index) && project.partialPayments && project.partialPayments[index]) {
              invoice = project.partialPayments[index]
            } else {
              // Versuche als ID zu finden
              invoice = project.partialPayments?.find((p: { id?: string }) => p.id === invoiceId)
            }
          }

          // Fallback: neueste Anzahlung oder Schlussrechnung
          if (!invoice) {
            if (project.partialPayments && project.partialPayments.length > 0) {
              // Neueste Anzahlung
              invoice = project.partialPayments[project.partialPayments.length - 1]
            } else if (project.finalInvoice) {
              // Schlussrechnung
              invoice = project.finalInvoice
            }
          }

          if (!invoice) {
            return NextResponse.json(
              { error: 'Keine Rechnung gefunden für dieses Projekt' },
              { status: 404 }
            )
          }

          // Generiere PDF
          generatedPDF = await generatePDF({
            type: 'invoice',
            project,
            invoice,
          })

          // Verwende E-Mail-Template
          const template = invoiceTemplate(project, invoice, companyName)
          emailHtml = template.html
          emailText = template.text
          break
        }

        case 'deliveryNote': {
          if (!project) {
            return NextResponse.json(
              { error: 'Projekt ist erforderlich für DeliveryNote-PDF' },
              { status: 400 }
            )
          }

          // Generiere PDF
          generatedPDF = await generatePDF({
            type: 'deliveryNote',
            project,
            deliveryNoteId,
          })

          // Verwende E-Mail-Template
          const deliveryNoteTemplateData = deliveryNoteTemplate(
            project,
            deliveryNoteId || '',
            companyName
          )
          emailHtml = deliveryNoteTemplateData.html
          emailText = deliveryNoteTemplateData.text
          break
        }

        case 'offer':
          return NextResponse.json(
            { error: 'Offer-PDF wird noch nicht unterstützt' },
            { status: 501 }
          )

        case 'statistics':
          return NextResponse.json(
            { error: 'Statistics-PDF wird noch nicht unterstützt' },
            { status: 501 }
          )

        default:
          return NextResponse.json({ error: `Unbekannter PDF-Typ: ${pdfType}` }, { status: 400 })
      }
    } catch (pdfError: unknown) {
      logger.error(
        'Fehler beim Generieren des PDFs',
        {
          component: 'api/email/send-with-pdf',
          pdfType,
          projectId,
        },
        pdfError as Error
      )
      return NextResponse.json(
        {
          error: `Fehler beim Generieren des PDFs: ${pdfError instanceof Error ? pdfError.message : 'Unbekannter Fehler'}`,
        },
        { status: 500 }
      )
    }

    // Versende E-Mail mit PDF-Anhang
    try {
      await sendEmail({
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: emailHtml,
        text: emailText,
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

      apiLogger.end(startTime, 200)
      logger.info('E-Mail mit PDF erfolgreich versendet', {
        component: 'api/email/send-with-pdf',
        to,
        subject,
        pdfType,
        projectId,
        filename: generatedPDF?.filename,
      })

      return NextResponse.json({
        success: true,
        message: 'E-Mail mit PDF erfolgreich versendet',
        pdfFilename: generatedPDF?.filename,
      })
    } catch (emailError: unknown) {
      logger.error(
        'Fehler beim Versenden der E-Mail',
        {
          component: 'api/email/send-with-pdf',
          to,
          subject,
        },
        emailError as Error
      )
      return NextResponse.json(
        {
          error: `Fehler beim Versenden der E-Mail: ${emailError instanceof Error ? emailError.message : 'Unbekannter Fehler'}`,
        },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    apiLogger.error(error as Error, 500)
    logger.error(
      'Unerwarteter Fehler in send-with-pdf API',
      {
        component: 'api/email/send-with-pdf',
      },
      error as Error
    )
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Serverfehler' },
      { status: 500 }
    )
  }
}
