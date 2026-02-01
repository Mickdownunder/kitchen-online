import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
// CustomerProject type is available via projects parameter
import { agentTools } from '@/lib/ai/agentTools'
import { buildProjectSummary } from '@/lib/ai/projectSummary'
import { buildSystemInstruction } from '@/lib/ai/systemInstruction'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/middleware/rateLimit'
import { createClient } from '@/lib/supabase/server'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// Next.js 15: Erhöhe Body-Size-Limit für große Requests
export const runtime = 'nodejs'
export const maxDuration = 60

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
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    if (user.app_metadata?.role === 'customer') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 403 })
    }

    const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
      p_permission_code: 'edit_projects',
    })
    if (permError || !hasPermission) {
      return NextResponse.json(
        { error: 'Keine Berechtigung zur Nutzung des AI-Assistenten' },
        { status: 403 }
      )
    }

    // Rate limiting - use authenticated user ID
    const userId = user.id

    const limitCheck = await rateLimit(request, userId)
    if (!limitCheck || !limitCheck.allowed) {
      logger.warn('Rate limit exceeded', {
        component: 'api/chat/stream',
        userId,
      })
      const resetTime = limitCheck?.resetTime || Date.now() + 60000
      return new Response(
        JSON.stringify({
          error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
          resetTime,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString(),
          },
        }
      )
    }

    // GEMINI_API_KEY vor Body prüfen (fail fast)
    if (!process.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Prüfe Request-Body-Größe und reduziere Projektdaten falls nötig
    let requestBody
    try {
      // Versuche Body als Text zu lesen für Größenprüfung
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

      // Parse JSON
      requestBody = JSON.parse(bodyText)
    } catch (parseError: unknown) {
      const errMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error'
      const errName = parseError instanceof Error ? parseError.name : 'Error'
      logger.error(
        'Chat Stream API JSON parse error',
        {
          component: 'api/chat/stream',
          message: errMessage,
          name: errName,
        },
        parseError as Error
      )
      return new Response(
        JSON.stringify({
          error:
            'Request body zu groß oder ungültig. Bitte reduzieren Sie die Anzahl der Projekte oder versuchen Sie es erneut.',
          details: errMessage,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { message, projects, chatHistory } = requestBody

    // Best practice: Obergrenzen für Nachrichtenlänge und Projektanzahl
    const MAX_MESSAGE_LENGTH = 10_000
    const MAX_PROJECTS = 500
    const msg = typeof message === 'string' ? message : ''
    if (msg.length > MAX_MESSAGE_LENGTH) {
      return new Response(
        JSON.stringify({
          error: `Nachricht zu lang (max. ${MAX_MESSAGE_LENGTH} Zeichen). Bitte kürzen.`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    const projectList = Array.isArray(projects) ? projects : []
    if (projectList.length > MAX_PROJECTS) {
      return new Response(
        JSON.stringify({
          error: `Zu viele Projekte (max. ${MAX_PROJECTS}). Bitte weniger auswählen.`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Projekte sind bereits im Frontend optimiert, verwende sie direkt
    const optimizedProjects = projectList

    logger.info('Chat Stream API request received', {
      component: 'api/chat/stream',
      projectsCount: optimizedProjects.length,
    })

    // Rechnungsdaten server-seitig laden für Projekt-Kontext (Best Practice)
    const projectIds = optimizedProjects.map((p: { id?: string }) => p.id).filter(Boolean) as string[]
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

    const projectSummary = buildProjectSummary(optimizedProjects, invoicesForSummary)

    // Use flash model for faster responses
    const useFlashModel =
      !msg.toLowerCase().includes('komplex') &&
      !msg.toLowerCase().includes('detailliert') &&
      msg.length < 1000
    const model = useFlashModel ? 'gemini-3-flash-preview' : 'gemini-3-pro-preview'
    logger.debug('Using AI model', {
      component: 'api/chat/stream',
      model,
      useFlashModel,
    })

    // Create a ReadableStream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        try {
          // Build context from chat history
          let historyContext = ''
          if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
            historyContext =
              '\n\n## VORHERIGE UNTERHALTUNG:\n' +
              chatHistory
                .map(
                  (m: { role: string; content: string }) =>
                    `${m.role === 'user' ? 'Nutzer' : 'Ki'}: ${m.content}`
                )
                .join('\n') +
              '\n'
          }

          const chat = ai.chats.create({
            model: model,
            config: {
              systemInstruction: buildSystemInstruction({
                projectSummary,
                historyContext,
                variant: 'stream',
              }),
              tools: [{ functionDeclarations: agentTools }],
            },
          })

          // Send initial message
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`))

          // Stream the response
          const response = await chat.sendMessage({ message: msg })

          // Gemini API doesn't support true streaming yet, so we simulate it
          // by sending the response in chunks for better UX
          if (response.text) {
            const text = response.text
            const words = text.split(' ')
            let currentChunk = ''

            for (let i = 0; i < words.length; i++) {
              currentChunk += (i > 0 ? ' ' : '') + words[i]

              // Send every 3 words or at end
              if ((i + 1) % 3 === 0 || i === words.length - 1) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: 'token', text: currentChunk })}\n\n`
                  )
                )
                currentChunk = ''
                // Small delay for smooth streaming effect
                await new Promise(resolve => setTimeout(resolve, 30))
              }
            }
          }

          // Extract function calls
          const functionCalls =
            response.functionCalls?.map(fc => ({
              id: fc.id || Date.now().toString(),
              name: fc.name || 'unknown',
              args: fc.args || {},
            })) || []

          // Send function calls
          if (functionCalls.length > 0) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'functionCalls', functionCalls })}\n\n`
              )
            )
          }

          // Send completion
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'done', duration: Date.now() - startTime })}\n\n`
            )
          )
          controller.close()
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : 'Unbekannter Fehler'
          logger.error(
            'Chat Stream API stream error',
            {
              component: 'api/chat/stream',
              action: 'streaming',
            },
            error as Error
          )
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errMsg })}\n\n`)
          )
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
    logger.error(
      'Chat Stream API error',
      {
        component: 'api/chat/stream',
      },
      error as Error
    )
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to process chat message',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
