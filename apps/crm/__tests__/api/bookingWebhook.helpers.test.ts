import crypto from 'crypto'
import {
  buildEventIdNotesPattern,
  escapeIlikePattern,
  extractBookingData,
  generateAccessCode,
  parseWebhookRequest,
  splitName,
  verifyCalcomSignature,
} from '@/app/api/booking/webhook/helpers'

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    api: jest.fn(),
  },
}))

describe('booking webhook helpers', () => {
  it('parses envelope payload and trigger event', () => {
    const rawBody = JSON.stringify({
      triggerEvent: 'BOOKING_CREATED',
      payload: {
        uid: 'evt-1',
        attendees: [{ name: 'Max Mustermann', email: 'max@example.com' }],
      },
    })

    const parsed = parseWebhookRequest(rawBody)

    expect(parsed).not.toBeNull()
    expect(parsed?.triggerEvent).toBe('BOOKING_CREATED')
    expect(parsed?.payload.uid).toBe('evt-1')
  })

  it('returns null for invalid JSON', () => {
    expect(parseWebhookRequest('not-json')).toBeNull()
  })

  it('extracts normalized booking data from payload', () => {
    const parsed = parseWebhookRequest(
      JSON.stringify({
        uid: 'event-123',
        attendees: [{ name: '  Max Mustermann  ', email: 'MAX@example.com' }],
        organizer: { email: 'Seller@Example.com' },
        responses: {
          phone: { value: ' +43 660 123456 ' },
        },
        title: 'Beratung',
        startTime: '2026-02-11T10:00:00.000Z',
        endTime: '2026-02-11T11:00:00.000Z',
        metadata: { videoCallUrl: 'https://meet.example.com/abc' },
      }),
    )

    expect(parsed).not.toBeNull()
    const bookingData = extractBookingData(parsed!.payload)

    expect(bookingData.customer.name).toBe('Max Mustermann')
    expect(bookingData.customer.email).toBe('max@example.com')
    expect(bookingData.customer.phone).toBe('+43 660 123456')
    expect(bookingData.sellerEmail).toBe('seller@example.com')
    expect(bookingData.meetingUrl).toBe('https://meet.example.com/abc')
    expect(bookingData.eventId).toBe('event-123')
  })

  it('validates a correct signature and rejects an invalid one', () => {
    const payload = JSON.stringify({ hello: 'world' })
    const secret = 'top-secret'
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex')

    expect(verifyCalcomSignature(payload, signature, secret, 'production')).toBe(true)
    expect(verifyCalcomSignature(payload, 'invalid', secret, 'production')).toBe(false)
  })

  it('allows missing secret in development but rejects in production', () => {
    const payload = JSON.stringify({ hello: 'world' })

    expect(verifyCalcomSignature(payload, null, undefined, 'development')).toBe(true)
    expect(verifyCalcomSignature(payload, null, undefined, 'production')).toBe(false)
  })

  it('generates fixed-length uppercase access codes', () => {
    const code = generateAccessCode(16)
    expect(code).toMatch(/^[A-Z0-9]{16}$/)
  })

  it('splits full names into first and last name', () => {
    expect(splitName('Ada Lovelace')).toEqual({ firstName: 'Ada', lastName: 'Lovelace' })
    expect(splitName('Madonna')).toEqual({ firstName: 'Madonna', lastName: '' })
  })

  it('escapes wildcard characters for ilike patterns', () => {
    expect(escapeIlikePattern('evt_100%foo\\bar')).toBe('evt\\_100\\%foo\\\\bar')
  })

  it('builds an escaped notes lookup pattern for event ids', () => {
    expect(buildEventIdNotesPattern('evt_100%foo')).toBe('%Cal.com Event ID: evt\\_100\\%foo%')
  })
})
