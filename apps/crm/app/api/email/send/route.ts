import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/supabase/services/email'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/middleware/rateLimit'
import { sendEmailSchema } from '@/lib/validations/email'

export async function POST(request: NextRequest) {
  const apiLogger = logger.api('/api/email/send', 'POST')
  const startTime = apiLogger.start()

  try {
    const supabase = await createClient()

    // Get current user
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

    // Rate Limiting (30 Emails pro Minute)
    const limitCheck = await rateLimit(request, user.id)
    if (!limitCheck?.allowed) {
      apiLogger.end(startTime, 429)
      return NextResponse.json(
        { error: 'Zu viele Anfragen. Bitte warten Sie einen Moment.' },
        { status: 429 }
      )
    }

    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      apiLogger.error(new Error('No company assigned'), 403)
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 403 })
    }

    // Zod-Validierung
    const body = await request.json()
    const parsed = sendEmailSchema.safeParse(body)

    if (!parsed.success) {
      apiLogger.error(new Error('Validation failed'), 400)
      return NextResponse.json(
        { 
          error: 'Ungültige Eingabedaten',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { to, subject, html, text, from: requestedFrom, replyTo, attachments } = parsed.data

    // Lade Company Settings server-seitig, wenn from nicht übergeben wurde
    let fromEmail = requestedFrom
    let fromName: string | undefined
    if (!fromEmail) {
      const { data: companySettings, error: settingsError } = await supabase
        .from('company_settings')
        .select('email, company_name')
        .eq('user_id', user.id)
        .single() as { data: { email: string; company_name: string } | null; error: unknown }

      if (!settingsError && companySettings) {
        fromEmail = companySettings.email
        // Stelle sicher, dass "Küchenmanufaktur" zu "Designstudio BaLeah" geändert wird
        fromName =
          companySettings.company_name === 'Küchenmanufaktur'
            ? 'Designstudio BaLeah'
            : companySettings.company_name || 'Designstudio BaLeah'
      } else {
        // Fallback wenn keine Company Settings vorhanden
        fromName = 'Designstudio BaLeah'
      }
    }

    await sendEmail({
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      from: fromEmail, // Übergib die server-seitig geladene E-Mail
      fromName: fromName, // Übergib den Firmennamen
      replyTo,
      attachments, // Übergib Attachments (z.B. PDFs)
    })

    apiLogger.end(startTime, 200)
    logger.info('Email sent via API', {
      component: 'api/email/send',
      to,
      subject,
    })

    return NextResponse.json({ success: true, message: 'E-Mail erfolgreich versendet' })
  } catch (error: unknown) {
    apiLogger.error(error as Error, 500)
    logger.error(
      'Email API error',
      {
        component: 'api/email/send',
        errorMessage: error instanceof Error ? error.message : 'Unknown',
      },
      error as Error
    )
    // Keine internen Fehlerdetails zurückgeben
    return NextResponse.json(
      { error: 'Fehler beim Versenden der E-Mail' },
      { status: 500 }
    )
  }
}
