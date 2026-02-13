import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/server'
import { getCompanyIdForUser } from '@/lib/supabase/services/company'
import { apiErrors } from '@/lib/utils/errorHandling'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/middleware/rateLimit'
import { authenticateVoiceBearerToken, authenticateVoiceToken } from '@/lib/voice/tokenAuth'
import { executeServerFunctionCall } from '@/app/api/chat/serverHandlers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Wraps a service-role Supabase client so that `rpc('get_current_company_id')`
 * returns the known companyId instead of relying on auth.uid() (which is null
 * for service-role clients). This lets existing chat handlers work unchanged
 * when called from the voice endpoint.
 */
function withCompanyContext(client: SupabaseClient, companyId: string): SupabaseClient {
  const originalRpc = client.rpc.bind(client)
  const proxy = new Proxy(client, {
    get(target, prop) {
      if (prop === 'rpc') {
        return (fnName: string, ...rest: unknown[]) => {
          if (fnName === 'get_current_company_id') {
            // Return a thenable that mimics the Supabase response shape
            return { data: companyId, error: null, count: null, status: 200, statusText: 'OK' }
          }
          return originalRpc(fnName, ...rest)
        }
      }
      return Reflect.get(target, prop)
    },
  })
  return proxy
}

/**
 * POST /api/voice/function
 *
 * Executes a CRM function call on behalf of Gemini Live.
 * The voice mobile app calls this when Gemini requests a tool call,
 * then sends the result back to the Gemini WebSocket session.
 *
 * Auth: Voice Token (URL param, body, or Authorization header)
 * Body: { functionName: string, args: Record<string, unknown>, token?: string }
 */
export async function POST(request: NextRequest) {
  const apiLogger = logger.api('/api/voice/function', 'POST')
  const startTime = apiLogger.start()

  try {
    const supabase = await createServiceClient()

    const body = await request.json().catch(() => ({}))
    if (typeof body !== 'object' || body === null) {
      return apiErrors.badRequest()
    }

    const bodyObj = body as Record<string, unknown>

    // Auth
    const urlToken = request.nextUrl.searchParams.get('token')
    const bodyToken = typeof bodyObj.token === 'string' ? bodyObj.token : null
    const resolvedToken = urlToken || bodyToken

    const tokenResult = resolvedToken
      ? await authenticateVoiceToken(supabase, resolvedToken)
      : await authenticateVoiceBearerToken(supabase, request.headers)

    if (!tokenResult.ok) {
      apiLogger.error(new Error(tokenResult.message), 401)
      return apiErrors.unauthorized({ component: 'api/voice/function' })
    }

    const tokenContext = tokenResult.data

    // Rate limit
    const limitCheck = await rateLimit(request, `voice-fn:${tokenContext.id}`)
    if (limitCheck && !limitCheck.allowed) {
      apiLogger.end(startTime, 429)
      return apiErrors.rateLimit(limitCheck.resetTime)
    }

    // Validate company
    const companyId = await getCompanyIdForUser(tokenContext.userId, supabase)
    if (!companyId || companyId !== tokenContext.companyId) {
      apiLogger.error(new Error('Company mismatch'), 403)
      return apiErrors.forbidden({ component: 'api/voice/function' })
    }

    // Extract function call params
    const functionName = typeof bodyObj.functionName === 'string' ? bodyObj.functionName.trim() : ''
    const args = typeof bodyObj.args === 'object' && bodyObj.args !== null
      ? bodyObj.args as Record<string, unknown>
      : {}

    if (!functionName) {
      return apiErrors.validation({
        component: 'api/voice/function',
        validationMessage: 'functionName is required',
      })
    }

    logger.info('Voice function call', {
      component: 'api/voice/function',
      functionName,
      userId: tokenContext.userId,
    })

    // Wrap supabase client so handlers can resolve company_id via
    // rpc('get_current_company_id') without a user session.
    const supabaseWithCompany = withCompanyContext(supabase, companyId)

    // Execute the CRM function using existing handler registry
    const result = await executeServerFunctionCall(
      functionName,
      args,
      supabaseWithCompany,
      tokenContext.userId,
    )

    const durationMs = Date.now() - startTime
    apiLogger.end(startTime, 200)

    return NextResponse.json({
      ok: true,
      result: result.result,
      updatedProjectIds: result.updatedProjectIds,
      durationMs,
    })
  } catch (error) {
    apiLogger.error(error as Error, 500)
    return apiErrors.internal(error as Error, { component: 'api/voice/function' })
  }
}
