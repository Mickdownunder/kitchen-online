import { fail, ok, type ServiceResult } from '@/lib/types/service'
import type { CreatedVoiceApiToken, VoiceApiToken } from '@/types'
import { buildTokenPrefix, generateVoiceTokenSecret, hashVoiceToken } from './tokenAuth'
import type { VoiceDbClient } from './types'

interface VoiceApiTokenRow {
  id: string
  company_id: string
  user_id: string
  label: string
  token_prefix: string
  scopes: string[] | null
  last_used_at: string | null
  expires_at: string
  revoked_at: string | null
  revoked_by_user_id: string | null
  created_at: string
  updated_at: string
}

function mapVoiceToken(row: VoiceApiTokenRow): VoiceApiToken {
  return {
    id: row.id,
    companyId: row.company_id,
    userId: row.user_id,
    label: row.label,
    tokenPrefix: row.token_prefix,
    scopes: Array.isArray(row.scopes) ? row.scopes : [],
    lastUsedAt: row.last_used_at || undefined,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at || undefined,
    revokedByUserId: row.revoked_by_user_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listVoiceApiTokensForCompany(
  client: VoiceDbClient,
  companyId: string,
): Promise<ServiceResult<VoiceApiToken[]>> {
  const { data, error } = await client
    .from('voice_api_tokens')
    .select('id, company_id, user_id, label, token_prefix, scopes, last_used_at, expires_at, revoked_at, revoked_by_user_id, created_at, updated_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) {
    return fail('INTERNAL', error.message || 'Voice-Tokens konnten nicht geladen werden.', error)
  }

  return ok(((data || []) as VoiceApiTokenRow[]).map(mapVoiceToken))
}

export async function createVoiceApiToken(input: {
  client: VoiceDbClient
  companyId: string
  userId: string
  label: string
  expiresAt: string
  scopes?: string[]
}): Promise<ServiceResult<CreatedVoiceApiToken>> {
  const normalizedLabel = input.label.trim()
  if (!normalizedLabel) {
    return fail('VALIDATION', 'Token-Label ist erforderlich.')
  }

  const secret = generateVoiceTokenSecret()
  const tokenHash = hashVoiceToken(secret)
  const tokenPrefix = buildTokenPrefix(secret)

  const { data, error } = await input.client
    .from('voice_api_tokens')
    .insert({
      company_id: input.companyId,
      user_id: input.userId,
      label: normalizedLabel,
      token_prefix: tokenPrefix,
      token_hash: tokenHash,
      scopes: input.scopes && input.scopes.length > 0 ? input.scopes : ['voice_capture'],
      expires_at: input.expiresAt,
    })
    .select('id, company_id, user_id, label, token_prefix, scopes, last_used_at, expires_at, revoked_at, revoked_by_user_id, created_at, updated_at')
    .single()

  if (error) {
    return fail('INTERNAL', error.message || 'Voice-Token konnte nicht erstellt werden.', error)
  }

  return ok({
    token: mapVoiceToken(data as VoiceApiTokenRow),
    secret,
  })
}

export async function revokeVoiceApiToken(input: {
  client: VoiceDbClient
  companyId: string
  tokenId: string
  revokedByUserId: string
}): Promise<ServiceResult<VoiceApiToken>> {
  const { data, error } = await input.client
    .from('voice_api_tokens')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by_user_id: input.revokedByUserId,
    })
    .eq('id', input.tokenId)
    .eq('company_id', input.companyId)
    .select('id, company_id, user_id, label, token_prefix, scopes, last_used_at, expires_at, revoked_at, revoked_by_user_id, created_at, updated_at')
    .single()

  if (error) {
    const code = (error as { code?: string }).code
    if (code === 'PGRST116') {
      return fail('NOT_FOUND', 'Token wurde nicht gefunden.')
    }
    return fail('INTERNAL', error.message || 'Token konnte nicht widerrufen werden.', error)
  }

  return ok(mapVoiceToken(data as VoiceApiTokenRow))
}
