import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProject } from '@/lib/supabase/services/projects'
import { sendEmail } from '@/lib/supabase/services/email'
import { getCompanySettings } from '@/lib/supabase/services/company'
import { portalAccessTemplate } from '@/lib/email-templates/portal-access'
import { logger } from '@/lib/utils/logger'
import { apiErrors } from '@/lib/utils/errorHandling'
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
      return apiErrors.unauthorized()
    }

    if (user.app_metadata?.role === 'customer') {
      apiLogger.error(new Error('No permission'), 403)
      return apiErrors.forbidden()
    }

    const limitCheck = await rateLimit(request, user.id)
    if (limitCheck && !limitCheck.allowed) {
      apiLogger.end(startTime, 429)
      return apiErrors.rateLimit(limitCheck.resetTime)
    }

    const body = await request.json()
    const { projectId } = body

    if (!projectId || typeof projectId !== 'string') {
      return apiErrors.badRequest()
    }

    const project = await getProject(projectId, supabase)
    if (!project) {
      return apiErrors.notFound()
    }

    const customerEmail = project.email
    if (!customerEmail?.trim()) {
      return apiErrors.badRequest()
    }

    let accessCode = project.accessCode
    if (!accessCode?.trim()) {
      accessCode = generateAccessCode()
      const { data: updated, error: updateError } = await supabase
        .from('projects')
        .update({ access_code: accessCode })
        .eq('id', projectId)
        .select('id')

      if (updateError) {
        logger.error('Failed to save access code', {
          component: 'api/projects/send-portal-access',
          projectId,
        }, updateError as Error)
        return apiErrors.internal(updateError as Error, { component: 'api/projects/send-portal-access' })
      }
      if (!updated?.length) {
        return apiErrors.forbidden()
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
    return apiErrors.internal(error as Error, { component: 'api/projects/send-portal-access' })
  }
}
