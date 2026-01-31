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

    // Projekte sind bereits im Frontend optimiert, verwende sie direkt
    const optimizedProjects = projects

    if (!process.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    logger.info('Chat Stream API request received', {
      component: 'api/chat/stream',
      projectsCount: optimizedProjects?.length || 0,
    })

    const projectSummary = buildProjectSummary(optimizedProjects)

    // Use flash model for faster responses
    const useFlashModel =
      !message.toLowerCase().includes('komplex') &&
      !message.toLowerCase().includes('detailliert') &&
      message.length < 1000
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
          const response = await chat.sendMessage({ message })

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
