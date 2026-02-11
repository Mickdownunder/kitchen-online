import {
  GoogleGenAI,
  createPartFromFunctionResponse,
  type GenerateContentResponse,
  type PartListUnion,
} from '@google/genai'
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
  /** Gemini 3: required when sending function response back; from stream or use dummy. */
  thoughtSignature?: string
}

/** History must start with a user turn (Gemini API requirement). */
function normalizeHistory(
  chatHistory: ChatHistoryEntry[],
): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
  const mapped: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = chatHistory.map((message) => {
    const role = message.role === 'user' ? 'user' : 'model'
    return {
      role,
      parts: [{ text: message.content }],
    }
  })
  // Drop leading model messages so the first turn is always user
  let start = 0
  while (start < mapped.length && mapped[start].role === 'model') {
    start += 1
  }
  return mapped.slice(start)
}

/** Extract thoughtSignature from a raw part (Gemini 3 may send camelCase or snake_case). */
function thoughtSignatureFromPart(part: Record<string, unknown>): string | undefined {
  const v = part?.thoughtSignature ?? part?.thought_signature
  return typeof v === 'string' && v.length > 0 ? v : undefined
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

    // Prefer raw parts so we get thoughtSignature from the same part as functionCall (Gemini 3)
    const chunkRecord = chunk as unknown as Record<string, unknown>
    const candidates = chunkRecord.candidates as Array<Record<string, unknown>> | undefined
    const firstCandidate = candidates?.[0]
    const content = firstCandidate?.content as Record<string, unknown> | undefined
    const rawParts = content?.parts as Array<Record<string, unknown>> | undefined
    const sigsByIndex: (string | undefined)[] = []
    rawParts?.forEach((p) => {
      if (p?.functionCall) {
        sigsByIndex.push(thoughtSignatureFromPart(p))
      }
    })

    if (chunk.functionCalls?.length) {
      for (let i = 0; i < chunk.functionCalls.length; i += 1) {
        const functionCall = chunk.functionCalls[i]
        const raw = functionCall as typeof functionCall & { thoughtSignature?: string; thought_signature?: string }
        const fromPart = sigsByIndex[i]
        collectedFunctionCalls.push({
          id:
            functionCall.id ||
            `fc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: functionCall.name || 'unknown',
          args: (functionCall.args || {}) as Record<string, unknown>,
          thoughtSignature:
            raw.thoughtSignature ??
            raw.thought_signature ??
            fromPart,
        })
      }
    }
  }

  return collectedFunctionCalls
}

/** Dummy thought_signature when stream does not provide one (Gemini 3 requirement). */
const THOUGHT_SIGNATURE_SKIP = 'skip_thought_signature_validator'

async function executeFunctionCalls(
  functionCalls: FunctionCallInfo[],
  supabase: SupabaseClient,
  userId: string,
  send: (data: Record<string, unknown>) => void,
  allUpdatedProjectIds: Set<string>,
): Promise<unknown[]> {
  const parts: unknown[] = []

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

    // Gemini 3: functionCall part must include thought_signature or API returns 400.
    // Set signature as sibling and inside functionCall so it is not dropped by SDK serialization.
    const signature =
      functionCall.thoughtSignature ?? THOUGHT_SIGNATURE_SKIP
    parts.push({
      functionCall: {
        id: functionCall.id,
        name: functionCall.name,
        args: functionCall.args,
        thought_signature: signature,
        thoughtSignature: signature,
      },
      thoughtSignature: signature,
      thought_signature: signature,
    })
    parts.push(
      createPartFromFunctionResponse(functionCall.id, functionCall.name, {
        result: handlerResult.result,
      }),
    )
  }

  return parts
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

          const nextMessageParts = await executeFunctionCalls(
            pendingFunctionCalls,
            input.supabase,
            input.userId,
            send,
            allUpdatedProjectIds,
          )
          const nextStream = await chat.sendMessageStream({
            message: nextMessageParts as unknown as PartListUnion,
          })
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
