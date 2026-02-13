import { VoiceCaptureRequestSchema, type VoiceCaptureRequest } from './schema'

export type ParseVoiceCaptureRequestResult =
  | {
      ok: true
      data: VoiceCaptureRequest
    }
  | {
      ok: false
      message: string
    }

export function parseVoiceCaptureRequest(body: unknown): ParseVoiceCaptureRequestResult {
  const parsed = VoiceCaptureRequestSchema.safeParse(body)
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || 'Ungültiger Request-Body.',
    }
  }

  return {
    ok: true,
    data: parsed.data,
  }
}
