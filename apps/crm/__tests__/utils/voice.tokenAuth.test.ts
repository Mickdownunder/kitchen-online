import { authenticateVoiceToken, extractBearerToken, hashVoiceToken } from '@/lib/voice/tokenAuth'

type QueryResult = { data: unknown; error: unknown }

function createTokenClient(selectResult: QueryResult, updateError: unknown = null) {
  const maybeSingle = jest.fn().mockResolvedValue(selectResult)
  const selectEq = jest.fn().mockReturnValue({ maybeSingle })
  const select = jest.fn().mockReturnValue({ eq: selectEq })

  const updateEq = jest.fn().mockResolvedValue({ error: updateError })
  const update = jest.fn().mockReturnValue({ eq: updateEq })

  const from = jest.fn().mockReturnValue({ select, update })

  return {
    client: { from } as never,
    from,
    select,
    selectEq,
    maybeSingle,
    update,
    updateEq,
  }
}

describe('voice token auth', () => {
  beforeEach(() => {
    process.env.VOICE_TOKEN_PEPPER = 'test-pepper'
  })

  it('extracts bearer token', () => {
    const token = extractBearerToken(new Headers({ authorization: 'Bearer abc123' }))
    expect(token).toBe('abc123')
  })

  it('returns null for malformed bearer token', () => {
    const token = extractBearerToken(new Headers({ authorization: 'Basic abc123' }))
    expect(token).toBeNull()
  })

  it('authenticates valid token and updates last_used_at', async () => {
    const rawToken = 'vct_secret_123'
    const tokenHash = hashVoiceToken(rawToken)

    const { client, update } = createTokenClient({
      data: {
        id: 'tok-1',
        user_id: 'user-1',
        company_id: 'company-1',
        token_hash: tokenHash,
        scopes: ['voice_capture'],
        expires_at: '2099-01-01T00:00:00.000Z',
        revoked_at: null,
      },
      error: null,
    })

    const result = await authenticateVoiceToken(client, rawToken)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('tok-1')
      expect(result.data.companyId).toBe('company-1')
    }
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('rejects revoked tokens', async () => {
    const rawToken = 'vct_secret_revoked'
    const tokenHash = hashVoiceToken(rawToken)

    const { client } = createTokenClient({
      data: {
        id: 'tok-2',
        user_id: 'user-1',
        company_id: 'company-1',
        token_hash: tokenHash,
        scopes: ['voice_capture'],
        expires_at: '2099-01-01T00:00:00.000Z',
        revoked_at: '2026-02-13T10:00:00.000Z',
      },
      error: null,
    })

    const result = await authenticateVoiceToken(client, rawToken)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('FORBIDDEN')
    }
  })

  it('rejects expired tokens', async () => {
    const rawToken = 'vct_secret_expired'
    const tokenHash = hashVoiceToken(rawToken)

    const { client } = createTokenClient({
      data: {
        id: 'tok-3',
        user_id: 'user-1',
        company_id: 'company-1',
        token_hash: tokenHash,
        scopes: ['voice_capture'],
        expires_at: '2020-01-01T00:00:00.000Z',
        revoked_at: null,
      },
      error: null,
    })

    const result = await authenticateVoiceToken(client, rawToken)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('FORBIDDEN')
    }
  })

  it('rejects token without voice_capture scope', async () => {
    const rawToken = 'vct_secret_scope'
    const tokenHash = hashVoiceToken(rawToken)

    const { client } = createTokenClient({
      data: {
        id: 'tok-4',
        user_id: 'user-1',
        company_id: 'company-1',
        token_hash: tokenHash,
        scopes: ['other_scope'],
        expires_at: '2099-01-01T00:00:00.000Z',
        revoked_at: null,
      },
      error: null,
    })

    const result = await authenticateVoiceToken(client, rawToken)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('FORBIDDEN')
    }
  })
})
