import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/supabase/services/email'
import { bookingConfirmationTemplate } from '@/lib/email-templates/booking-confirmation'
import { logger } from '@/lib/utils/logger'
import crypto from 'crypto'

/**
 * Cal.com Webhook Handler
 * 
 * Empfängt BOOKING_CREATED Events von Cal.com und:
 * 1. Validiert Webhook-Signatur (CALCOM_WEBHOOK_SECRET)
 * 2. Dedupliziert via processed_webhooks Tabelle
 * 3. Legt Customer an (oder findet existierenden)
 * 4. Legt Projekt an mit Access Code
 * 5. Legt Planning Appointment an
 * 6. Sendet Bestätigungs-Email mit Portal-Zugang + Meet-Link
 */

// Supabase Admin Client (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Validiert die Cal.com Webhook-Signatur
 * @param payload - Raw body als String
 * @param signature - Signatur aus dem Header
 * @param secret - Webhook Secret aus Cal.com Dashboard
 * @returns true wenn Signatur gültig oder keine Validierung nötig
 */
function verifyCalcomSignature(
  payload: string,
  signature: string | null,
  secret: string | undefined
): boolean {
  // In Development ohne Secret: Warning loggen und erlauben
  if (!secret) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('CALCOM_WEBHOOK_SECRET not set - skipping signature check in development', {
        component: 'booking-webhook',
      })
      return true
    }
    // In Production ohne Secret: Ablehnen
    logger.error('CALCOM_WEBHOOK_SECRET not configured in production', {
      component: 'booking-webhook',
    })
    return false
  }

  // Keine Signatur im Request
  if (!signature) {
    logger.warn('No webhook signature provided', {
      component: 'booking-webhook',
    })
    return false
  }

  // Signatur berechnen und vergleichen
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  // Timing-safe comparison gegen Timing-Attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}

// Access Code Generator (wie im n8n Flow)
function generateAccessCode(length = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

// Hilfsfunktion: String normalisieren
function norm(s: string | undefined | null): string {
  return String(s ?? '').trim()
}

// Cal.com Payload Types
interface CalcomAttendee {
  name?: string
  email?: string
  timeZone?: string
}

interface CalcomOrganizer {
  name?: string
  email?: string
  timeZone?: string
}

interface CalcomPayload {
  triggerEvent?: string
  uid?: string
  id?: string
  bookingId?: string
  eventId?: string
  meetingId?: string
  uuid?: string
  title?: string
  eventTitle?: string
  startTime?: string
  start?: string
  endTime?: string
  end?: string
  description?: string
  attendees?: CalcomAttendee[]
  attendee?: CalcomAttendee
  customer?: CalcomAttendee
  name?: string
  fullName?: string
  email?: string
  organizer?: CalcomOrganizer
  hosts?: CalcomOrganizer[]
  metadata?: {
    videoCallUrl?: string
  }
  meetingUrl?: string
  conferenceUrl?: string
  responses?: Record<string, { value?: string }>
  when?: {
    startTime?: string
    endTime?: string
  }
}

// Daten aus Cal.com Payload extrahieren (wie "2. Daten aufbereiten" in n8n)
function extractBookingData(payload: CalcomPayload) {
  // Teilnehmer / Kunde
  const attendee = Array.isArray(payload.attendees)
    ? (payload.attendees[0] || {})
    : (payload.attendee || payload.customer || {})
  
  const customerName = norm(attendee.name || payload.name || payload.fullName)
  const customerEmail = norm(
    attendee.email || payload.email || (payload.attendee?.email)
  ).toLowerCase()

  // Telefonnummer aus responses
  const responses = payload.responses || {}
  let phone = ''
  const phoneKey = Object.keys(responses).find(key => 
    /phone/i.test(key) && responses[key]?.value
  )
  if (phoneKey) {
    phone = norm(responses[phoneKey]?.value)
  }

  // Verkäufer/Organizer
  const sellerEmail = norm(
    payload.organizer?.email || payload.hosts?.[0]?.email
  ).toLowerCase()

  // Termin
  const appointment = {
    title: norm(payload.title || payload.eventTitle || 'Planungstermin'),
    startTime: norm(payload.startTime || payload.start || payload.when?.startTime),
    endTime: norm(payload.endTime || payload.end || payload.when?.endTime),
    description: norm(payload.description),
  }

  // Meeting-Link (Google Meet / Zoom)
  const meetingUrl = norm(
    payload.metadata?.videoCallUrl || payload.meetingUrl || payload.conferenceUrl
  )

  // Event ID für Dedupe
  const bookingUid = payload.uid || payload.id || payload.bookingId || 
                     payload.eventId || payload.meetingId || payload.uuid
  const eventId = String(bookingUid || `${appointment.startTime}:${customerEmail || sellerEmail}`)

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

// Namen in Vor- und Nachname splitten
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' }
  }
  const lastName = parts.pop() || ''
  const firstName = parts.join(' ')
  return { firstName, lastName }
}

export async function POST(request: NextRequest) {
  const apiLogger = logger.api('/api/booking/webhook', 'POST')
  const startTime = apiLogger.start()

  try {
    // 1. Raw Body für Signatur-Validierung lesen
    const rawBody = await request.text()
    
    // 2. Signatur aus Header extrahieren (Cal.com verwendet x-cal-signature-256)
    const signature = request.headers.get('x-cal-signature-256') 
                   || request.headers.get('x-webhook-signature')
    const webhookSecret = process.env.CALCOM_WEBHOOK_SECRET

    // 3. Signatur validieren
    if (!verifyCalcomSignature(rawBody, signature, webhookSecret)) {
      logger.warn('Invalid or missing webhook signature', {
        component: 'booking-webhook',
        hasSignature: !!signature,
        hasSecret: !!webhookSecret,
      })
      
      // In Production: Ablehnen
      if (process.env.NODE_ENV === 'production') {
        apiLogger.end(startTime, 401)
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        )
      }
      // In Development: Warning wurde bereits geloggt, weitermachen
    }

    // 4. Parse Payload (bereits als Text gelesen)
    const body = JSON.parse(rawBody)
    const payload: CalcomPayload = body.payload || body

    // Nur BOOKING_CREATED verarbeiten
    const triggerEvent = body.triggerEvent || payload.triggerEvent
    if (triggerEvent && triggerEvent !== 'BOOKING_CREATED') {
      apiLogger.end(startTime, 200)
      return NextResponse.json({ ok: true, skipped: true, reason: 'Not BOOKING_CREATED' })
    }

    // 5. Daten extrahieren
    const data = extractBookingData(payload)
    
    logger.info('Cal.com webhook received', {
      component: 'booking-webhook',
      eventId: data.eventId,
      customerEmail: data.customer.email,
    })

    // 3. Dedupe Check
    const { data: existing } = await supabaseAdmin
      .from('processed_webhooks')
      .select('id')
      .eq('event_id', data.eventId)
      .single()

    if (existing) {
      logger.info('Duplicate webhook skipped', {
        component: 'booking-webhook',
        eventId: data.eventId,
      })
      apiLogger.end(startTime, 200)
      return NextResponse.json({ ok: true, skipped: true, reason: 'Duplicate event' })
    }

    // 4. Event als verarbeitet markieren
    await supabaseAdmin
      .from('processed_webhooks')
      .insert({
        event_id: data.eventId,
        payload: body,
      })

    // 5. Company ID und User ID holen (company_settings.id ist die Company ID)
    const { data: companySettings, error: csError } = await supabaseAdmin
      .from('company_settings')
      .select('id, company_name, user_id, order_prefix, next_order_number')
      .limit(1)
      .single()

    if (csError || !companySettings) {
      throw new Error('Keine Company Settings gefunden')
    }
    const companyId = companySettings.id
    const companyName = companySettings.company_name
    const defaultUserId = companySettings.user_id // Owner der Company

    // Fortlaufende Auftragsnummer (wie Rechnungen)
    const orderPrefix = companySettings.order_prefix || 'K-'
    const nextOrderNum = companySettings.next_order_number ?? 1
    const orderNumber = `${orderPrefix}${new Date().getFullYear()}-${String(nextOrderNum).padStart(4, '0')}`
    await supabaseAdmin
      .from('company_settings')
      .update({
        next_order_number: nextOrderNum + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyId)

    // 6. Verkäufer finden (optional - für verkaeuferId im Projekt)
    let salespersonId: string | null = null
    let salespersonName: string | null = null
    
    if (data.sellerEmail) {
      // Suche User via auth.users + company_members
      const { data: sellerProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('id, display_name')
        .ilike('email', data.sellerEmail)
        .single()

      if (sellerProfile) {
        salespersonId = sellerProfile.id
        salespersonName = sellerProfile.display_name
      }
    }

    // 7. Customer anlegen oder finden
    const { firstName, lastName } = splitName(data.customer.name || 'Unbekannt')
    
    // Erst suchen ob Customer mit dieser Email existiert
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .ilike('email', data.customer.email)
      .single()

    let customerId: string

    if (existingCustomer) {
      customerId = existingCustomer.id
      // Optional: Update Name/Phone wenn leer
      await supabaseAdmin
        .from('customers')
        .update({
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          phone: data.customer.phone || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId)
        .is('first_name', null) // Nur updaten wenn leer
    } else {
      // Neuen Customer anlegen
      const { data: newCustomer, error: customerError } = await supabaseAdmin
        .from('customers')
        .insert({
          first_name: firstName || 'Unbekannt',
          last_name: lastName || '',
          email: data.customer.email,
          phone: data.customer.phone || '',
          street: '',
          postal_code: '',
          city: '',
        })
        .select('id')
        .single()

      if (customerError || !newCustomer) {
        throw new Error(`Customer konnte nicht angelegt werden: ${customerError?.message}`)
      }
      customerId = newCustomer.id
    }

    // 8. Projekt anlegen
    const accessCode = generateAccessCode()
    const customerFullName = `${firstName} ${lastName}`.trim() || 'Unbekannt'

    // Parse appointment date for storing in project
    const appointmentDate = data.appointment.startTime 
      ? new Date(data.appointment.startTime)
      : new Date()
    
    const appointmentTimeString = appointmentDate.toLocaleTimeString('de-AT', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    const { data: newProject, error: projectError } = await supabaseAdmin
      .from('projects')
      .insert({
        user_id: salespersonId || defaultUserId, // Wichtig für RLS!
        customer_id: customerId,
        customer_name: customerFullName,
        customer_email: data.customer.email,
        customer_phone: data.customer.phone,
        order_number: orderNumber,
        status: 'Lead',
        access_code: accessCode,
        salesperson_id: salespersonId,
        salesperson_name: salespersonName,
        // Speichere Termin-Datum im Projekt für Lead-Anzeige im CRM
        // Die Termine-Seite im Portal zeigt dies NICHT als Aufmaß für Leads
        measurement_date: appointmentDate.toISOString().split('T')[0],
        measurement_time: appointmentTimeString,
        notes: `Automatisch erstellt via Cal.com Buchung.\nMeeting: ${data.meetingUrl || 'Kein Link'}\nTermin: ${data.appointment.title || 'Beratung'}`,
      })
      .select('id')
      .single()

    if (projectError || !newProject) {
      throw new Error(`Projekt konnte nicht angelegt werden: ${projectError?.message}`)
    }

    // 9. Planning Appointment anlegen
    const { error: appointmentError } = await supabaseAdmin
      .from('planning_appointments')
      .insert({
        user_id: salespersonId || defaultUserId, // Verwende Company Owner als Fallback
        company_id: companyId,
        customer_id: customerId,
        customer_name: customerFullName,
        phone: data.customer.phone,
        date: appointmentDate.toISOString().split('T')[0],
        time: appointmentTimeString,
        type: 'Planung', // Planungstermin für Erstberatung
        project_id: newProject.id,
        notes: `Meeting-Link: ${data.meetingUrl || 'Kein Link'}\n${data.appointment.description || ''}`,
      })

    if (appointmentError) {
      logger.warn('Appointment konnte nicht angelegt werden', {
        component: 'booking-webhook',
        error: appointmentError.message,
      })
      // Kein throw - Projekt wurde bereits erstellt
    }

    // 10. Bestätigungs-Email senden
    const portalUrl = process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/portal`
      : 'https://portal.kuechenonline.com'

    const emailData = bookingConfirmationTemplate({
      customerName: customerFullName,
      customerEmail: data.customer.email,
      appointmentTitle: data.appointment.title,
      appointmentDate: appointmentDate.toISOString(),
      appointmentTime: appointmentTimeString,
      meetingUrl: data.meetingUrl || 'Link wird separat zugesendet',
      accessCode: accessCode,
      portalUrl: portalUrl,
      companyName: companyName,
    })

    // Email senden (Fehler loggen aber nicht abbrechen)
    let emailSent = false
    try {
      await sendEmail({
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        from: process.env.BOOKING_EMAIL_FROM || 'office@kuechenonline.com',
        fromName: companyName || 'KüchenOnline',
      })
      emailSent = true
    } catch (emailError) {
      logger.warn('Booking email failed (booking still created)', {
        component: 'booking-webhook',
        error: emailError instanceof Error ? emailError.message : 'Unknown',
        customerEmail: data.customer.email,
      })
    }

    logger.info('Booking processed successfully', {
      component: 'booking-webhook',
      eventId: data.eventId,
      customerId,
      projectId: newProject.id,
      orderNumber,
    })

    apiLogger.end(startTime, 200)
    return NextResponse.json({
      ok: true,
      customerId,
      projectId: newProject.id,
      orderNumber,
      accessCode,
      emailSent,
    })

  } catch (error) {
    apiLogger.error(error as Error, 500)
    logger.error('Booking webhook error', {
      component: 'booking-webhook',
      errorMessage: error instanceof Error ? error.message : 'Unknown',
    }, error as Error)

    // Keine internen Fehlerdetails zurückgeben
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// GET für Health Check / Webhook Verification
export async function GET() {
  return NextResponse.json({ 
    ok: true, 
    endpoint: 'Cal.com Booking Webhook',
    version: '1.0.0',
  })
}
