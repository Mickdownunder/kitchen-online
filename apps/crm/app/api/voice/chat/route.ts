import { NextRequest } from 'next/server'
import {
  GoogleGenAI,
  createPartFromFunctionResponse,
  type GenerateContentResponse,
  type PartListUnion,
} from '@google/genai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/server'
import { getCompanyIdForUser } from '@/lib/supabase/services/company'
import { apiErrors } from '@/lib/utils/errorHandling'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/middleware/rateLimit'
import { authenticateVoiceBearerToken, authenticateVoiceToken } from '@/lib/voice/tokenAuth'
import { agentTools } from '@/lib/ai/agentTools'
import { buildSystemInstruction } from '@/lib/ai/systemInstruction'
import { executeServerFunctionCall } from '@/app/api/chat/serverHandlers'
import { mapProjectFromDB } from '@/lib/supabase/services/projects/mappers'
import type { ProjectRow } from '@/lib/supabase/services/projects/types'
import { loadInvoicesForProjectSummary } from '@/app/api/chat/summaryContext'
import { buildProjectSummary } from '@/lib/ai/projectSummary'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------

const MODEL = 'gemini-3-flash-preview'
const MAX_FUNCTION_CALL_ROUNDS = 10
const THOUGHT_SIGNATURE_SKIP = 'skip_thought_signature_validator'

// ---------------------------------------------------------------------------
// Company context proxy (same as voice/function)
// ---------------------------------------------------------------------------

function withCompanyContext(client: SupabaseClient, companyId: string): SupabaseClient {
  const originalRpc = client.rpc.bind(client)
  const proxy = new Proxy(client, {
    get(target, prop) {
      if (prop === 'rpc') {
        return (fnName: string, ...rest: unknown[]) => {
          if (fnName === 'get_current_company_id') {
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

// ---------------------------------------------------------------------------
// Streaming helpers (mirrored from chat/stream/sse.ts)
// ---------------------------------------------------------------------------

interface ChatHistoryEntry {
  role: string
  content: string
}

interface FunctionCallInfo {
  id: string
  name: string
  args: Record<string, unknown>
  thoughtSignature?: string
}

function normalizeHistory(
  chatHistory: ChatHistoryEntry[],
): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
  const mapped = chatHistory.map((m) => ({
    role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
    parts: [{ text: m.content }],
  }))
  let start = 0
  while (start < mapped.length && mapped[start].role === 'model') start += 1
  return mapped.slice(start)
}

function thoughtSignatureFromPart(part: Record<string, unknown>): string | undefined {
  const v = part?.thoughtSignature ?? part?.thought_signature
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

async function streamAndCollect(
  asyncGen: AsyncGenerator<GenerateContentResponse>,
  send: (data: Record<string, unknown>) => void,
): Promise<FunctionCallInfo[]> {
  const collected: FunctionCallInfo[] = []
  for await (const chunk of asyncGen) {
    if (chunk.text) send({ type: 'token', text: chunk.text })

    const chunkRecord = chunk as unknown as Record<string, unknown>
    const candidates = chunkRecord.candidates as Array<Record<string, unknown>> | undefined
    const content = candidates?.[0]?.content as Record<string, unknown> | undefined
    const rawParts = content?.parts as Array<Record<string, unknown>> | undefined
    const sigs: (string | undefined)[] = []
    rawParts?.forEach((p) => { if (p?.functionCall) sigs.push(thoughtSignatureFromPart(p)) })

    if (chunk.functionCalls?.length) {
      for (let i = 0; i < chunk.functionCalls.length; i += 1) {
        const fc = chunk.functionCalls[i]
        const raw = fc as typeof fc & { thoughtSignature?: string; thought_signature?: string }
        collected.push({
          id: fc.id || `fc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: fc.name || 'unknown',
          args: (fc.args || {}) as Record<string, unknown>,
          thoughtSignature: raw.thoughtSignature ?? raw.thought_signature ?? sigs[i],
        })
      }
    }
  }
  return collected
}

async function executeFunctionCalls(
  functionCalls: FunctionCallInfo[],
  supabase: SupabaseClient,
  userId: string,
  send: (data: Record<string, unknown>) => void,
  allUpdatedProjectIds: Set<string>,
  userMessage?: string,
): Promise<unknown[]> {
  const parts: unknown[] = []
  const context = userMessage ? { userMessage } : undefined

  for (const fc of functionCalls) {
    logger.info('Voice chat function call', { component: 'api/voice/chat', functionName: fc.name })

    const result = await executeServerFunctionCall(fc.name, fc.args, supabase, userId, context)
    if (result.updatedProjectIds) result.updatedProjectIds.forEach((id) => allUpdatedProjectIds.add(id))

    send({ type: 'functionResult', functionName: fc.name, result: result.result })
    if (result.pendingEmail) send({ type: 'pendingEmail', email: result.pendingEmail })

    const sig = fc.thoughtSignature ?? THOUGHT_SIGNATURE_SKIP
    parts.push({
      functionCall: {
        id: fc.id, name: fc.name, args: fc.args,
        thought_signature: sig, thoughtSignature: sig,
      },
      thoughtSignature: sig, thought_signature: sig,
    })
    parts.push(createPartFromFunctionResponse(fc.id, fc.name, { result: result.result }))
  }
  return parts
}

// ---------------------------------------------------------------------------
// Context loading (server-side, no user session required)
// ---------------------------------------------------------------------------

async function loadVoiceContext(supabase: SupabaseClient, companyId: string) {
  // Load projects — try with invoice_items join, fall back to plain select
  // (service_role may lack table-level GRANT on invoice_items)
  let projectRows: Record<string, unknown>[] | null = null
  let projectError: unknown = null

  const fullQuery = await supabase
    .from('projects')
    .select('*, invoice_items (*)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (fullQuery.error) {
    logger.warn('Voice context: full project query failed, falling back to simple query', {
      component: 'api/voice/chat',
      error: fullQuery.error.message,
    })
    const simpleQuery = await supabase
      .from('projects')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(100)
    projectRows = simpleQuery.data
    projectError = simpleQuery.error
  } else {
    projectRows = fullQuery.data
  }

  if (projectError) {
    logger.error('Voice context: project loading failed', {
      component: 'api/voice/chat',
      error: String(projectError),
    })
  }

  const projects = (projectRows || []).map((row) => mapProjectFromDB(row as unknown as ProjectRow))

  // Load invoices separately (more robust than relying on join)
  let invoices: Awaited<ReturnType<typeof loadInvoicesForProjectSummary>> = []
  try {
    invoices = await loadInvoicesForProjectSummary(supabase, projects)
  } catch (e) {
    logger.warn('Voice context: invoice loading failed', {
      component: 'api/voice/chat',
      error: e instanceof Error ? e.message : String(e),
    })
  }

  const projectSummary = buildProjectSummary(projects, invoices)

  logger.info('Voice context loaded', {
    component: 'api/voice/chat',
    projectCount: projects.length,
    invoiceCount: invoices.length,
    summaryLength: projectSummary.length,
  })

  // Load planning appointments
  const { data: appointments, error: apptError } = await supabase
    .from('planning_appointments')
    .select('id, customer_name, date, time, type, notes')
    .eq('company_id', companyId)
    .order('date', { ascending: true })
    .order('time', { ascending: true })

  if (apptError) {
    logger.warn('Voice context: appointment loading failed', {
      component: 'api/voice/chat',
      error: apptError.message,
    })
  }

  const appointmentLines = (appointments || []).map(
    (a: Record<string, unknown>) => {
      const time = a.time ? ` ${a.time}` : ''
      const notes = a.notes ? ` - ${(a.notes as string).slice(0, 80)}` : ''
      return `id=${a.id} | ${a.date}${time} | ${a.type} | ${a.customer_name}${notes}`
    },
  )

  // Also include project-based dates (Montage, Aufmaß, Lieferung) as appointment lines
  for (const p of projects) {
    if (p.installationDate) {
      const time = p.installationTime ? ` ${p.installationTime}` : ''
      appointmentLines.push(`projekt=${p.id} | ${p.installationDate}${time} | Montage | ${p.customerName} (${p.orderNumber})`)
    }
    if (p.measurementDate) {
      const time = p.measurementTime ? ` ${p.measurementTime}` : ''
      appointmentLines.push(`projekt=${p.id} | ${p.measurementDate}${time} | Aufmaß | ${p.customerName} (${p.orderNumber})`)
    }
    if (p.deliveryDate) {
      const time = p.deliveryTime ? ` ${p.deliveryTime}` : ''
      appointmentLines.push(`projekt=${p.id} | ${p.deliveryDate}${time} | Lieferung | ${p.customerName} (${p.orderNumber})`)
    }
  }

  // Sort by date
  appointmentLines.sort((a, b) => {
    const dateA = a.split('|')[1]?.trim() || ''
    const dateB = b.split('|')[1]?.trim() || ''
    return dateA.localeCompare(dateB)
  })

  const appointmentsSummary = appointmentLines.join('\n')

  logger.info('Voice context appointments', {
    component: 'api/voice/chat',
    planningCount: (appointments || []).length,
    totalAppointmentLines: appointmentLines.length,
  })

  return { projectSummary, appointmentsSummary }
}

// ---------------------------------------------------------------------------
// POST /api/voice/chat
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const apiLogger = logger.api('/api/voice/chat', 'POST')
  const startTime = apiLogger.start()

  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim()
    if (!apiKey) {
      apiLogger.error(new Error('GEMINI_API_KEY not configured'), 500)
      return apiErrors.internal(new Error('GEMINI_API_KEY not configured'), { component: 'api/voice/chat' })
    }

    const supabase = await createServiceClient()

    // Parse body
    const body = await request.json().catch(() => ({}))
    const bodyObj = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>

    // Auth: voice token from URL, body, or header
    const urlToken = request.nextUrl.searchParams.get('token')
    const bodyToken = typeof bodyObj.token === 'string' ? bodyObj.token : null
    const resolvedToken = urlToken || bodyToken

    const tokenResult = resolvedToken
      ? await authenticateVoiceToken(supabase, resolvedToken)
      : await authenticateVoiceBearerToken(supabase, request.headers)

    if (!tokenResult.ok) {
      apiLogger.error(new Error(tokenResult.message), 401)
      return apiErrors.unauthorized({ component: 'api/voice/chat' })
    }

    const tokenContext = tokenResult.data

    // Rate limit
    const limitCheck = await rateLimit(request, `voice-chat:${tokenContext.id}`)
    if (limitCheck && !limitCheck.allowed) {
      apiLogger.end(startTime, 429)
      return apiErrors.rateLimit(limitCheck.resetTime)
    }

    // Validate company
    const companyId = await getCompanyIdForUser(tokenContext.userId, supabase)
    if (!companyId || companyId !== tokenContext.companyId) {
      apiLogger.error(new Error('Company mismatch'), 403)
      return apiErrors.forbidden({ component: 'api/voice/chat' })
    }

    // Extract request data
    const message = typeof bodyObj.message === 'string' ? bodyObj.message.trim() : ''
    if (!message) {
      return apiErrors.validation({ component: 'api/voice/chat', validationMessage: 'message is required' })
    }

    const chatHistory: ChatHistoryEntry[] = Array.isArray(bodyObj.chatHistory)
      ? (bodyObj.chatHistory as unknown[])
          .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
          .map((e) => ({
            role: typeof e.role === 'string' ? e.role : 'model',
            content: typeof e.content === 'string' ? e.content : '',
          }))
      : []

    // Load CRM context
    const supabaseWithCompany = withCompanyContext(supabase, companyId)
    const { projectSummary, appointmentsSummary } = await loadVoiceContext(supabaseWithCompany, companyId)

    logger.info('Voice chat request', {
      component: 'api/voice/chat',
      userId: tokenContext.userId,
      messageLength: message.length,
      historyLength: chatHistory.length,
    })

    // Build SSE response with Gemini streaming
    const ai = new GoogleGenAI({ apiKey })
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const allUpdatedProjectIds = new Set<string>()

        const send = (data: Record<string, unknown>): void => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          const chat = ai.chats.create({
            model: MODEL,
            config: {
              systemInstruction: buildSystemInstruction({
                projectSummary,
                variant: 'stream',
                appointmentsSummary,
                voiceMode: true,
              }),
              tools: [{ functionDeclarations: agentTools }],
            },
            history: normalizeHistory(chatHistory),
          })

          send({ type: 'start' })

          const initialStream = await chat.sendMessageStream({ message })
          let pendingFunctionCalls = await streamAndCollect(initialStream, send)

          let round = 0
          while (pendingFunctionCalls.length > 0 && round < MAX_FUNCTION_CALL_ROUNDS) {
            round += 1
            send({ type: 'functionCalls', functionCalls: pendingFunctionCalls, executing: true })

            const nextParts = await executeFunctionCalls(
              pendingFunctionCalls,
              supabaseWithCompany,
              tokenContext.userId,
              send,
              allUpdatedProjectIds,
              message,
            )
            const nextStream = await chat.sendMessageStream({
              message: nextParts as unknown as PartListUnion,
            })
            pendingFunctionCalls = await streamAndCollect(nextStream, send)
          }

          send({
            type: 'done',
            duration: Date.now() - startTime,
            updatedProjectIds: Array.from(allUpdatedProjectIds),
          })

          controller.close()
          apiLogger.end(startTime, 200)
        } catch (error) {
          logger.error('Voice chat stream error', { component: 'api/voice/chat' }, error as Error)
          send({ type: 'error', error: error instanceof Error ? error.message : 'Unbekannter Fehler' })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    apiLogger.error(error as Error, 500)
    return apiErrors.internal(error as Error, { component: 'api/voice/chat' })
  }
}
