import { createHmac, timingSafeEqual } from 'crypto'
import { logger } from '@/lib/utils/logger'

function constantTimeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }
  return timingSafeEqual(leftBuffer, rightBuffer)
}

function extractBearerToken(headers: Headers): string | null {
  const authorization = headers.get('authorization')
  if (!authorization) {
    return null
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    return null
  }

  const token = match[1].trim()
  return token.length > 0 ? token : null
}

export function verifyInboundWebhookAuth(headers: Headers, querySecret?: string | null): boolean {
  const configuredSecret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET?.trim()

  const providedSecret =
    headers.get('x-inbound-email-secret')?.trim() ||
    headers.get('x-webhook-secret')?.trim() ||
    extractBearerToken(headers) ||
    (typeof querySecret === 'string' ? querySecret.trim() : null)

  if (configuredSecret) {
    if (!providedSecret) {
      return false
    }
    return constantTimeEquals(providedSecret, configuredSecret)
  }

  if (process.env.NODE_ENV !== 'production') {
    logger.warn('INBOUND_EMAIL_WEBHOOK_SECRET is not set - allowing inbound webhook in non-production', {
      component: 'inbound-security',
    })
    return true
  }

  return false
}

/**
 * Optional Resend signature verification.
 * Resend may sign payloads with "svix" style headers (svix-id/timestamp/signature)
 * or with a provider-specific signature header. If verification cannot be applied,
 * this helper returns true and caller still relies on webhook secret authentication.
 */
export function verifyOptionalResendSignature(rawBody: string, headers: Headers): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim()
  if (!secret) {
    return true
  }

  const svixId = headers.get('svix-id')?.trim()
  const svixTimestamp = headers.get('svix-timestamp')?.trim()
  const svixSignature = headers.get('svix-signature')?.trim()
  if (svixId && svixTimestamp && svixSignature) {
    const signingPayload = `${svixId}.${svixTimestamp}.${rawBody}`
    const signingSecret = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret
    let key: Buffer

    try {
      key = Buffer.from(signingSecret, 'base64')
      if (key.length === 0) {
        return false
      }
    } catch {
      return false
    }

    const expected = createHmac('sha256', key).update(signingPayload).digest('base64')
    const providedSignatures = svixSignature
      .split(/\s+/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const match = entry.match(/^v\d+,(.+)$/)
        return match?.[1]?.trim() || null
      })
      .filter((entry): entry is string => Boolean(entry))

    return providedSignatures.some((entry) => constantTimeEquals(entry, expected))
  }

  const signatureHeader = headers.get('x-resend-signature')?.trim()
  if (!signatureHeader) {
    return false
  }

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  return constantTimeEquals(signatureHeader, expected)
}

export function verifyCronRequest(headers: Headers): boolean {
  const authHeader = headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true
  }
  if (headers.get('x-vercel-cron') === '1') {
    return true
  }
  return false
}
