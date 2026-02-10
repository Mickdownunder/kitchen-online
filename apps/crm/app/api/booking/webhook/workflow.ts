import { createClient } from '@supabase/supabase-js'
import { bookingConfirmationTemplate } from '@/lib/email-templates/booking-confirmation'
import { sendEmail } from '@/lib/supabase/services/email'
import { logger } from '@/lib/utils/logger'
import { generateAccessCode, splitName, type ExtractedBookingData } from './helpers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

interface CompanySettingsRow {
  id: string
  company_name: string | null
  user_id: string
  order_prefix: string | null
  next_order_number: number | null
}

interface CompanyContext {
  companyId: string
  companyName: string | null
  defaultUserId: string
  orderNumber: string
}

interface SalespersonContext {
  salespersonId: string | null
  salespersonName: string | null
}

interface CustomerContext {
  customerId: string
  customerFullName: string
  firstName: string
  lastName: string
}

interface ProjectContext {
  projectId: string
  appointmentDate: Date
  appointmentDateString: string
  appointmentTimeString: string
}

export interface ProcessBookingResult {
  customerId: string
  projectId: string
  orderNumber: string
  accessCode: string
  emailSent: boolean
}

export type ProcessBookingOutcome =
  | { status: 'duplicate' }
  | {
      status: 'processed'
      result: ProcessBookingResult
    }

function parseAppointmentDate(input: string): Date {
  const candidate = input ? new Date(input) : new Date()
  if (Number.isNaN(candidate.getTime())) {
    return new Date()
  }

  return candidate
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('de-AT', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function getPortalUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL
  if (appUrl) {
    return `${appUrl}/portal`
  }

  return 'https://portal.kuechenonline.com'
}

async function reserveWebhookEvent(eventId: string, payload: unknown): Promise<boolean> {
  const { error } = await supabaseAdmin.from('processed_webhooks').insert({
    event_id: eventId,
    payload,
  })

  if (!error) {
    return true
  }

  if (error.code === '23505') {
    return false
  }

  throw new Error(`Webhook konnte nicht reserviert werden: ${error.message}`)
}

async function loadCompanyContext(): Promise<CompanyContext> {
  const { data: companySettings, error: companyError } = await supabaseAdmin
    .from('company_settings')
    .select('id, company_name, user_id, order_prefix, next_order_number')
    .limit(1)
    .single<CompanySettingsRow>()

  if (companyError || !companySettings) {
    throw new Error('Keine Company Settings gefunden')
  }

  const orderPrefix = companySettings.order_prefix || 'K-'
  const nextOrderNum = companySettings.next_order_number ?? 1
  const orderNumber = `${orderPrefix}${new Date().getFullYear()}-${String(nextOrderNum).padStart(4, '0')}`

  const { error: updateError } = await supabaseAdmin
    .from('company_settings')
    .update({
      next_order_number: nextOrderNum + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', companySettings.id)

  if (updateError) {
    throw new Error(`Auftragsnummer konnte nicht reserviert werden: ${updateError.message}`)
  }

  return {
    companyId: companySettings.id,
    companyName: companySettings.company_name,
    defaultUserId: companySettings.user_id,
    orderNumber,
  }
}

async function resolveSalesperson(sellerEmail: string): Promise<SalespersonContext> {
  if (!sellerEmail) {
    return {
      salespersonId: null,
      salespersonName: null,
    }
  }

  const { data: sellerProfile, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, display_name')
    .ilike('email', sellerEmail)
    .maybeSingle<{ id: string; display_name: string | null }>()

  if (error) {
    logger.warn(
      'Salesperson lookup failed',
      { component: 'booking-webhook', sellerEmail, error: error.message },
      new Error(error.message),
    )
    return {
      salespersonId: null,
      salespersonName: null,
    }
  }

  return {
    salespersonId: sellerProfile?.id ?? null,
    salespersonName: sellerProfile?.display_name ?? null,
  }
}

async function findOrCreateCustomer(data: ExtractedBookingData): Promise<CustomerContext> {
  const { firstName, lastName } = splitName(data.customer.name || 'Unbekannt')
  const normalizedFirstName = firstName || 'Unbekannt'
  const normalizedLastName = lastName || ''
  const customerFullName = `${normalizedFirstName} ${normalizedLastName}`.trim() || 'Unbekannt'

  let existingCustomerId: string | null = null

  if (data.customer.email) {
    const { data: existingCustomer, error: existingError } = await supabaseAdmin
      .from('customers')
      .select('id')
      .ilike('email', data.customer.email)
      .maybeSingle<{ id: string }>()

    if (!existingError) {
      existingCustomerId = existingCustomer?.id ?? null
    }
  }

  if (existingCustomerId) {
    await supabaseAdmin
      .from('customers')
      .update({
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
        phone: data.customer.phone || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingCustomerId)
      .is('first_name', null)

    return {
      customerId: existingCustomerId,
      customerFullName,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
    }
  }

  const { data: newCustomer, error: customerError } = await supabaseAdmin
    .from('customers')
    .insert({
      first_name: normalizedFirstName,
      last_name: normalizedLastName,
      email: data.customer.email,
      phone: data.customer.phone || '',
      street: '',
      postal_code: '',
      city: '',
    })
    .select('id')
    .single<{ id: string }>()

  if (customerError || !newCustomer) {
    throw new Error(`Customer konnte nicht angelegt werden: ${customerError?.message}`)
  }

  return {
    customerId: newCustomer.id,
    customerFullName,
    firstName: normalizedFirstName,
    lastName: normalizedLastName,
  }
}

async function createProject(
  data: ExtractedBookingData,
  company: CompanyContext,
  customer: CustomerContext,
  salesperson: SalespersonContext,
  accessCode: string,
): Promise<ProjectContext> {
  const appointmentDate = parseAppointmentDate(data.appointment.startTime)
  const appointmentDateString = appointmentDate.toISOString().split('T')[0]
  const appointmentTimeString = formatTime(appointmentDate)

  const { data: newProject, error: projectError } = await supabaseAdmin
    .from('projects')
    .insert({
      user_id: salesperson.salespersonId || company.defaultUserId,
      customer_id: customer.customerId,
      customer_name: customer.customerFullName,
      customer_email: data.customer.email,
      customer_phone: data.customer.phone,
      order_number: company.orderNumber,
      status: 'Lead',
      access_code: accessCode,
      salesperson_id: salesperson.salespersonId,
      salesperson_name: salesperson.salespersonName,
      measurement_date: appointmentDateString,
      measurement_time: appointmentTimeString,
      notes: `Automatisch erstellt via Cal.com Buchung.\nMeeting: ${
        data.meetingUrl || 'Kein Link'
      }\nTermin: ${data.appointment.title || 'Beratung'}`,
    })
    .select('id')
    .single<{ id: string }>()

  if (projectError || !newProject) {
    throw new Error(`Projekt konnte nicht angelegt werden: ${projectError?.message}`)
  }

  return {
    projectId: newProject.id,
    appointmentDate,
    appointmentDateString,
    appointmentTimeString,
  }
}

async function createPlanningAppointment(
  data: ExtractedBookingData,
  company: CompanyContext,
  customer: CustomerContext,
  salesperson: SalespersonContext,
  project: ProjectContext,
): Promise<void> {
  const { error } = await supabaseAdmin.from('planning_appointments').insert({
    user_id: salesperson.salespersonId || company.defaultUserId,
    company_id: company.companyId,
    customer_id: customer.customerId,
    customer_name: customer.customerFullName,
    phone: data.customer.phone,
    date: project.appointmentDateString,
    time: project.appointmentTimeString,
    type: 'Planung',
    project_id: project.projectId,
    notes: `Meeting-Link: ${data.meetingUrl || 'Kein Link'}\n${data.appointment.description || ''}`,
  })

  if (error) {
    logger.warn('Appointment konnte nicht angelegt werden', {
      component: 'booking-webhook',
      error: error.message,
    })
  }
}

async function sendBookingConfirmation(
  data: ExtractedBookingData,
  customer: CustomerContext,
  project: ProjectContext,
  company: CompanyContext,
  accessCode: string,
): Promise<boolean> {
  const emailData = bookingConfirmationTemplate({
    customerName: customer.customerFullName,
    customerEmail: data.customer.email,
    appointmentTitle: data.appointment.title,
    appointmentDate: project.appointmentDate.toISOString(),
    appointmentTime: project.appointmentTimeString,
    meetingUrl: data.meetingUrl || 'Link wird separat zugesendet',
    accessCode,
    portalUrl: getPortalUrl(),
    companyName: company.companyName || undefined,
  })

  try {
    await sendEmail({
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      from: process.env.BOOKING_EMAIL_FROM || 'office@kuechenonline.com',
      fromName: company.companyName || 'KüchenOnline',
    })
    return true
  } catch (error) {
    logger.warn(
      'Booking email failed (booking still created)',
      {
        component: 'booking-webhook',
        customerEmail: data.customer.email,
      },
      error as Error,
    )
    return false
  }
}

export async function processBookingWebhook(
  eventId: string,
  payload: unknown,
  data: ExtractedBookingData,
): Promise<ProcessBookingOutcome> {
  const reserved = await reserveWebhookEvent(eventId, payload)
  if (!reserved) {
    return { status: 'duplicate' }
  }

  const company = await loadCompanyContext()
  const salesperson = await resolveSalesperson(data.sellerEmail)
  const customer = await findOrCreateCustomer(data)

  const accessCode = generateAccessCode()
  const project = await createProject(data, company, customer, salesperson, accessCode)
  await createPlanningAppointment(data, company, customer, salesperson, project)
  const emailSent = await sendBookingConfirmation(data, customer, project, company, accessCode)

  return {
    status: 'processed',
    result: {
      customerId: customer.customerId,
      projectId: project.projectId,
      orderNumber: company.orderNumber,
      accessCode,
      emailSent,
    },
  }
}
