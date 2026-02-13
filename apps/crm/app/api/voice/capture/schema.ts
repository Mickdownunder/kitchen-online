import { z } from 'zod'

export const VoiceCaptureRequestSchema = z.object({
  text: z.string().min(1).max(4000),
  idempotencyKey: z.string().min(8).max(160).regex(/^[a-zA-Z0-9._:-]+$/),
  source: z.enum(['siri_shortcut', 'mobile_app', 'web', 'system']).optional(),
  locale: z.string().min(2).max(20).optional(),
  contextHints: z.record(z.unknown()).optional(),
}).strict()

export type VoiceCaptureRequest = z.infer<typeof VoiceCaptureRequestSchema>
