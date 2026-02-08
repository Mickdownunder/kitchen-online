import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/supabase/services/email'
import { getCompanySettingsById } from '@/lib/supabase/services/company'
import { logger } from '@/lib/utils/logger'

const TYPE_LABELS: Record<string, string> = {
  Consultation: 'Beratung / Planung',
  FirstMeeting: 'Erstgespräch',
  Measurement: 'Aufmaß',
  Installation: 'Montage',
  Service: 'Service / Wartung',
  ReMeasurement: 'Nachmessung',
  Delivery: 'Abholung',
  Other: 'Sonstiges',
}

function getTypeLabel(type: string): string {
  return TYPE_LABELS[type] || type
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '—'
  const parts = String(timeStr).split(':')
  return `${parts[0]}:${parts[1] || '00'} Uhr`
}

function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true
  if (request.headers.get('x-vercel-cron') === '1') return true
  return false
}

export async function GET(request: NextRequest) {
  const apiLogger = logger.api('/api/cron/appointment-reminders', 'GET')

  if (!verifyCronRequest(request)) {
    apiLogger.error(new Error('Unauthorized'), 401)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = supabaseAdmin
  if (!admin) {
    apiLogger.error(new Error('Admin client not available'), 500)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  const currentHour = now.getHours()

  let sent1Day = 0
  let sent1Hour = 0

  try {
    // 1-Tag-Erinnerung: nur um 7:00 UTC (≈ 8–9 Uhr MEZ)
    if (currentHour === 7) {
      const { data: appointments1Day, error: err1 } = await admin
        .from('planning_appointments')
        .select('id, customer_name, date, time, type, assigned_user_id, company_id')
        .eq('date', tomorrowStr)
        .not('assigned_user_id', 'is', null)

      if (err1) {
        logger.error('Failed to fetch 1-day appointments', { component: 'cron-reminders' }, err1)
      } else if (appointments1Day?.length) {
        const { data: existingLog } = await admin
          .from('appointment_reminder_log')
          .select('appointment_id')
          .in('appointment_id', appointments1Day.map(a => a.id))
          .eq('reminder_type', '1day')

        const sentIds = new Set((existingLog || []).map(r => r.appointment_id))
        const toSend = appointments1Day.filter(a => !sentIds.has(a.id))

        for (const apt of toSend) {
          if (!apt.assigned_user_id) continue
          const { data: profile } = await admin
            .from('user_profiles')
            .select('email, full_name')
            .eq('id', apt.assigned_user_id)
            .single()

          if (!profile?.email) continue

          let companyName = 'Ihr Unternehmen'
          try {
            const settings = await getCompanySettingsById(apt.company_id, admin)
            companyName = settings?.displayName || settings?.companyName || companyName
          } catch {
            // ignore
          }

          const subject = `Termin-Erinnerung: ${apt.customer_name} morgen`
          const html = `
            <p>Hallo ${profile.full_name || 'Mitarbeiter'},</p>
            <p>morgen haben Sie einen Termin:</p>
            <p><strong>${getTypeLabel(apt.type)}</strong><br>
            Kunde: ${apt.customer_name}<br>
            Datum: ${formatDate(apt.date)}<br>
            Uhrzeit: ${formatTime(apt.time)}</p>
            <p>Mit freundlichen Grüßen<br>${companyName}</p>
          `

          try {
            await sendEmail({ to: profile.email, subject, html })
            await admin.from('appointment_reminder_log').insert({
              appointment_id: apt.id,
              reminder_type: '1day',
            })
            sent1Day++
          } catch (e) {
            logger.error('Failed to send 1-day reminder', { component: 'cron-reminders', aptId: apt.id }, e as Error)
          }
        }
      }
    }

    // 1-Stunden-Erinnerung: Termine heute in der nächsten Stunde
    const nextHour = currentHour + 1
    const hourStart = `${String(currentHour).padStart(2, '0')}:00:00`
    const hourEnd = nextHour < 24 ? `${String(nextHour).padStart(2, '0')}:00:00` : '24:00:00'

    const { data: appointments1Hour, error: err2 } = await admin
      .from('planning_appointments')
      .select('id, customer_name, date, time, type, assigned_user_id, company_id')
      .eq('date', today)
      .not('assigned_user_id', 'is', null)
      .not('time', 'is', null)
      .gte('time', hourStart)
      .lt('time', hourEnd)

    if (err2) {
      logger.error('Failed to fetch 1-hour appointments', { component: 'cron-reminders' }, err2)
    } else if (appointments1Hour?.length) {
      const { data: existingLog } = await admin
        .from('appointment_reminder_log')
        .select('appointment_id')
        .in('appointment_id', appointments1Hour.map(a => a.id))
        .eq('reminder_type', '1hour')

      const sentIds = new Set((existingLog || []).map(r => r.appointment_id))
      const toSend = appointments1Hour.filter(a => !sentIds.has(a.id))

      for (const apt of toSend) {
        if (!apt.assigned_user_id) continue
        const { data: profile } = await admin
          .from('user_profiles')
          .select('email, full_name')
          .eq('id', apt.assigned_user_id)
          .single()

        if (!profile?.email) continue

        let companyName = 'Ihr Unternehmen'
        try {
          const settings = await getCompanySettingsById(apt.company_id, admin)
          companyName = settings?.displayName || settings?.companyName || companyName
        } catch {
          // ignore
        }

        const subject = `Termin-Erinnerung: ${apt.customer_name} in 1 Stunde`
        const html = `
          <p>Hallo ${profile.full_name || 'Mitarbeiter'},</p>
          <p>in etwa einer Stunde haben Sie einen Termin:</p>
          <p><strong>${getTypeLabel(apt.type)}</strong><br>
          Kunde: ${apt.customer_name}<br>
          Uhrzeit: ${formatTime(apt.time)}</p>
          <p>Mit freundlichen Grüßen<br>${companyName}</p>
        `

        try {
          await sendEmail({ to: profile.email, subject, html })
          await admin.from('appointment_reminder_log').insert({
            appointment_id: apt.id,
            reminder_type: '1hour',
          })
          sent1Hour++
        } catch (e) {
          logger.error('Failed to send 1-hour reminder', { component: 'cron-reminders', aptId: apt.id }, e as Error)
        }
      }
    }

    return NextResponse.json({
      ok: true,
      sent1Day,
      sent1Hour,
    })
  } catch (error) {
    apiLogger.error(error as Error, 500)
    logger.error('Cron appointment-reminders failed', { component: 'cron-reminders' }, error as Error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
