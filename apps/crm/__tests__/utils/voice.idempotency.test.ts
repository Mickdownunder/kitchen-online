import { createOrGetVoiceInboxEntry } from '@/lib/voice/inboxService'

function createInsertBuilder(result: { data: unknown; error: unknown }) {
  const single = jest.fn().mockResolvedValue(result)
  const select = jest.fn().mockReturnValue({ single })
  const insert = jest.fn().mockReturnValue({ select })
  return { insert, select, single }
}

function createLookupBuilder(result: { data: unknown; error: unknown }) {
  const maybeSingle = jest.fn().mockResolvedValue(result)
  const eqSecond = jest.fn().mockReturnValue({ maybeSingle })
  const eqFirst = jest.fn().mockReturnValue({ eq: eqSecond })
  const select = jest.fn().mockReturnValue({ eq: eqFirst })
  return { select, eqFirst, eqSecond, maybeSingle }
}

describe('voice inbox idempotency', () => {
  it('creates a new entry when no duplicate exists', async () => {
    const insertBuilder = createInsertBuilder({
      data: {
        id: 'entry-1',
        company_id: 'company-1',
        user_id: 'user-1',
        token_id: 'token-1',
        source: 'siri_shortcut',
        locale: 'de-AT',
        idempotency_key: 'abc-123',
        input_text: 'Task erstellen',
        context_hints: {},
        status: 'captured',
        intent_version: 'v1',
        intent_payload: {},
        confidence: null,
        execution_action: null,
        execution_result: {},
        error_message: null,
        needs_confirmation_reason: null,
        execution_attempts: 0,
        last_executed_at: null,
        executed_task_id: null,
        executed_appointment_id: null,
        confirmed_by_user_id: null,
        confirmed_at: null,
        discarded_by_user_id: null,
        discarded_at: null,
        created_at: '2026-02-13T10:00:00.000Z',
        updated_at: '2026-02-13T10:00:00.000Z',
      },
      error: null,
    })

    const from = jest.fn().mockReturnValue(insertBuilder)
    const result = await createOrGetVoiceInboxEntry({ from } as never, {
      companyId: 'company-1',
      userId: 'user-1',
      tokenId: 'token-1',
      source: 'siri_shortcut',
      locale: 'de-AT',
      idempotencyKey: 'abc-123',
      inputText: 'Task erstellen',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.created).toBe(true)
      expect(result.data.entry.id).toBe('entry-1')
    }
  })

  it('returns existing entry for duplicate idempotency key', async () => {
    const insertBuilder = createInsertBuilder({
      data: null,
      error: { code: '23505', message: 'duplicate key' },
    })
    const lookupBuilder = createLookupBuilder({
      data: {
        id: 'entry-existing',
        company_id: 'company-1',
        user_id: 'user-1',
        token_id: 'token-1',
        source: 'siri_shortcut',
        locale: null,
        idempotency_key: 'abc-123',
        input_text: 'Task bereits da',
        context_hints: {},
        status: 'executed',
        intent_version: 'v1',
        intent_payload: {},
        confidence: 0.92,
        execution_action: 'create_task',
        execution_result: {},
        error_message: null,
        needs_confirmation_reason: null,
        execution_attempts: 1,
        last_executed_at: null,
        executed_task_id: 'task-1',
        executed_appointment_id: null,
        confirmed_by_user_id: null,
        confirmed_at: null,
        discarded_by_user_id: null,
        discarded_at: null,
        created_at: '2026-02-13T10:00:00.000Z',
        updated_at: '2026-02-13T10:00:00.000Z',
      },
      error: null,
    })

    const from = jest
      .fn()
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValueOnce(lookupBuilder)

    const result = await createOrGetVoiceInboxEntry({ from } as never, {
      companyId: 'company-1',
      userId: 'user-1',
      tokenId: 'token-1',
      source: 'siri_shortcut',
      idempotencyKey: 'abc-123',
      inputText: 'Task bereits da',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.created).toBe(false)
      expect(result.data.entry.id).toBe('entry-existing')
      expect(result.data.entry.status).toBe('executed')
    }
  })

  it('returns internal error for non-duplicate insert failures', async () => {
    const insertBuilder = createInsertBuilder({
      data: null,
      error: { code: 'XX000', message: 'db down' },
    })

    const from = jest.fn().mockReturnValue(insertBuilder)
    const result = await createOrGetVoiceInboxEntry({ from } as never, {
      companyId: 'company-1',
      userId: 'user-1',
      source: 'siri_shortcut',
      idempotencyKey: 'abc-123',
      inputText: 'Task',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL')
    }
  })
})
