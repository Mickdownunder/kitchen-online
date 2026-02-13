import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getCompanyIdForUser, getCompanySettingsById } from '@/lib/supabase/services/company'
import { rateLimit } from '@/lib/middleware/rateLimit'
import { apiErrors } from '@/lib/utils/errorHandling'
import { logger } from '@/lib/utils/logger'
import { createOrGetVoiceInboxEntry } from '@/lib/voice/inboxService'
import { authenticateVoiceBearerToken, authenticateVoiceToken } from '@/lib/voice/tokenAuth'
import { parseVoiceCaptureRequest } from './request'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function messageForStatus(status: string): string {
  if (status === 'executed') return 'Bereits ausgeführt.'
  if (status === 'needs_confirmation') return 'Bestätigung erforderlich.'
  if (status === 'failed') return 'Verarbeitung fehlgeschlagen.'
  if (status === 'discarded') return 'Eintrag wurde verworfen.'
  if (status === 'parsed') return 'Bereits analysiert.'
  return 'Erfasst.'
}

function siriResponse(payload: {
  ok: boolean
  entryId?: string
  status: string
  message: string
  taskId?: string
  appointmentId?: string
  idempotent?: boolean
  durationMs?: number
}) {
  return NextResponse.json(payload)
}

export async function POST(request: NextRequest) {
  const apiLogger = logger.api('/api/voice/capture', 'POST')
  const startTime = apiLogger.start()

  try {
    const supabase = await createServiceClient()

    // Token aus URL-Parameter, Body oder Header akzeptieren (Siri Shortcuts Kompatibilität)
    const body = await request.json().catch(() => ({}))
    const urlToken = request.nextUrl.searchParams.get('token')
    const bodyToken = typeof body === 'object' && body !== null && typeof (body as Record<string, unknown>).token === 'string'
      ? (body as Record<string, unknown>).token as string
      : null
    const resolvedToken = urlToken || bodyToken

    const tokenResult = resolvedToken
      ? await authenticateVoiceToken(supabase, resolvedToken)
      : await authenticateVoiceBearerToken(supabase, request.headers)
    if (!tokenResult.ok) {
      apiLogger.error(new Error(tokenResult.message), 401)
      return apiErrors.unauthorized({ component: 'api/voice/capture' })
    }

    const tokenContext = tokenResult.data

    const limitCheck = await rateLimit(request, `voice-token:${tokenContext.id}`)
    if (limitCheck && !limitCheck.allowed) {
      apiLogger.end(startTime, 429)
      return apiErrors.rateLimit(limitCheck.resetTime)
    }

    const companyId = await getCompanyIdForUser(tokenContext.userId, supabase)
    if (!companyId) {
      apiLogger.error(new Error('No company for token user'), 403)
      return apiErrors.forbidden({ component: 'api/voice/capture', reason: 'no_company' })
    }

    if (companyId !== tokenContext.companyId) {
      apiLogger.error(new Error('Token company mismatch'), 403)
      return apiErrors.forbidden({ component: 'api/voice/capture', reason: 'company_mismatch' })
    }

    const companySettings = await getCompanySettingsById(companyId, supabase)
    if (!companySettings?.voiceCaptureEnabled) {
      apiLogger.error(new Error('Voice capture disabled'), 403)
      return apiErrors.forbidden({ component: 'api/voice/capture', reason: 'voice_capture_disabled' })
    }

    const parsedRequest = parseVoiceCaptureRequest(body)
    if (!parsedRequest.ok) {
      apiLogger.error(new Error(parsedRequest.message), 400)
      return apiErrors.validation({
        component: 'api/voice/capture',
        validationMessage: parsedRequest.message,
      })
    }

    const inboxResult = await createOrGetVoiceInboxEntry(supabase, {
      companyId,
      userId: tokenContext.userId,
      tokenId: tokenContext.id,
      source: parsedRequest.data.source || 'siri_shortcut',
      locale: parsedRequest.data.locale,
      idempotencyKey: parsedRequest.data.idempotencyKey,
      inputText: parsedRequest.data.text,
      contextHints: parsedRequest.data.contextHints,
    })

    if (!inboxResult.ok) {
      apiLogger.error(new Error(inboxResult.message), 500)
      return apiErrors.internal(new Error(inboxResult.message), { component: 'api/voice/capture' })
    }

    const entry = inboxResult.data.entry

    if (!inboxResult.data.created && entry.status !== 'captured') {
      const durationMs = Date.now() - startTime
      apiLogger.end(startTime, 200)
      return siriResponse({
        ok: true,
        entryId: entry.id,
        status: entry.status,
        message: messageForStatus(entry.status),
        taskId: entry.executedTaskId,
        appointmentId: entry.executedAppointmentId,
        idempotent: true,
        durationMs,
      })
    }

    // Sofort antworten — KI-Verarbeitung passiert async über /api/voice/inbox/[id]/process
    // Siri Shortcuts hat ein kurzes Timeout; die 10s+ KI-Verarbeitung würde abgebrochen.
    const durationMs = Date.now() - startTime
    apiLogger.end(startTime, 200)
    return siriResponse({
      ok: true,
      entryId: entry.id,
      status: 'captured',
      message: 'Erfasst! Verarbeitung läuft im Hintergrund.',
      durationMs,
    })
  } catch (error) {
    apiLogger.error(error as Error, 500)
    return apiErrors.internal(error as Error, { component: 'api/voice/capture' })
  }
}
