const mockCreateTaskForCompany = jest.fn()
const mockCreateAppointmentForCompany = jest.fn()
const mockMatchProjectByHint = jest.fn()
const mockMatchCustomerByHint = jest.fn()

jest.mock('@/lib/supabase/services/tasks', () => ({
  createTaskForCompany: (...args: unknown[]) => mockCreateTaskForCompany(...args),
}))

jest.mock('@/lib/supabase/services/appointments', () => ({
  createAppointmentForCompany: (...args: unknown[]) => mockCreateAppointmentForCompany(...args),
}))

jest.mock('@/lib/voice/entityMatcher', () => ({
  matchProjectByHint: (...args: unknown[]) => mockMatchProjectByHint(...args),
  matchCustomerByHint: (...args: unknown[]) => mockMatchCustomerByHint(...args),
}))

import { executeVoiceIntent } from '@/lib/voice/executeVoiceIntent'
import type { VoiceIntentPayload } from '@/types'

const baseTaskIntent: VoiceIntentPayload = {
  version: 'v1',
  action: 'create_task',
  summary: 'Task erstellen',
  confidence: 0.91,
  confidenceLevel: 'high',
  task: {
    title: 'Angebot nachfassen',
    description: 'Bitte bei Kunde anrufen',
    priority: 'normal',
  },
}

beforeEach(() => {
  mockCreateTaskForCompany.mockReset()
  mockCreateAppointmentForCompany.mockReset()
  mockMatchProjectByHint.mockReset()
  mockMatchCustomerByHint.mockReset()

  mockMatchProjectByHint.mockResolvedValue({ ok: true, data: { bestId: undefined, confidence: 0, candidates: [] } })
  mockMatchCustomerByHint.mockResolvedValue({ ok: true, data: { bestId: undefined, confidence: 0, candidates: [] } })
})

describe('executeVoiceIntent', () => {
  it('returns needs_confirmation when auto execute is disabled', async () => {
    const result = await executeVoiceIntent({
      client: {} as never,
      companyId: 'company-1',
      userId: 'user-1',
      intent: baseTaskIntent,
      autoExecuteEnabled: false,
    })

    expect(result.status).toBe('needs_confirmation')
    expect(result.needsConfirmationReason).toBe('auto_execute_disabled')
  })

  it('returns needs_confirmation for medium confidence intent', async () => {
    const result = await executeVoiceIntent({
      client: {} as never,
      companyId: 'company-1',
      userId: 'user-1',
      intent: {
        ...baseTaskIntent,
        confidence: 0.7,
        confidenceLevel: 'medium',
      },
      autoExecuteEnabled: true,
    })

    expect(result.status).toBe('needs_confirmation')
    expect(result.needsConfirmationReason).toBe('confidence_not_high')
  })

  it('returns needs_confirmation when project match is ambiguous', async () => {
    mockMatchProjectByHint.mockResolvedValue({
      ok: true,
      data: {
        bestId: 'project-1',
        confidence: 0.5,
        candidates: [{ id: 'project-1', label: 'K-1', score: 0.5 }],
      },
    })

    const result = await executeVoiceIntent({
      client: {} as never,
      companyId: 'company-1',
      userId: 'user-1',
      intent: {
        ...baseTaskIntent,
        task: {
          ...baseTaskIntent.task!,
          projectHint: 'K-2026-1001',
        },
      },
      autoExecuteEnabled: true,
    })

    expect(result.status).toBe('needs_confirmation')
    expect(result.needsConfirmationReason).toBe('project_match_ambiguous')
  })

  it('executes task creation on high confidence', async () => {
    mockCreateTaskForCompany.mockResolvedValue({
      ok: true,
      data: {
        id: 'task-1',
        projectId: undefined,
      },
    })

    const result = await executeVoiceIntent({
      client: {} as never,
      companyId: 'company-1',
      userId: 'user-1',
      intent: baseTaskIntent,
      autoExecuteEnabled: true,
    })

    expect(result.status).toBe('executed')
    expect(result.taskId).toBe('task-1')
  })

  it('returns failed when task service returns error', async () => {
    mockCreateTaskForCompany.mockResolvedValue({
      ok: false,
      code: 'INTERNAL',
      message: 'DB error',
    })

    const result = await executeVoiceIntent({
      client: {} as never,
      companyId: 'company-1',
      userId: 'user-1',
      intent: baseTaskIntent,
      autoExecuteEnabled: true,
    })

    expect(result.status).toBe('failed')
    expect(result.message).toBe('DB error')
  })

  it('executes appointment creation when forceExecute is true', async () => {
    mockCreateAppointmentForCompany.mockResolvedValue({ id: 'apt-1' })

    const result = await executeVoiceIntent({
      client: {} as never,
      companyId: 'company-1',
      userId: 'user-1',
      intent: {
        version: 'v1',
        action: 'create_appointment',
        summary: 'Termin erstellen',
        confidence: 0.62,
        confidenceLevel: 'medium',
        appointment: {
          customerName: 'Kunde Test',
          date: '2026-03-12',
          time: '10:30',
          type: 'Consultation',
        },
      },
      autoExecuteEnabled: false,
      forceExecute: true,
    })

    expect(result.status).toBe('executed')
    expect(result.appointmentId).toBe('apt-1')
  })
})
