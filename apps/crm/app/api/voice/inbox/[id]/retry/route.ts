import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { Json } from '@/types/database.types'
import { apiErrors } from '@/lib/utils/errorHandling'
import { executeVoiceIntent } from '@/lib/voice/executeVoiceIntent'
import { getVoiceInboxEntryById, updateVoiceInboxEntry } from '@/lib/voice/inboxService'
import { parseVoiceIntent } from '@/lib/voice/intentParser'
import { VoiceIntentSchema } from '@/lib/voice/intentSchema'
import { requireVoiceRouteAccess } from '@/lib/voice/routeAccess'

const RetrySchema = z.object({
  editedText: z.string().min(1).max(4000).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const access = await requireVoiceRouteAccess({ request, requireInboxPermission: true })
    if (access instanceof Response) {
      return access
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const parsedBody = RetrySchema.safeParse(body)
    if (!parsedBody.success) {
      return apiErrors.validation({
        component: 'api/voice/inbox/retry',
        validationMessage: parsedBody.error.issues[0]?.message || 'Ungültiger Body.',
      })
    }

    const entryResult = await getVoiceInboxEntryById(access.serviceSupabase, access.companyId, id)
    if (!entryResult.ok) {
      if (entryResult.code === 'NOT_FOUND') {
        return apiErrors.notFound({ component: 'api/voice/inbox/retry', id })
      }
      return apiErrors.internal(new Error(entryResult.message), { component: 'api/voice/inbox/retry' })
    }

    const entry = entryResult.data

    let intentResult:
      | Awaited<ReturnType<typeof parseVoiceIntent>>
      | {
          ok: true
          intent: z.infer<typeof VoiceIntentSchema>
          raw: Record<string, unknown>
        }

    if (parsedBody.data.editedText) {
      intentResult = await parseVoiceIntent({
        text: parsedBody.data.editedText,
        locale: entry.locale,
        contextHints: entry.contextHints,
      })
    } else {
      const parsedStored = VoiceIntentSchema.safeParse(entry.intentPayload || {})
      if (parsedStored.success) {
        intentResult = {
          ok: true,
          intent: parsedStored.data,
          raw: { source: 'stored_intent' },
        }
      } else {
        intentResult = await parseVoiceIntent({
          text: entry.inputText,
          locale: entry.locale,
          contextHints: entry.contextHints,
        })
      }
    }

    if (!intentResult.ok) {
      const failedUpdate = await updateVoiceInboxEntry(access.serviceSupabase, access.companyId, id, {
        status: 'needs_confirmation',
        error_message: intentResult.message,
        needs_confirmation_reason: 'intent_parse_failed',
      })

      if (!failedUpdate.ok) {
        return apiErrors.internal(new Error(failedUpdate.message), { component: 'api/voice/inbox/retry' })
      }

      return NextResponse.json({
        success: true,
        data: failedUpdate.data,
      })
    }

    const executionResult = await executeVoiceIntent({
      client: access.serviceSupabase,
      companyId: access.companyId,
      userId: entry.userId,
      intent: intentResult.intent,
      autoExecuteEnabled: Boolean(access.companySettings?.voiceAutoExecuteEnabled),
    })

    const nowIso = new Date().toISOString()
    const executionAttempts = (entry.executionAttempts || 0) + 1

    const updateResult = await updateVoiceInboxEntry(access.serviceSupabase, access.companyId, id, {
      input_text: parsedBody.data.editedText || entry.inputText,
      intent_version: intentResult.intent.version,
      intent_payload: intentResult.intent as unknown as Json,
      confidence: executionResult.confidence,
      execution_action: executionResult.action,
      execution_result: (executionResult.details || {}) as Json,
      execution_attempts: executionAttempts,
      last_executed_at: nowIso,
      needs_confirmation_reason:
        executionResult.status === 'needs_confirmation'
          ? executionResult.needsConfirmationReason || 'manual_confirmation_required'
          : null,
      error_message: executionResult.status === 'failed' ? executionResult.message : null,
      status:
        executionResult.status === 'executed'
          ? 'executed'
          : executionResult.status === 'failed'
            ? 'failed'
            : 'needs_confirmation',
      executed_task_id: executionResult.taskId || null,
      executed_appointment_id: executionResult.appointmentId || null,
    })

    if (!updateResult.ok) {
      return apiErrors.internal(new Error(updateResult.message), { component: 'api/voice/inbox/retry' })
    }

    return NextResponse.json({
      success: true,
      data: updateResult.data,
      execution: executionResult,
    })
  } catch (error) {
    return apiErrors.internal(error as Error, { component: 'api/voice/inbox/retry' })
  }
}
