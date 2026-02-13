import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { fail, ok, type ServiceResult } from '@/lib/types/service'
import { logger } from '@/lib/utils/logger'
import type { VoiceDbClient, VoiceTokenContext } from './types'

interface VoiceTokenRow {
  id: string
  user_id: string
  company_id: string
  token_hash: string
  scopes: string[] | null
  expires_at: string
  revoked_at: string | null
}

const DEFAULT_DEV_PEPPER = 'voice-dev-pepper-change-me'

function getVoiceTokenPepper(): string {
  const pepper = process.env.VOICE_TOKEN_PEPPER?.trim()

  if (pepper) {
    return pepper
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('VOICE_TOKEN_PEPPER is not configured')
  }

  logger.warn('VOICE_TOKEN_PEPPER is not set - using development fallback pepper', {
    component: 'voice-token-auth',
  })
  return DEFAULT_DEV_PEPPER
}

export function extractBearerToken(headers: Headers): string | null {
  const authorization = headers.get('authorization')
  if (!authorization) {
    return null
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    return null
  }

  const token = match[1]?.trim()
  return token && token.length > 0 ? token : null
}

export function hashVoiceToken(secret: string): string {
  const pepper = getVoiceTokenPepper()
  return createHash('sha256').update(`${pepper}:${secret}`).digest('hex')
}

export function generateVoiceTokenSecret(): string {
  return `vct_${randomBytes(32).toString('hex')}`
}

export function buildTokenPrefix(secret: string): string {
  const normalized = secret.trim()
  return normalized.slice(0, 12)
}

function constantTimeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8')
  const rightBuffer = Buffer.from(right, 'utf8')
  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

export async function authenticateVoiceToken(
  client: VoiceDbClient,
  rawToken: string,
): Promise<ServiceResult<VoiceTokenContext>> {
  const token = rawToken.trim()
  if (!token) {
    return fail('UNAUTHORIZED', 'Bearer token fehlt.')
  }

  const hash = hashVoiceToken(token)

  const { data, error } = await client
    .from('voice_api_tokens')
    .select('id, user_id, company_id, token_hash, scopes, expires_at, revoked_at')
    .eq('token_hash', hash)
    .maybeSingle()

  if (error) {
    return fail('INTERNAL', error.message || 'Tokenprüfung fehlgeschlagen.', error)
  }

  if (!data) {
    return fail('UNAUTHORIZED', 'Ungültiger Token.')
  }

  const row = data as VoiceTokenRow

  if (!constantTimeEquals(row.token_hash, hash)) {
    return fail('UNAUTHORIZED', 'Ungültiger Token.')
  }

  if (row.revoked_at) {
    return fail('FORBIDDEN', 'Token wurde widerrufen.')
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return fail('FORBIDDEN', 'Token ist abgelaufen.')
  }

  const scopes = Array.isArray(row.scopes) ? row.scopes.filter((entry) => typeof entry === 'string') : []
  if (!scopes.includes('voice_capture')) {
    return fail('FORBIDDEN', 'Token hat keinen voice_capture Scope.')
  }

  const { error: usageError } = await client
    .from('voice_api_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', row.id)

  if (usageError) {
    logger.warn('Failed to update voice token last_used_at', {
      component: 'voice-token-auth',
      tokenId: row.id,
      message: usageError.message,
    })
  }

  return ok({
    id: row.id,
    userId: row.user_id,
    companyId: row.company_id,
    scopes,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  })
}

export async function authenticateVoiceBearerToken(
  client: VoiceDbClient,
  headers: Headers,
): Promise<ServiceResult<VoiceTokenContext>> {
  const token = extractBearerToken(headers)
  if (!token) {
    return fail('UNAUTHORIZED', 'Authorization Bearer Token fehlt.')
  }

  return authenticateVoiceToken(client, token)
}
