import type { CustomerProject } from '@/types'
import { ChatRequestSchema } from '../schema'
import type { ChatHistoryEntry, ParseChatStreamRequestResult } from './types'

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function parseChatHistory(value: unknown): ChatHistoryEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      const entry = asObject(item)
      if (!entry) {
        return null
      }

      return {
        role: typeof entry.role === 'string' ? entry.role : 'model',
        content: typeof entry.content === 'string' ? entry.content : '',
      }
    })
    .filter((entry): entry is ChatHistoryEntry => entry !== null)
}

export function parseChatStreamRequest(bodyText: string): ParseChatStreamRequestResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(bodyText)
  } catch (error) {
    return {
      ok: false,
      kind: 'parse',
      message: error instanceof Error ? error.message : 'Unknown parse error',
    }
  }

  const body = asObject(parsed)
  if (!body) {
    return {
      ok: false,
      kind: 'parse',
      message: 'Request body must be a JSON object',
    }
  }

  const requestValidation = ChatRequestSchema.safeParse({
    message: body.message,
    projects: body.projects,
  })

  if (!requestValidation.success) {
    return {
      ok: false,
      kind: 'validation',
      message: requestValidation.error.issues[0]?.message || 'Invalid chat request payload',
    }
  }

  const chatHistory = parseChatHistory(body.chatHistory)

  return {
    ok: true,
    bodySizeMB: bodyText.length / (1024 * 1024),
    data: {
      message: requestValidation.data.message,
      projects: requestValidation.data.projects as unknown as CustomerProject[],
      chatHistory,
    },
  }
}
