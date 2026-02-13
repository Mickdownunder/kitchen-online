import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getCompanyIdForUser } from '@/lib/supabase/services/company'
import { apiErrors } from '@/lib/utils/errorHandling'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/middleware/rateLimit'
import { authenticateVoiceBearerToken, authenticateVoiceToken } from '@/lib/voice/tokenAuth'
import { buildVoiceSystemInstruction } from '@/lib/ai/systemInstruction'
import { agentTools } from '@/lib/ai/agentTools'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/voice/session
 *
 * Creates a Gemini Live API session config for the voice mobile app.
 * Returns the API key (for direct WebSocket connection) and full config
 * including system instruction with CRM context and tools.
 *
 * Auth: Voice Token (URL param, body, or Authorization header)
 */
export async function POST(request: NextRequest) {
  const apiLogger = logger.api('/api/voice/session', 'POST')
  const startTime = apiLogger.start()

  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim()
    if (!apiKey) {
      apiLogger.error(new Error('GEMINI_API_KEY not configured'), 500)
      return apiErrors.internal(new Error('GEMINI_API_KEY not configured'), {
        component: 'api/voice/session',
      })
    }

    const supabase = await createServiceClient()

    // Auth: token from URL, body, or header
    const body = await request.json().catch(() => ({}))
    const urlToken = request.nextUrl.searchParams.get('token')
    const bodyToken =
      typeof body === 'object' && body !== null && typeof (body as Record<string, unknown>).token === 'string'
        ? ((body as Record<string, unknown>).token as string)
        : null
    const resolvedToken = urlToken || bodyToken

    const tokenResult = resolvedToken
      ? await authenticateVoiceToken(supabase, resolvedToken)
      : await authenticateVoiceBearerToken(supabase, request.headers)

    if (!tokenResult.ok) {
      apiLogger.error(new Error(tokenResult.message), 401)
      return apiErrors.unauthorized({ component: 'api/voice/session' })
    }

    const tokenContext = tokenResult.data

    // Rate limit
    const limitCheck = await rateLimit(request, `voice-session:${tokenContext.id}`)
    if (limitCheck && !limitCheck.allowed) {
      apiLogger.end(startTime, 429)
      return apiErrors.rateLimit(limitCheck.resetTime)
    }

    // Validate company
    const companyId = await getCompanyIdForUser(tokenContext.userId, supabase)
    if (!companyId || companyId !== tokenContext.companyId) {
      apiLogger.error(new Error('Company mismatch'), 403)
      return apiErrors.forbidden({ component: 'api/voice/session' })
    }

    // Load CRM context: compact project summary + appointments
    const { data: projects } = await supabase
      .from('projects')
      .select('id, customer_name, order_number, status, total_amount, net_amount, tax_amount, is_deposit_paid, is_final_paid')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(100)

    // Build a compact summary directly (avoid heavy CustomerProject mapping)
    const projectLines = (projects || []).map(
      (p: Record<string, unknown>) =>
        `${p.order_number || '—'} | ${p.customer_name} | ${p.status} | ${(p.total_amount as number)?.toLocaleString('de-DE') ?? '0'}€ | AZ:${p.is_deposit_paid ? 'ja' : 'nein'} SR:${p.is_final_paid ? 'ja' : 'nein'}`,
    )

    const { data: appointments } = await supabase
      .from('planning_appointments')
      .select('id, customer_name, date, time, type, notes')
      .eq('company_id', companyId)
      .order('date', { ascending: true })
      .order('time', { ascending: true })

    const appointmentLines = (appointments || []).map(
      (a: Record<string, unknown>) => {
        const time = a.time ? ` ${a.time}` : ''
        const notes = a.notes ? ` - ${(a.notes as string).slice(0, 60)}` : ''
        return `id=${a.id} | ${a.date}${time} | ${a.type} | ${a.customer_name}${notes}`
      },
    )

    const systemInstruction = buildVoiceSystemInstruction({
      projectSummary: projectLines.length > 0 ? projectLines.join('\n') : 'Keine Projekte vorhanden.',
      appointmentsSummary: appointmentLines.length > 0 ? appointmentLines.join('\n') : undefined,
    })

    // Return config for client-side WebSocket connection
    const durationMs = Date.now() - startTime
    apiLogger.end(startTime, 200)

    return NextResponse.json({
      ok: true,
      apiKey, // Client uses this for direct WebSocket to Gemini
      userId: tokenContext.userId,
      companyId,
      config: {
        systemInstruction,
        tools: agentTools.map((t) => ({
          name: t.name,
          description: (t as Record<string, unknown>).description,
          parameters: t.parameters,
        })),
      },
      durationMs,
    })
  } catch (error) {
    apiLogger.error(error as Error, 500)
    return apiErrors.internal(error as Error, { component: 'api/voice/session' })
  }
}
