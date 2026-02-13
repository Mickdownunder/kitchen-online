import { NextRequest } from 'next/server'

const mockCreateServiceClient = jest.fn()
const mockAuthenticateVoiceBearerToken = jest.fn()
const mockRateLimit = jest.fn()
const mockGetCompanyIdForUser = jest.fn()
const mockGetCompanySettingsById = jest.fn()
const mockParseVoiceCaptureRequest = jest.fn()
const mockCreateOrGetVoiceInboxEntry = jest.fn()
const mockUpdateVoiceInboxEntry = jest.fn()
const mockParseVoiceIntent = jest.fn()
const mockExecuteVoiceIntent = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: (...args: unknown[]) => mockCreateServiceClient(...args),
}))

jest.mock('@/lib/voice/tokenAuth', () => ({
  authenticateVoiceBearerToken: (...args: unknown[]) => mockAuthenticateVoiceBearerToken(...args),
}))

jest.mock('@/lib/middleware/rateLimit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}))

jest.mock('@/lib/supabase/services/company', () => ({
  getCompanyIdForUser: (...args: unknown[]) => mockGetCompanyIdForUser(...args),
  getCompanySettingsById: (...args: unknown[]) => mockGetCompanySettingsById(...args),
}))

jest.mock('@/app/api/voice/capture/request', () => ({
  parseVoiceCaptureRequest: (...args: unknown[]) => mockParseVoiceCaptureRequest(...args),
}))

jest.mock('@/lib/voice/inboxService', () => ({
  createOrGetVoiceInboxEntry: (...args: unknown[]) => mockCreateOrGetVoiceInboxEntry(...args),
  updateVoiceInboxEntry: (...args: unknown[]) => mockUpdateVoiceInboxEntry(...args),
}))

jest.mock('@/lib/voice/intentParser', () => ({
  parseVoiceIntent: (...args: unknown[]) => mockParseVoiceIntent(...args),
}))

jest.mock('@/lib/voice/executeVoiceIntent', () => ({
  executeVoiceIntent: (...args: unknown[]) => mockExecuteVoiceIntent(...args),
}))

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    api: jest.fn().mockReturnValue({
      start: jest.fn().mockReturnValue(Date.now()),
      end: jest.fn(),
      error: jest.fn(),
    }),
  },
}))

import { POST } from '@/app/api/voice/capture/route'

function buildRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/voice/capture', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer vct_test',
    },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  mockCreateServiceClient.mockReset().mockResolvedValue({})
  mockAuthenticateVoiceBearerToken.mockReset()
  mockRateLimit.mockReset().mockResolvedValue({ allowed: true, remaining: 9, resetTime: Date.now() + 60_000 })
  mockGetCompanyIdForUser.mockReset().mockResolvedValue('company-1')
  mockGetCompanySettingsById.mockReset().mockResolvedValue({
    id: 'company-1',
    voiceCaptureEnabled: true,
    voiceAutoExecuteEnabled: true,
  })
  mockParseVoiceCaptureRequest.mockReset().mockReturnValue({
    ok: true,
    data: {
      text: 'Bitte Aufgabe erstellen',
      idempotencyKey: 'idem-12345',
      source: 'siri_shortcut',
      locale: 'de-AT',
      contextHints: {},
    },
  })
  mockCreateOrGetVoiceInboxEntry.mockReset().mockResolvedValue({
    ok: true,
    data: {
      created: true,
      entry: {
        id: 'entry-1',
        userId: 'user-1',
        executionAttempts: 0,
        status: 'captured',
      },
    },
  })
  mockUpdateVoiceInboxEntry.mockReset().mockResolvedValue({
    ok: true,
    data: {
      id: 'entry-1',
      executionAttempts: 1,
      status: 'executed',
      executedTaskId: 'task-1',
      executedAppointmentId: undefined,
    },
  })
  mockParseVoiceIntent.mockReset().mockResolvedValue({
    ok: true,
    intent: {
      version: 'v1',
      action: 'create_task',
      summary: 'Task erstellen',
      confidence: 0.91,
      confidenceLevel: 'high',
      task: { title: 'Anruf bei Kunde' },
    },
  })
  mockExecuteVoiceIntent.mockReset().mockResolvedValue({
    status: 'executed',
    action: 'create_task',
    message: 'Task wurde erstellt.',
    confidence: 0.91,
    confidenceLevel: 'high',
    taskId: 'task-1',
  })
})

describe('POST /api/voice/capture', () => {
  it('returns 401 when bearer token auth fails', async () => {
    mockAuthenticateVoiceBearerToken.mockResolvedValue({
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'invalid',
    })

    const response = await POST(buildRequest({ text: 'x' }))
    expect(response.status).toBe(401)
  })

  it('returns executed response for successful flow', async () => {
    mockAuthenticateVoiceBearerToken.mockResolvedValue({
      ok: true,
      data: {
        id: 'token-1',
        userId: 'user-1',
        companyId: 'company-1',
      },
    })

    const response = await POST(buildRequest({ text: 'x' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.status).toBe('executed')
    expect(body.taskId).toBe('task-1')
  })

  it('returns existing result for idempotent duplicate request', async () => {
    mockAuthenticateVoiceBearerToken.mockResolvedValue({
      ok: true,
      data: {
        id: 'token-1',
        userId: 'user-1',
        companyId: 'company-1',
      },
    })

    mockCreateOrGetVoiceInboxEntry.mockResolvedValue({
      ok: true,
      data: {
        created: false,
        entry: {
          id: 'entry-existing',
          status: 'executed',
          executedTaskId: 'task-existing',
          executedAppointmentId: undefined,
        },
      },
    })

    const response = await POST(buildRequest({ text: 'x' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.idempotent).toBe(true)
    expect(body.status).toBe('executed')
    expect(body.taskId).toBe('task-existing')
    expect(mockParseVoiceIntent).not.toHaveBeenCalled()
  })
})
