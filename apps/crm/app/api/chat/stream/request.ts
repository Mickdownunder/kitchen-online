import type { CustomerProject } from '@/types'
import type { ChatHistoryEntry, ParseChatStreamRequestResult } from './types'

const MAX_MESSAGE_LENGTH = 10_000
const MAX_PROJECTS = 500

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

  const message = typeof body.message === 'string' ? body.message : ''
  const projects = Array.isArray(body.projects) ? (body.projects as CustomerProject[]) : []
  const chatHistory = parseChatHistory(body.chatHistory)

  if (message.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      kind: 'validation',
      message: 'Message exceeds maximum length',
    }
  }

  if (projects.length > MAX_PROJECTS) {
    return {
      ok: false,
      kind: 'validation',
      message: 'Projects exceed maximum allowed count',
    }
  }

  return {
    ok: true,
    bodySizeMB: bodyText.length / (1024 * 1024),
    data: {
      message,
      projects,
      chatHistory,
    },
  }
}
