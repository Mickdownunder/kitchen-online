import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/supabase/services/email'
import { logger } from '@/lib/utils/logger'

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

    const body = await request.json()
    const { to, subject, html, text, from: requestedFrom, replyTo, attachments } = body

    if (!to || !subject || (!html && !text)) {
      apiLogger.error(new Error('Missing required fields'), 400)
      return NextResponse.json(
        { error: 'Fehlende Parameter: to, subject und (html oder text) sind erforderlich' },
        { status: 400 }
      )
    }

    // Lade Company Settings server-seitig, wenn from nicht übergeben wurde
    let fromEmail = requestedFrom
    let fromName: string | undefined
    if (!fromEmail) {
      const { data: companySettings, error: settingsError } = await supabase
        .from('company_settings')
        .select('email, company_name')
        .eq('user_id', user.id)
        .single()

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
      },
      error as Error
    )
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Versenden der E-Mail' },
      { status: 500 }
    )
  }
}
