import { createClient } from '@supabase/supabase-js'
import { bookingConfirmationTemplate } from '@/lib/email-templates/booking-confirmation'
import { sendEmail } from '@/lib/supabase/services/email'
import { logger } from '@/lib/utils/logger'
import { generateAccessCode, splitName, type ExtractedBookingData } from './helpers'

const MAX_WORKFLOW_RETRIES = 3
const RETRY_BASE_DELAY_MS = 300

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

interface CompanyBaseContext {
  companyId: string
  companyName: string | null
  defaultUserId: string
  orderPrefix: string
  nextOrderNumber: number
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

interface ExistingProjectContext {
  projectId: string
  customerId: string | null
  orderNumber: string
  accessCode: string | null
  measurementDate: string | null
  measurementTime: string | null
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

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const typedError = error as { message?: string; code?: string; status?: number }

  if (typeof typedError.status === 'number' && [408, 425, 429, 500, 502, 503, 504].includes(typedError.status)) {
    return true
  }

  const code = typedError.code || ''
  if (['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED'].includes(code)) {
    return true
  }

  const message = (typedError.message || '').toLowerCase()
  const transientPatterns = [
    'timeout',
    'timed out',
    'network',
    'fetch failed',
    'temporary',
    'temporarily unavailable',
    'connection',
    'rate limit',
    'too many requests',
    '503',
    '502',
    '504',
  ]

  return transientPatterns.some((pattern) => message.includes(pattern))
}

async function executeWithRetry<T>(
  label: string,
  operation: () => Promise<T>,
  maxAttempts = MAX_WORKFLOW_RETRIES,
): Promise<T> {
  let attempt = 0

  while (attempt < maxAttempts) {
    try {
      return await operation()
    } catch (error) {
      attempt += 1
      const canRetry = isTransientError(error) && attempt < maxAttempts

      if (!canRetry) {
        throw error
      }

      const delayMs = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)
      logger.warn('Retrying webhook operation after transient failure', {
        component: 'booking-webhook',
        label,
        attempt,
        maxAttempts,
        delayMs,
        errorMessage: error instanceof Error ? error.message : String(error),
      })

      await sleep(delayMs)
    }
  }

  throw new Error(`Retry budget exhausted for ${label}`)
}

async function reserveWebhookEvent(eventId: string, payload: unknown): Promise<boolean> {
  return executeWithRetry('reserve-webhook-event', async () => {
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
  })
}

async function releaseWebhookEvent(eventId: string): Promise<void> {
  const { error } = await supabaseAdmin.from('processed_webhooks').delete().eq('event_id', eventId)

  if (error) {
    logger.warn('Failed to release webhook reservation', {
      component: 'booking-webhook',
      eventId,
      error: error.message,
    })
  }
}

async function loadCompanyBaseContext(): Promise<CompanyBaseContext> {
  const { data: companySettings, error: companyError } = await supabaseAdmin
    .from('company_settings')
    .select('id, company_name, user_id, order_prefix, next_order_number')
    .limit(1)
    .single<CompanySettingsRow>()

  if (companyError || !companySettings) {
    throw new Error('Keine Company Settings gefunden')
  }

  return {
    companyId: companySettings.id,
    companyName: companySettings.company_name,
    defaultUserId: companySettings.user_id,
    orderPrefix: companySettings.order_prefix || 'K-',
    nextOrderNumber: companySettings.next_order_number ?? 1,
  }
}

async function reserveOrderNumber(company: CompanyBaseContext): Promise<CompanyContext> {
  const orderNumber = `${company.orderPrefix}${new Date().getFullYear()}-${String(company.nextOrderNumber).padStart(4, '0')}`

  const { error: updateError } = await supabaseAdmin
    .from('company_settings')
    .update({
      next_order_number: company.nextOrderNumber + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', company.companyId)

  if (updateError) {
    throw new Error(`Auftragsnummer konnte nicht reserviert werden: ${updateError.message}`)
  }

  return {
    companyId: company.companyId,
    companyName: company.companyName,
    defaultUserId: company.defaultUserId,
    orderNumber,
  }
}

async function findExistingProjectForEvent(eventId: string): Promise<ExistingProjectContext | null> {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('id, customer_id, order_number, access_code, measurement_date, measurement_time, notes')
    .ilike('notes', `%Cal.com Event ID: ${eventId}%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string
      customer_id: string | null
      order_number: string | null
      access_code: string | null
      measurement_date: string | null
      measurement_time: string | null
      notes: string | null
    }>()

  if (error) {
    logger.warn('Failed to query existing project by event id', {
      component: 'booking-webhook',
      eventId,
      error: error.message,
    })
    return null
  }

  if (!data || !data.order_number) {
    return null
  }

  return {
    projectId: data.id,
    customerId: data.customer_id,
    orderNumber: data.order_number,
    accessCode: data.access_code,
    measurementDate: data.measurement_date,
    measurementTime: data.measurement_time,
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

function buildProjectContextFromExisting(
  data: ExtractedBookingData,
  existingProject: ExistingProjectContext,
): ProjectContext {
  const fallbackAppointmentDate = parseAppointmentDate(data.appointment.startTime)
  const appointmentDateString =
    existingProject.measurementDate || fallbackAppointmentDate.toISOString().split('T')[0]
  const appointmentTimeString = existingProject.measurementTime || formatTime(fallbackAppointmentDate)

  return {
    projectId: existingProject.projectId,
    appointmentDate: fallbackAppointmentDate,
    appointmentDateString,
    appointmentTimeString,
  }
}

async function createProject(
  data: ExtractedBookingData,
  eventId: string,
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
      notes: `Automatisch erstellt via Cal.com Buchung.\nCal.com Event ID: ${eventId}\nMeeting: ${
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

async function ensureProjectAccessCode(projectId: string, accessCode: string | null): Promise<string> {
  if (accessCode) {
    return accessCode
  }

  const generatedAccessCode = generateAccessCode()
  const { error } = await supabaseAdmin
    .from('projects')
    .update({ access_code: generatedAccessCode, updated_at: new Date().toISOString() })
    .eq('id', projectId)

  if (error) {
    logger.warn('Failed to persist generated access code on existing project', {
      component: 'booking-webhook',
      projectId,
      error: error.message,
    })
  }

  return generatedAccessCode
}

async function createPlanningAppointment(
  data: ExtractedBookingData,
  company: CompanyBaseContext,
  customer: CustomerContext,
  salesperson: SalespersonContext,
  project: ProjectContext,
): Promise<void> {
  const { data: existingAppointment } = await supabaseAdmin
    .from('planning_appointments')
    .select('id')
    .eq('project_id', project.projectId)
    .eq('type', 'Planung')
    .eq('date', project.appointmentDateString)
    .eq('time', project.appointmentTimeString)
    .maybeSingle<{ id: string }>()

  if (existingAppointment) {
    return
  }

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
  company: Pick<CompanyBaseContext, 'companyName'>,
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
    await executeWithRetry('send-booking-confirmation-email', async () => {
      await sendEmail({
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        from: process.env.BOOKING_EMAIL_FROM || 'office@kuechenonline.com',
        fromName: company.companyName || 'KüchenOnline',
      })
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

async function executeBookingWorkflow(eventId: string, data: ExtractedBookingData): Promise<ProcessBookingResult> {
  const companyBase = await loadCompanyBaseContext()
  const salesperson = await resolveSalesperson(data.sellerEmail)
  const customer = await findOrCreateCustomer(data)

  const existingProject = await findExistingProjectForEvent(eventId)

  if (existingProject) {
    const accessCode = await ensureProjectAccessCode(existingProject.projectId, existingProject.accessCode)
    const project = buildProjectContextFromExisting(data, existingProject)

    await createPlanningAppointment(data, companyBase, customer, salesperson, project)
    const emailSent = await sendBookingConfirmation(data, customer, project, companyBase, accessCode)

    return {
      customerId: existingProject.customerId || customer.customerId,
      projectId: existingProject.projectId,
      orderNumber: existingProject.orderNumber,
      accessCode,
      emailSent,
    }
  }

  const company = await reserveOrderNumber(companyBase)
  const accessCode = generateAccessCode()
  const project = await createProject(data, eventId, company, customer, salesperson, accessCode)

  await createPlanningAppointment(data, companyBase, customer, salesperson, project)
  const emailSent = await sendBookingConfirmation(data, customer, project, companyBase, accessCode)

  return {
    customerId: customer.customerId,
    projectId: project.projectId,
    orderNumber: company.orderNumber,
    accessCode,
    emailSent,
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

  try {
    const result = await executeWithRetry('process-booking-workflow', () =>
      executeBookingWorkflow(eventId, data),
    )

    return {
      status: 'processed',
      result,
    }
  } catch (error) {
    await releaseWebhookEvent(eventId)
    throw error
  }
}
