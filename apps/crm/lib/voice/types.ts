import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { VoiceIntentPayload } from '@/types'

export type VoiceDbClient = SupabaseClient<Database>

export type VoiceCaptureSource = 'siri_shortcut' | 'mobile_app' | 'web' | 'system'

export interface VoiceCaptureInput {
  text: string
  idempotencyKey: string
  source?: VoiceCaptureSource
  locale?: string
  contextHints?: Record<string, unknown>
}

export interface VoiceTokenContext {
  id: string
  userId: string
  companyId: string
  scopes: string[]
  expiresAt: string
  revokedAt?: string | null
}

export type VoiceExecutionStatus = 'executed' | 'needs_confirmation' | 'failed'

export interface VoiceExecutionResult {
  status: VoiceExecutionStatus
  action: string
  message: string
  confidence: number
  confidenceLevel: 'high' | 'medium' | 'low'
  taskId?: string
  appointmentId?: string
  projectId?: string
  needsConfirmationReason?: string
  details?: Record<string, unknown>
}

export type VoiceIntentParseResult =
  | {
      ok: true
      intent: VoiceIntentPayload
      raw: Record<string, unknown>
    }
  | {
      ok: false
      message: string
      raw?: Record<string, unknown>
    }
