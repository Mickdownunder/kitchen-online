import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, createPartFromFunctionResponse } from '@google/genai'
import { agentTools } from '@/lib/ai/agentTools'
import { buildProjectSummary } from '@/lib/ai/projectSummary'
import { buildSystemInstruction } from '@/lib/ai/systemInstruction'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/middleware/rateLimit'
import { apiErrors } from '@/lib/utils/errorHandling'
import { createClient } from '@/lib/supabase/server'
import { executeServerFunctionCall } from '../serverHandlers'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// Next.js 15: Erhöhe Body-Size-Limit für große Requests
export const runtime = 'nodejs'
export const maxDuration = 60

// Max iterations for the function call loop (safety)
const MAX_FUNCTION_CALL_ROUNDS = 10

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Auth + permission checks
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return apiErrors.unauthorized()
    }

    if (user.app_metadata?.role === 'customer') {
      return apiErrors.forbidden()
    }

    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      return apiErrors.forbidden()
    }

    const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
      p_permission_code: 'edit_projects',
    })
    if (permError || !hasPermission) {
      return apiErrors.forbidden()
    }

    // Rate limiting
    const userId = user.id

    const limitCheck = await rateLimit(request, userId)
    if (limitCheck && !limitCheck.allowed) {
      return apiErrors.rateLimit(limitCheck.resetTime)
    }

    if (!process.env.GEMINI_API_KEY) {
      return apiErrors.internal(new Error('GEMINI_API_KEY is not configured'), { component: 'chat-stream' })
    }

    // Parse request body
    let requestBody
    try {
      const bodyText = await request.text()
      const bodySizeMB = bodyText.length / (1024 * 1024)
      logger.info('Chat Stream API request body size', {
        component: 'api/chat/stream',
        bodySizeMB: bodySizeMB.toFixed(2),
      })

      if (bodySizeMB > 10) {
        logger.warn('Chat Stream API request body sehr groß', {
          component: 'api/chat/stream',
          bodySizeMB: bodySizeMB.toFixed(2),
        })
      }

      requestBody = JSON.parse(bodyText)
    } catch (parseError: unknown) {
      const errMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error'
      logger.error('Chat Stream API JSON parse error', {
        component: 'api/chat/stream',
        message: errMessage,
      }, parseError as Error)
      return apiErrors.badRequest()
    }

    const { message, projects, chatHistory } = requestBody

    // Validation
    const MAX_MESSAGE_LENGTH = 10_000
    const MAX_PROJECTS = 500
    const msg = typeof message === 'string' ? message : ''
    if (msg.length > MAX_MESSAGE_LENGTH) {
      return apiErrors.validation()
    }
    const projectList = Array.isArray(projects) ? projects : []
    if (projectList.length > MAX_PROJECTS) {
      return apiErrors.validation()
    }

    logger.info('Chat Stream API request received', {
      component: 'api/chat/stream',
      projectsCount: projectList.length,
    })

    // Load invoice data server-side for project context
    const projectIds = projectList.map((p: { id?: string }) => p.id).filter(Boolean) as string[]
    let invoicesForSummary: import('@/types').Invoice[] = []
    if (projectIds.length > 0) {
      const { data: invoicesRows } = await supabase
        .from('invoices')
        .select('id, project_id, type, invoice_number, amount, is_paid, net_amount, tax_amount, tax_rate, invoice_date, due_date, paid_date, description, notes, schedule_type, reminders, created_at, updated_at, user_id')
        .in('project_id', projectIds)
      if (invoicesRows?.length) {
        invoicesForSummary = invoicesRows.map((row: Record<string, unknown>) => ({
          id: String(row.id),
          userId: String(row.user_id ?? ''),
          projectId: String(row.project_id ?? ''),
          type: String(row.type ?? 'partial'),
          invoiceNumber: String(row.invoice_number ?? ''),
          amount: Number(row.amount ?? 0),
          netAmount: Number(row.net_amount ?? 0),
          taxAmount: Number(row.tax_amount ?? 0),
          taxRate: Number(row.tax_rate ?? 20),
          isPaid: Boolean(row.is_paid),
          invoiceDate: row.invoice_date ? String(row.invoice_date) : '',
          dueDate: row.due_date ? String(row.due_date) : undefined,
          paidDate: row.paid_date ? String(row.paid_date) : undefined,
          description: row.description ? String(row.description) : undefined,
          notes: row.notes ? String(row.notes) : undefined,
          scheduleType: row.schedule_type ? String(row.schedule_type) : undefined,
          reminders: Array.isArray(row.reminders) ? row.reminders : [],
          createdAt: row.created_at ? String(row.created_at) : undefined,
          updatedAt: row.updated_at ? String(row.updated_at) : undefined,
        })) as import('@/types').Invoice[]
      }
    }

    const projectSummary = buildProjectSummary(projectList, invoicesForSummary)

    // Model selection - use Flash by default
    const model = 'gemini-2.5-flash-preview-05-20'

    logger.debug('Using AI model', { component: 'api/chat/stream', model })

    // ========================================
    // Create SSE stream with server-side function execution loop
    // ========================================
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const allUpdatedProjectIds = new Set<string>()

        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          // Build chat history as native Gemini contents
          const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []
          if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
            for (const m of chatHistory as Array<{ role: string; content: string }>) {
              const role = m.role === 'user' ? 'user' as const : 'model' as const
              contents.push({ role, parts: [{ text: m.content }] })
            }
          }

          const chat = ai.chats.create({
            model,
            config: {
              systemInstruction: buildSystemInstruction({
                projectSummary,
                variant: 'stream',
              }),
              tools: [{ functionDeclarations: agentTools }],
            },
            history: contents,
          })

          send({ type: 'start' })

          // ========================================
          // Helper: Stream a response and collect function calls
          // ========================================
          type FcInfo = { id: string; name: string; args: Record<string, unknown> }

          async function streamAndCollect(
            asyncGen: AsyncGenerator<import('@google/genai').GenerateContentResponse>
          ): Promise<FcInfo[]> {
            const collectedFunctionCalls: FcInfo[] = []
            for await (const chunk of asyncGen) {
              // Stream text tokens in real-time
              if (chunk.text) {
                send({ type: 'token', text: chunk.text })
              }
              // Collect function calls (typically arrive in last chunk)
              if (chunk.functionCalls?.length) {
                for (const fc of chunk.functionCalls) {
                  collectedFunctionCalls.push({
                    id: fc.id || `fc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    name: fc.name || 'unknown',
                    args: (fc.args || {}) as Record<string, unknown>,
                  })
                }
              }
            }
            return collectedFunctionCalls
          }

          // ========================================
          // Execute function calls on server
          // ========================================
          async function executeFunctionCalls(functionCalls: FcInfo[]) {
            const functionResponseParts = []
            for (const fc of functionCalls) {
              logger.info('Executing server function call', {
                component: 'api/chat/stream',
                functionName: fc.name,
              })

              const handlerResult = await executeServerFunctionCall(
                fc.name,
                fc.args,
                supabase,
                userId
              )

              // Track updated project IDs
              if (handlerResult.updatedProjectIds) {
                handlerResult.updatedProjectIds.forEach(id => allUpdatedProjectIds.add(id))
              }

              // Send function result to client for display
              send({
                type: 'functionResult',
                functionName: fc.name,
                result: handlerResult.result,
              })

              // Handle pending email (human-in-the-loop)
              if (handlerResult.pendingEmail) {
                send({
                  type: 'pendingEmail',
                  email: handlerResult.pendingEmail,
                })
              }

              // Build function response for Gemini
              functionResponseParts.push(
                createPartFromFunctionResponse(
                  fc.id,
                  fc.name,
                  { result: handlerResult.result }
                )
              )
            }
            return functionResponseParts
          }

          // ========================================
          // Main loop: True streaming with native function call loop
          // ========================================

          // First message: stream response in real-time
          const initialStream = await chat.sendMessageStream({ message: msg })
          let pendingFunctionCalls = await streamAndCollect(initialStream)

          let round = 0
          while (pendingFunctionCalls.length > 0 && round < MAX_FUNCTION_CALL_ROUNDS) {
            round++

            // Notify client about function calls
            send({ type: 'functionCalls', functionCalls: pendingFunctionCalls, executing: true })

            // Execute function calls on the server
            const functionResponseParts = await executeFunctionCalls(pendingFunctionCalls)

            // Send function responses back to Gemini and stream the next response
            const nextStream = await chat.sendMessageStream({ message: functionResponseParts })
            pendingFunctionCalls = await streamAndCollect(nextStream)
          }

          // Send completion with list of updated projects
          send({
            type: 'done',
            duration: Date.now() - startTime,
            updatedProjectIds: Array.from(allUpdatedProjectIds),
          })
          controller.close()
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : 'Unbekannter Fehler'
          logger.error('Chat Stream API stream error', {
            component: 'api/chat/stream',
            action: 'streaming',
          }, error as Error)
          send({ type: 'error', error: errMsg })
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
  } catch (error: unknown) {
    logger.error('Chat Stream API error', {
      component: 'api/chat/stream',
    }, error as Error)
    return apiErrors.internal(error as Error, { component: 'chat-stream' })
  }
}
