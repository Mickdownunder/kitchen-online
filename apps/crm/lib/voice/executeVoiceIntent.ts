import { createAppointmentForCompany } from '@/lib/supabase/services/appointments'
import { createTaskForCompany } from '@/lib/supabase/services/tasks'
import type { VoiceIntentPayload } from '@/types'
import { matchCustomerByHint, matchProjectByHint } from './entityMatcher'
import type { VoiceDbClient, VoiceExecutionResult } from './types'

function voiceTimestamp(): string {
  return new Date().toLocaleDateString('de-DE')
}

async function appendProjectNoteFromVoice(
  client: VoiceDbClient,
  projectId: string,
  note: string,
): Promise<{ ok: boolean; message?: string }> {
  const { data: project, error: selectError } = await client
    .from('projects')
    .select('notes')
    .eq('id', projectId)
    .single()

  if (selectError || !project) {
    return { ok: false, message: selectError?.message || 'Projekt nicht gefunden.' }
  }

  const existingNotes = (project.notes as string) || ''
  const { error: updateError } = await client
    .from('projects')
    .update({ notes: `${existingNotes}\n${voiceTimestamp()}: ${note}` })
    .eq('id', projectId)

  if (updateError) {
    return { ok: false, message: updateError.message }
  }
  return { ok: true }
}

function needsConfirmation(
  intent: VoiceIntentPayload,
  reason: string,
  details?: Record<string, unknown>,
): VoiceExecutionResult {
  return {
    status: 'needs_confirmation',
    action: intent.action,
    message: 'Bestätigung erforderlich.',
    confidence: intent.confidence,
    confidenceLevel: intent.confidenceLevel,
    needsConfirmationReason: reason,
    details,
  }
}

function failed(
  intent: VoiceIntentPayload,
  message: string,
  details?: Record<string, unknown>,
): VoiceExecutionResult {
  return {
    status: 'failed',
    action: intent.action,
    message,
    confidence: intent.confidence,
    confidenceLevel: intent.confidenceLevel,
    details,
  }
}

export async function executeVoiceIntent(input: {
  client: VoiceDbClient
  companyId: string
  userId: string
  intent: VoiceIntentPayload
  autoExecuteEnabled: boolean
  forceExecute?: boolean
}): Promise<VoiceExecutionResult> {
  const { client, companyId, userId, intent, autoExecuteEnabled, forceExecute } = input

  if (!forceExecute && !autoExecuteEnabled) {
    return needsConfirmation(intent, 'auto_execute_disabled')
  }

  if (!forceExecute && intent.confidenceLevel !== 'high') {
    return needsConfirmation(intent, 'confidence_not_high')
  }

  if (intent.action === 'create_task') {
    const task = intent.task
    if (!task || !task.title.trim()) {
      return failed(intent, 'Task-Titel fehlt.')
    }

    let projectId: string | undefined

    if (task.projectHint && task.projectHint.trim().length > 0) {
      const projectMatch = await matchProjectByHint(client, companyId, task.projectHint)
      if (!projectMatch.ok) {
        return failed(intent, projectMatch.message)
      }

      if (!projectMatch.data.bestId || projectMatch.data.confidence < 0.75) {
        return needsConfirmation(intent, 'project_match_ambiguous', {
          projectHint: task.projectHint,
          candidates: projectMatch.data.candidates,
        })
      }

      projectId = projectMatch.data.bestId
    }

    if (task.customerHint && task.customerHint.trim().length > 0) {
      const customerMatch = await matchCustomerByHint(client, companyId, task.customerHint)
      if (!customerMatch.ok) {
        return failed(intent, customerMatch.message)
      }

      if (!customerMatch.data.bestId || customerMatch.data.confidence < 0.7) {
        return needsConfirmation(intent, 'customer_match_ambiguous', {
          customerHint: task.customerHint,
          candidates: customerMatch.data.candidates,
        })
      }
    }

    const taskResult = await createTaskForCompany(client, {
      companyId,
      userId,
      title: task.title,
      description: task.description,
      dueAt: task.dueAt,
      priority: task.priority || 'normal',
      source: 'voice',
      projectId,
      metadata: {
        intentAction: intent.action,
        intentSummary: intent.summary,
      },
    })

    if (!taskResult.ok) {
      return failed(intent, taskResult.message)
    }

    return {
      status: 'executed',
      action: intent.action,
      message: 'Task wurde erstellt.',
      confidence: intent.confidence,
      confidenceLevel: intent.confidenceLevel,
      taskId: taskResult.data.id,
      projectId: taskResult.data.projectId,
    }
  }

  if (intent.action === 'create_appointment') {
    const appointment = intent.appointment
    if (!appointment) {
      return failed(intent, 'Termin-Payload fehlt.')
    }

    if (!appointment.customerName.trim() || !appointment.date) {
      return needsConfirmation(intent, 'appointment_fields_missing')
    }

    try {
      const appointmentResult = await createAppointmentForCompany(client, {
        userId,
        companyId,
        appointment: {
          customerName: appointment.customerName,
          date: appointment.date,
          time: appointment.time,
          type: appointment.type,
          notes: appointment.notes,
          phone: appointment.phone,
        },
      })

      return {
        status: 'executed',
        action: intent.action,
        message: 'Termin wurde erstellt.',
        confidence: intent.confidence,
        confidenceLevel: intent.confidenceLevel,
        appointmentId: appointmentResult.id,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Termin konnte nicht erstellt werden.'
      return failed(intent, message)
    }
  }

  if (intent.action === 'add_project_note') {
    const projectNote = intent.projectNote
    if (!projectNote || !projectNote.projectHint?.trim() || !projectNote.note?.trim()) {
      return failed(intent, 'Projekt-Hinweis oder Notiztext fehlt.')
    }

    const projectMatch = await matchProjectByHint(client, companyId, projectNote.projectHint)
    if (!projectMatch.ok) {
      return failed(intent, projectMatch.message)
    }

    if (!projectMatch.data.bestId || projectMatch.data.confidence < 0.75) {
      return needsConfirmation(intent, 'project_match_ambiguous', {
        projectHint: projectNote.projectHint,
        candidates: projectMatch.data.candidates,
      })
    }

    const appendResult = await appendProjectNoteFromVoice(
      client,
      projectMatch.data.bestId,
      projectNote.note.trim(),
    )

    if (!appendResult.ok) {
      return failed(intent, appendResult.message || 'Notiz konnte nicht angehängt werden.')
    }

    return {
      status: 'executed',
      action: intent.action,
      message: 'Notiz am Projekt wurde hinzugefügt.',
      confidence: intent.confidence,
      confidenceLevel: intent.confidenceLevel,
      projectId: projectMatch.data.bestId,
    }
  }

  return failed(intent, `Nicht unterstützte Aktion: ${intent.action}`)
}
