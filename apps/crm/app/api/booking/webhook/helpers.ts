import crypto from 'crypto'
import { logger } from '@/lib/utils/logger'
import {
  CalcomPayloadSchema,
  CalcomWebhookEnvelopeSchema,
  type CalcomPayload,
  type CalcomWebhookEnvelope,
} from './schema'

export interface ExtractedBookingData {
  customer: {
    name: string
    email: string
    phone: string
  }
  appointment: {
    title: string
    startTime: string
    endTime: string
    description: string
  }
  sellerEmail: string
  meetingUrl: string
  eventId: string
}

export interface ParsedWebhookRequest {
  body: CalcomWebhookEnvelope
  payload: CalcomPayload
  triggerEvent?: string
}

export function verifyCalcomSignature(
  payload: string,
  signature: string | null,
  secret: string | undefined,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  if (!secret) {
    if (nodeEnv === 'development') {
      logger.warn('CALCOM_WEBHOOK_SECRET not set - skipping signature check in development', {
        component: 'booking-webhook',
      })
      return true
    }

    logger.error('CALCOM_WEBHOOK_SECRET not configured in production', {
      component: 'booking-webhook',
    })
    return false
  }

  if (!signature) {
    logger.warn('No webhook signature provided', {
      component: 'booking-webhook',
    })
    return false
  }

  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  } catch {
    return false
  }
}

export function generateAccessCode(length = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''

  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }

  return result
}

function normalizeString(value: string | number | undefined | null): string {
  return String(value ?? '').trim()
}

export function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return { firstName: '', lastName: '' }
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' }
  }

  const lastName = parts.pop() || ''
  const firstName = parts.join(' ')
  return { firstName, lastName }
}

export function parseWebhookRequest(rawBody: string): ParsedWebhookRequest | null {
  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(rawBody)
  } catch {
    return null
  }

  const envelope = CalcomWebhookEnvelopeSchema.safeParse(parsedBody)
  if (!envelope.success) {
    return null
  }

  const payloadCandidate = envelope.data.payload ?? envelope.data
  const payload = CalcomPayloadSchema.safeParse(payloadCandidate)
  if (!payload.success) {
    return null
  }

  return {
    body: envelope.data,
    payload: payload.data,
    triggerEvent: envelope.data.triggerEvent ?? payload.data.triggerEvent,
  }
}

export function extractBookingData(payload: CalcomPayload): ExtractedBookingData {
  const attendee = Array.isArray(payload.attendees)
    ? payload.attendees[0] || {}
    : payload.attendee || payload.customer || {}

  const customerName = normalizeString(attendee.name || payload.name || payload.fullName)
  const customerEmail = normalizeString(attendee.email || payload.email || payload.attendee?.email).toLowerCase()

  const responses = payload.responses || {}
  let phone = ''

  const phoneKey = Object.keys(responses).find((key) => {
    return /phone/i.test(key) && normalizeString(responses[key]?.value).length > 0
  })

  if (phoneKey) {
    phone = normalizeString(responses[phoneKey]?.value)
  }

  const sellerEmail = normalizeString(payload.organizer?.email || payload.hosts?.[0]?.email).toLowerCase()

  const appointment = {
    title: normalizeString(payload.title || payload.eventTitle || 'Planungstermin'),
    startTime: normalizeString(payload.startTime || payload.start || payload.when?.startTime),
    endTime: normalizeString(payload.endTime || payload.end || payload.when?.endTime),
    description: normalizeString(payload.description),
  }

  const meetingUrl = normalizeString(
    payload.metadata?.videoCallUrl || payload.meetingUrl || payload.conferenceUrl,
  )

  const bookingUid =
    payload.uid || payload.id || payload.bookingId || payload.eventId || payload.meetingId || payload.uuid

  const eventId = normalizeString(bookingUid || `${appointment.startTime}:${customerEmail || sellerEmail}`)

  return {
    customer: {
      name: customerName,
      email: customerEmail,
      phone,
    },
    appointment,
    sellerEmail,
    meetingUrl,
    eventId,
  }
}
