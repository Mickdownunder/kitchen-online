import { GoogleGenAI, createPartFromFunctionResponse, type GenerateContentResponse } from '@google/genai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { agentTools } from '@/lib/ai/agentTools'
import { buildSystemInstruction } from '@/lib/ai/systemInstruction'
import { logger } from '@/lib/utils/logger'
import { executeServerFunctionCall } from '../serverHandlers'
import type { ChatHistoryEntry } from './types'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const MODEL = 'gemini-3-flash-preview'
const MAX_FUNCTION_CALL_ROUNDS = 10

interface CreateChatStreamResponseInput {
  message: string
  projectSummary: string
  appointmentsSummary: string
  chatHistory: ChatHistoryEntry[]
  supabase: SupabaseClient
  userId: string
  requestStartedAt: number
}

interface FunctionCallInfo {
  id: string
  name: string
  args: Record<string, unknown>
}

function normalizeHistory(
  chatHistory: ChatHistoryEntry[],
): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
  return chatHistory.map((message) => {
    const role = message.role === 'user' ? 'user' : 'model'
    return {
      role,
      parts: [{ text: message.content }],
    }
  })
}

async function streamAndCollect(
  asyncGen: AsyncGenerator<GenerateContentResponse>,
  send: (data: Record<string, unknown>) => void,
): Promise<FunctionCallInfo[]> {
  const collectedFunctionCalls: FunctionCallInfo[] = []

  for await (const chunk of asyncGen) {
    if (chunk.text) {
      send({ type: 'token', text: chunk.text })
    }

    if (chunk.functionCalls?.length) {
      for (const functionCall of chunk.functionCalls) {
        collectedFunctionCalls.push({
          id:
            functionCall.id ||
            `fc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: functionCall.name || 'unknown',
          args: (functionCall.args || {}) as Record<string, unknown>,
        })
      }
    }
  }

  return collectedFunctionCalls
}

async function executeFunctionCalls(
  functionCalls: FunctionCallInfo[],
  supabase: SupabaseClient,
  userId: string,
  send: (data: Record<string, unknown>) => void,
  allUpdatedProjectIds: Set<string>,
): Promise<ReturnType<typeof createPartFromFunctionResponse>[]> {
  const functionResponseParts = []

  for (const functionCall of functionCalls) {
    logger.info('Executing server function call', {
      component: 'api/chat/stream',
      functionName: functionCall.name,
    })

    const handlerResult = await executeServerFunctionCall(
      functionCall.name,
      functionCall.args,
      supabase,
      userId,
    )

    if (handlerResult.updatedProjectIds) {
      handlerResult.updatedProjectIds.forEach((id) => allUpdatedProjectIds.add(id))
    }

    send({
      type: 'functionResult',
      functionName: functionCall.name,
      result: handlerResult.result,
    })

    if (handlerResult.pendingEmail) {
      send({
        type: 'pendingEmail',
        email: handlerResult.pendingEmail,
      })
    }

    functionResponseParts.push(
      createPartFromFunctionResponse(functionCall.id, functionCall.name, {
        result: handlerResult.result,
      }),
    )
  }

  return functionResponseParts
}

export function createChatStreamResponse(input: CreateChatStreamResponseInput): Response {
  logger.debug('Using AI model', { component: 'api/chat/stream', model: MODEL })

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
              projectSummary: input.projectSummary,
              variant: 'stream',
              appointmentsSummary: input.appointmentsSummary,
            }),
            tools: [{ functionDeclarations: agentTools }],
          },
          history: normalizeHistory(input.chatHistory),
        })

        send({ type: 'start' })

        const initialStream = await chat.sendMessageStream({ message: input.message })
        let pendingFunctionCalls = await streamAndCollect(initialStream, send)

        let round = 0
        while (pendingFunctionCalls.length > 0 && round < MAX_FUNCTION_CALL_ROUNDS) {
          round += 1
          send({ type: 'functionCalls', functionCalls: pendingFunctionCalls, executing: true })

          const functionResponseParts = await executeFunctionCalls(
            pendingFunctionCalls,
            input.supabase,
            input.userId,
            send,
            allUpdatedProjectIds,
          )

          const nextStream = await chat.sendMessageStream({ message: functionResponseParts })
          pendingFunctionCalls = await streamAndCollect(nextStream, send)
        }

        send({
          type: 'done',
          duration: Date.now() - input.requestStartedAt,
          updatedProjectIds: Array.from(allUpdatedProjectIds),
        })

        controller.close()
      } catch (error) {
        logger.error(
          'Chat Stream API stream error',
          {
            component: 'api/chat/stream',
            action: 'streaming',
          },
          error as Error,
        )
        send({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        })
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
}
