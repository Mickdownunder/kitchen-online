import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'
import { extractBookingData, parseWebhookRequest, verifyCalcomSignature } from './helpers'
import { processBookingWebhook } from './workflow'

const WEBHOOK_COMPONENT = 'booking-webhook'
const BOOKING_CREATED_EVENT = 'BOOKING_CREATED'

function getWebhookSignature(request: NextRequest): string | null {
  return request.headers.get('x-cal-signature-256') || request.headers.get('x-webhook-signature')
}

export async function POST(request: NextRequest) {
  const apiLogger = logger.api('/api/booking/webhook', 'POST')
  const startTime = apiLogger.start()

  try {
    const rawBody = await request.text()
    const signature = getWebhookSignature(request)
    const webhookSecret = process.env.CALCOM_WEBHOOK_SECRET

    if (!verifyCalcomSignature(rawBody, signature, webhookSecret)) {
      logger.warn('Invalid or missing webhook signature', {
        component: WEBHOOK_COMPONENT,
        hasSignature: Boolean(signature),
        hasSecret: Boolean(webhookSecret),
      })

      if (process.env.NODE_ENV === 'production') {
        apiLogger.end(startTime, 401)
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
      }
    }

    const parsed = parseWebhookRequest(rawBody)
    if (!parsed) {
      apiLogger.end(startTime, 400)
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }

    if (parsed.triggerEvent && parsed.triggerEvent !== BOOKING_CREATED_EVENT) {
      apiLogger.end(startTime, 200)
      return NextResponse.json({ ok: true, skipped: true, reason: 'Not BOOKING_CREATED' })
    }

    const bookingData = extractBookingData(parsed.payload)

    logger.info('Cal.com webhook received', {
      component: WEBHOOK_COMPONENT,
      eventId: bookingData.eventId,
      customerEmail: bookingData.customer.email,
    })

    const outcome = await processBookingWebhook(bookingData.eventId, parsed.body, bookingData)

    if (outcome.status === 'duplicate') {
      logger.info('Duplicate webhook skipped', {
        component: WEBHOOK_COMPONENT,
        eventId: bookingData.eventId,
      })
      apiLogger.end(startTime, 200)
      return NextResponse.json({ ok: true, skipped: true, reason: 'Duplicate event' })
    }

    logger.info('Booking processed successfully', {
      component: WEBHOOK_COMPONENT,
      eventId: bookingData.eventId,
      customerId: outcome.result.customerId,
      projectId: outcome.result.projectId,
      orderNumber: outcome.result.orderNumber,
    })

    apiLogger.end(startTime, 200)
    return NextResponse.json({
      ok: true,
      customerId: outcome.result.customerId,
      projectId: outcome.result.projectId,
      orderNumber: outcome.result.orderNumber,
      accessCode: outcome.result.accessCode,
      emailSent: outcome.result.emailSent,
    })
  } catch (error) {
    apiLogger.error(error as Error, 500)
    logger.error(
      'Booking webhook error',
      {
        component: WEBHOOK_COMPONENT,
        errorMessage: error instanceof Error ? error.message : 'Unknown',
      },
      error as Error,
    )

    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: 'Cal.com Booking Webhook',
    version: '1.0.0',
  })
}
