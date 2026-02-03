import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProject } from '@/lib/supabase/services/projects'
import { sendEmail } from '@/lib/supabase/services/email'
import { getCompanySettings } from '@/lib/supabase/services/company'
import { portalAccessTemplate } from '@/lib/email-templates/portal-access'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/middleware/rateLimit'

function generateAccessCode(length = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

/**
 * POST /api/projects/send-portal-access
 * Sendet Portal-Zugang (Projektcode + Link) per E-Mail an den Kunden.
 * Wenn das Projekt noch keinen access_code hat, wird einer generiert und gespeichert.
 */
export async function POST(request: NextRequest) {
  const apiLogger = logger.api('/api/projects/send-portal-access', 'POST')
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

    const limitCheck = await rateLimit(request, user.id)
    if (!limitCheck?.allowed) {
      apiLogger.end(startTime, 429)
      return NextResponse.json(
        { error: 'Zu viele Anfragen. Bitte warten Sie einen Moment.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { projectId } = body

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: 'projectId ist erforderlich' },
        { status: 400 }
      )
    }

    const project = await getProject(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

    const customerEmail = project.email
    if (!customerEmail?.trim()) {
      return NextResponse.json(
        {
          error:
            'Keine E-Mail-Adresse für den Kunden hinterlegt. Bitte tragen Sie die Kunden-E-Mail in den Stammdaten ein.',
        },
        { status: 400 }
      )
    }

    let accessCode = project.accessCode
    if (!accessCode?.trim()) {
      accessCode = generateAccessCode()
      const { error: updateError } = await supabase
        .from('projects')
        .update({ access_code: accessCode })
        .eq('id', projectId)

      if (updateError) {
        logger.error('Failed to save access code', {
          component: 'api/projects/send-portal-access',
          projectId,
        }, updateError as Error)
        return NextResponse.json(
          { error: 'Projektcode konnte nicht gespeichert werden' },
          { status: 500 }
        )
      }
    }

    const companySettings = await getCompanySettings()
    const companyName =
      companySettings?.displayName || companySettings?.companyName || 'KüchenOnline'
    const portalUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://crm.kuechenonline.com'
    const portalLoginUrl = `${portalUrl.replace(/\/$/, '')}/portal/login`

    const emailData = portalAccessTemplate({
      customerName: project.customerName || 'Kunde',
      customerEmail: customerEmail.trim(),
      accessCode,
      portalUrl: portalLoginUrl,
      companyName,
      orderNumber: project.orderNumber || undefined,
    })

    await sendEmail({
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    })

    apiLogger.end(startTime)
    return NextResponse.json({
      success: true,
      message: 'Portal-Zugang wurde an den Kunden gesendet.',
      accessCode,
    })
  } catch (error: unknown) {
    apiLogger.error(error as Error, 500)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Fehler beim Senden des Portal-Zugangs',
      },
      { status: 500 }
    )
  }
}
