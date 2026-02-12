import { createHmac } from 'crypto'
import { verifyInboundWebhookAuth, verifyOptionalResendSignature } from '@/lib/inbound/security'

describe('inbound security', () => {
  const originalInboundSecret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET
  const originalResendSecret = process.env.RESEND_WEBHOOK_SECRET

  afterEach(() => {
    process.env.INBOUND_EMAIL_WEBHOOK_SECRET = originalInboundSecret
    process.env.RESEND_WEBHOOK_SECRET = originalResendSecret
  })

  it('accepts query secret when inbound secret is configured', () => {
    process.env.INBOUND_EMAIL_WEBHOOK_SECRET = 'abc123'
    const headers = new Headers()
    expect(verifyInboundWebhookAuth(headers, 'abc123')).toBe(true)
    expect(verifyInboundWebhookAuth(headers, 'wrong')).toBe(false)
  })

  it('verifies svix signatures when RESEND_WEBHOOK_SECRET is set', () => {
    const key = 'unit-test-secret'
    process.env.RESEND_WEBHOOK_SECRET = `whsec_${Buffer.from(key).toString('base64')}`

    const rawBody = JSON.stringify({ type: 'email.received', data: { email_id: 'em_1' } })
    const svixId = 'msg_1'
    const svixTimestamp = '1739370000'
    const payload = `${svixId}.${svixTimestamp}.${rawBody}`
    const signature = createHmac('sha256', Buffer.from(key)).update(payload).digest('base64')

    const headers = new Headers()
    headers.set('svix-id', svixId)
    headers.set('svix-timestamp', svixTimestamp)
    headers.set('svix-signature', `v1,${signature}`)

    expect(verifyOptionalResendSignature(rawBody, headers)).toBe(true)
  })
})

