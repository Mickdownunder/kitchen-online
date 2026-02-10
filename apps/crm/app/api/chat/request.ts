import type { CustomerProject } from '@/types'

const MAX_MESSAGE_LENGTH = 10_000
const MAX_PROJECTS = 500

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

  const message = typeof parsedBody.message === 'string' ? parsedBody.message : ''
  const projects = Array.isArray(parsedBody.projects) ? (parsedBody.projects as CustomerProject[]) : []

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
    data: {
      message,
      projects,
    },
  }
}
