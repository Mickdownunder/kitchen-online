import type { CustomerProject } from '@/types'
import { ChatRequestSchema } from './schema'

export interface ParsedChatRequest {
  message: string
  projects: CustomerProject[]
}

export type ParseChatRequestResult =
  | {
      ok: true
      data: ParsedChatRequest
    }
  | {
      ok: false
      kind: 'validation'
      message: string
    }

export function parseChatRequest(body: unknown): ParseChatRequestResult {
  const parsedBody =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {}

  const parsed = ChatRequestSchema.safeParse(parsedBody)
  if (!parsed.success) {
    return {
      ok: false,
      kind: 'validation',
      message: parsed.error.issues[0]?.message || 'Invalid chat request payload',
    }
  }

  return {
    ok: true,
    data: {
      message: parsed.data.message,
      projects: parsed.data.projects as unknown as CustomerProject[],
    },
  }
}
