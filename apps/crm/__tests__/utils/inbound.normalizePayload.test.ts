import { normalizeInboundPayload } from '@/lib/inbound/normalizePayload'

describe('normalizeInboundPayload', () => {
  it('normalizes resend-style payload with attachments', () => {
    const payload = {
      type: 'email.received',
      data: {
        id: 'msg_123',
        from: 'Supplier GmbH <office@supplier.test>',
        to: ['hinschickenab@baleah.at'],
        subject: 'AB zu Bestellung 2026-LAB',
        text: 'Anbei die AB.',
        attachments: [
          {
            id: 'att_1',
            filename: 'AB-2026.pdf',
            content_type: 'application/pdf',
            content: Buffer.from('test-pdf').toString('base64'),
          },
        ],
      },
    }

    const normalized = normalizeInboundPayload(payload)

    expect(normalized).not.toBeNull()
    expect(normalized?.provider).toBe('resend')
    expect(normalized?.messageId).toBe('msg_123')
    expect(normalized?.fromEmail).toBe('office@supplier.test')
    expect(normalized?.to).toEqual(['hinschickenab@baleah.at'])
    expect(normalized?.attachments).toHaveLength(1)
    expect(normalized?.attachments[0].fileName).toBe('AB-2026.pdf')
  })

  it('returns null when payload has no usable attachments', () => {
    const payload = {
      data: {
        id: 'msg_456',
        from: 'test@example.com',
        to: ['inbound@example.com'],
        subject: 'Ohne Anhang',
      },
    }

    expect(normalizeInboundPayload(payload)).toBeNull()
  })
})
