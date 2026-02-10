/**
 * API route tests for POST /api/booking/webhook.
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/booking/webhook/route'

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    api: jest.fn(() => ({
      start: jest.fn(() => Date.now()),
      end: jest.fn(),
      complete: jest.fn(),
      error: jest.fn(),
    })),
  },
}))

const mockProcessBookingWebhook = jest.fn()
jest.mock('@/app/api/booking/webhook/workflow', () => ({
  processBookingWebhook: (...args: unknown[]) => mockProcessBookingWebhook(...args),
}))

jest.mock('@/app/api/booking/webhook/helpers', () => {
  const actual = jest.requireActual('@/app/api/booking/webhook/helpers')
  return {
    ...actual,
    verifyCalcomSignature: jest.fn(() => true),
  }
})

function createPostRequest(body: string, signature?: string): NextRequest {
  const headers = new Headers()
  if (signature) headers.set('x-cal-signature-256', signature)
  return new NextRequest('http://localhost/api/booking/webhook', {
    method: 'POST',
    body,
    headers,
  })
}

const validEnvelope = {
  triggerEvent: 'BOOKING_CREATED',
  payload: {
    uid: 'evt-123',
    attendees: [{ name: 'Max Mustermann', email: 'max@example.com' }],
    organizer: { email: 'seller@example.com' },
    title: 'Beratung',
    startTime: '2026-02-11T10:00:00.000Z',
    endTime: '2026-02-11T11:00:00.000Z',
  },
}

beforeEach(() => {
  mockProcessBookingWebhook.mockReset()
  process.env.NODE_ENV = 'test'
})

describe('POST /api/booking/webhook', () => {
  it('returns 400 for invalid JSON', async () => {
    const request = createPostRequest('not-json')
    const response = await POST(request)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Invalid webhook payload')
  })

  it('returns 200 with skipped when triggerEvent is not BOOKING_CREATED', async () => {
    const body = JSON.stringify({
      triggerEvent: 'BOOKING_CANCELLED',
      payload: { uid: 'evt-1', attendees: [] },
    })
    const request = createPostRequest(body)
    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.ok).toBe(true)
    expect(json.skipped).toBe(true)
    expect(json.reason).toBe('Not BOOKING_CREATED')
    expect(mockProcessBookingWebhook).not.toHaveBeenCalled()
  })

  it('returns 200 with skipped when outcome is duplicate', async () => {
    const body = JSON.stringify(validEnvelope)
    const request = createPostRequest(body, 'sig')
    mockProcessBookingWebhook.mockResolvedValue({ status: 'duplicate' })

    const response = await POST(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.ok).toBe(true)
    expect(json.skipped).toBe(true)
    expect(json.reason).toBe('Duplicate event')
    expect(mockProcessBookingWebhook).toHaveBeenCalledWith(
      'evt-123',
      expect.any(Object),
      expect.objectContaining({
        eventId: 'evt-123',
        customer: expect.objectContaining({ email: 'max@example.com' }),
      })
    )
  })

  it('returns 200 with result when processed successfully', async () => {
    const body = JSON.stringify(validEnvelope)
    const request = createPostRequest(body, 'sig')
    mockProcessBookingWebhook.mockResolvedValue({
      status: 'processed',
      result: {
        customerId: 'cust-1',
        projectId: 'proj-1',
        orderNumber: 'K-2026-0001',
        accessCode: 'ABC123',
        emailSent: true,
      },
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.ok).toBe(true)
    expect(json.customerId).toBe('cust-1')
    expect(json.projectId).toBe('proj-1')
    expect(json.orderNumber).toBe('K-2026-0001')
    expect(json.accessCode).toBe('ABC123')
    expect(json.emailSent).toBe(true)
  })

  it('returns 401 in production when signature invalid', async () => {
    const body = JSON.stringify(validEnvelope)
    const request = createPostRequest(body)
    process.env.NODE_ENV = 'production'
    const verifyMock = jest.requireMock('@/app/api/booking/webhook/helpers').verifyCalcomSignature
    verifyMock.mockReturnValueOnce(false)

    const response = await POST(request)

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe('Invalid webhook signature')
  })
})
