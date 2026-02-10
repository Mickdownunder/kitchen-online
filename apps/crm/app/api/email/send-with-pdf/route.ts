import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/supabase/services/email'
import { generatePDF, PDFType } from '@/lib/pdf/pdfGenerator'
import { getProject } from '@/lib/supabase/services/projects'
import { getInvoices } from '@/lib/supabase/services/invoices'
import { getCompanySettings, getCompanySettingsById } from '@/lib/supabase/services/company'
import { deliveryNoteTemplate, invoiceTemplate, orderTemplate } from '@/lib/utils/emailTemplates'
import { logger } from '@/lib/utils/logger'
import { apiErrors } from '@/lib/utils/errorHandling'
import { rateLimit } from '@/lib/middleware/rateLimit'

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
      return apiErrors.unauthorized()
    }

    if (user.app_metadata?.role === 'customer') {
      apiLogger.error(new Error('No permission'), 403)
      return apiErrors.forbidden()
    }

    // Rate Limiting
    const limitCheck = await rateLimit(request, user.id)
    if (limitCheck && !limitCheck.allowed) {
      return apiErrors.rateLimit(limitCheck.resetTime)
    }

    // Check company context
    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      apiLogger.error(new Error('No company assigned'), 403)
      return apiErrors.forbidden()
    }

    // Check permission
    const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
      p_permission_code: 'create_invoices',
    })
    if (permError || !hasPermission) {
      apiLogger.error(new Error('No permission'), 403)
      return apiErrors.forbidden()
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
      return apiErrors.badRequest()
    }

    // KRITISCH: Lade Projekt FRISCH aus der Datenbank (nicht aus Cache!)
    // Server-Client verwenden, damit Session/Cookies in API-Route korrekt sind
    let project = null
    if (projectId) {
      try {
        const projectResult = await getProject(projectId, supabase)
        if (!projectResult.ok) {
          return apiErrors.notFound()
        }
        project = projectResult.data
      } catch (error: unknown) {
        logger.error(
          'Fehler beim Laden des Projekts',
          {
            component: 'api/email/send-with-pdf',
            projectId,
          },
          error as Error
        )
        return apiErrors.internal(error as Error, { component: 'api/email/send-with-pdf' })
      }
    }

    // Generiere PDF basierend auf Typ
    let generatedPDF: { pdf: string; filename: string } | null = null
    let emailHtml = emailBody
    let emailText = emailBody

    // Hole Firmeneinstellungen – in API-Routes liefert getCompanySettings oft null (Browser-Client),
    // daher Fallback auf getCompanySettingsById mit company_id aus RPC
    let companySettings = await getCompanySettings()
    if (!companySettings && companyId) {
      companySettings = await getCompanySettingsById(companyId, supabase)
    }
    const companyName =
      companySettings?.displayName || companySettings?.companyName || 'Ihr Unternehmen'

    try {
      switch (pdfType as PDFType) {
        case 'invoice': {
          if (!project) {
            return apiErrors.badRequest()
          }

          // Lade Rechnungen aus der invoices-Tabelle
          const invoicesResult = await getInvoices(projectId)
          const invoices = invoicesResult.ok ? invoicesResult.data : []
          let invoice = null

          if (invoiceId) {
            // Wenn invoiceId ein Index ist (z.B. "0" für erste Anzahlung)
            const index = parseInt(invoiceId)
            const partials = invoices.filter(inv => inv.type === 'partial')
            if (!isNaN(index) && partials[index]) {
              invoice = partials[index]
            } else {
              // Versuche als ID zu finden
              invoice = invoices.find(inv => inv.id === invoiceId)
            }
          }

          // Fallback: neueste Anzahlung oder Schlussrechnung
          if (!invoice) {
            const partials = invoices.filter(inv => inv.type === 'partial')
            const finalInv = invoices.find(inv => inv.type === 'final')
            if (partials.length > 0) {
              invoice = partials[partials.length - 1]
            } else if (finalInv) {
              invoice = finalInv
            }
          }

          if (!invoice) {
            return apiErrors.notFound()
          }

          // Map Invoice zu InvoiceInput-Format für generatePDF
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

          // Generiere PDF
          generatedPDF = await generatePDF({
            type: 'invoice',
            project,
            invoice: invoiceInput,
          })

          // Verwende E-Mail-Template (erwartet invoiceNumber, amount, date)
          const template = invoiceTemplate(project, invoiceInput, companyName)
          emailHtml = template.html
          emailText = template.text
          break
        }

        case 'deliveryNote': {
          if (!project) {
            return apiErrors.badRequest()
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

        case 'order': {
          if (!project) {
            return apiErrors.badRequest()
          }

          // Token für Online-Unterschrift erstellen (7 Tage gültig)
          const crypto = await import('crypto')
          const token = crypto.randomBytes(32).toString('hex')
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 7)

          let supabaseAdmin
          try {
            supabaseAdmin = await createServiceClient()
          } catch (svcErr) {
            logger.error('createServiceClient failed', { component: 'api/email/send-with-pdf' }, svcErr as Error)
            return apiErrors.internal(svcErr as Error, { component: 'api/email/send-with-pdf' })
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: tokenError } = await (supabaseAdmin as any)
            .from('order_sign_tokens')
            .insert({
              project_id: project.id,
              token,
              expires_at: expiresAt.toISOString(),
            })

          if (tokenError) {
            logger.error('order_sign_tokens insert failed', {
              component: 'api/email/send-with-pdf',
              code: tokenError.code,
              message: tokenError.message,
            })
            return apiErrors.internal(new Error(tokenError.message), { component: 'api/email/send-with-pdf' })
          }

          // Basis-URL aus Request (wo der User die App nutzt) – sonst Env, sonst localhost
          const requestOrigin = request.nextUrl?.origin || new URL(request.url).origin
          const baseUrl =
            process.env.NEXT_PUBLIC_BASE_URL ||
            (requestOrigin && !requestOrigin.includes('localhost') ? requestOrigin : 'http://localhost:3000')
          const signUrl = `${baseUrl}/portal/auftrag/${token}/unterschreiben`

          // Generiere PDF (mit AGB) – companySettings explizit übergeben (getCompanySettings in API oft null)
          if (!companySettings) {
            return apiErrors.badRequest()
          }
          generatedPDF = await generatePDF({
            type: 'order',
            project,
            appendAgb: true,
            companySettings,
          })

          const orderTemplateData = orderTemplate(project, signUrl, companyName)
          emailHtml = orderTemplateData.html
          emailText = orderTemplateData.text
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
          return apiErrors.badRequest()
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
      return apiErrors.internal(pdfError as Error, { component: 'api/email/send-with-pdf' })
    }

    // Versende E-Mail mit PDF-Anhang
    try {
      await sendEmail({
        to: Array.isArray(to) ? to : [to],
        subject: subject,
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
      return apiErrors.internal(emailError as Error, { component: 'api/email/send-with-pdf' })
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
    return apiErrors.internal(error as Error, { component: 'api/email/send-with-pdf' })
  }
}
