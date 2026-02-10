import type { CustomerProject } from '@/types'

export interface ChatHistoryEntry {
  role: string
  content: string
}

export interface ParsedChatStreamRequest {
  message: string
  projects: CustomerProject[]
  chatHistory: ChatHistoryEntry[]
}

export type ParseChatStreamRequestResult =
  | {
      ok: true
      data: ParsedChatStreamRequest
      bodySizeMB: number
    }
  | {
      ok: false
      kind: 'parse' | 'validation'
      message: string
    }
