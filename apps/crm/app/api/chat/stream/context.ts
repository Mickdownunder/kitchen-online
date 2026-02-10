import type { SupabaseClient } from '@supabase/supabase-js'
import type { CustomerProject, Invoice, InvoiceScheduleType, InvoiceType } from '@/types'
import { buildProjectSummary } from '@/lib/ai/projectSummary'

interface BuildChatStreamContextResult {
  projectSummary: string
  appointmentsSummary: string
}

function toInvoiceType(value: unknown): InvoiceType {
  if (value === 'final' || value === 'credit' || value === 'partial') {
    return value
  }

  return 'partial'
}

function toInvoiceScheduleType(value: unknown): InvoiceScheduleType | undefined {
  if (value === 'first' || value === 'second' || value === 'manual') {
    return value
  }

  return undefined
}

function mapInvoiceRow(row: Record<string, unknown>): Invoice {
  return {
    id: String(row.id),
    userId: String(row.user_id ?? ''),
    projectId: String(row.project_id ?? ''),
    type: toInvoiceType(row.type),
    invoiceNumber: String(row.invoice_number ?? ''),
    amount: Number(row.amount ?? 0),
    netAmount: Number(row.net_amount ?? 0),
    taxAmount: Number(row.tax_amount ?? 0),
    taxRate: Number(row.tax_rate ?? 20),
    isPaid: Boolean(row.is_paid),
    invoiceDate: row.invoice_date ? String(row.invoice_date) : '',
    dueDate: row.due_date ? String(row.due_date) : undefined,
    paidDate: row.paid_date ? String(row.paid_date) : undefined,
    description: row.description ? String(row.description) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    scheduleType: toInvoiceScheduleType(row.schedule_type),
    reminders: Array.isArray(row.reminders) ? row.reminders : [],
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  }
}

async function loadInvoicesForSummary(
  supabase: SupabaseClient,
  projects: CustomerProject[],
): Promise<Invoice[]> {
  const projectIds = projects.map((project) => project.id).filter(Boolean)
  if (projectIds.length === 0) {
    return []
  }

  const { data: invoicesRows } = await supabase
    .from('invoices')
    .select(
      'id, project_id, type, invoice_number, amount, is_paid, net_amount, tax_amount, tax_rate, invoice_date, due_date, paid_date, description, notes, schedule_type, reminders, created_at, updated_at, user_id',
    )
    .in('project_id', projectIds)

  if (!invoicesRows?.length) {
    return []
  }

  return invoicesRows.map((row: Record<string, unknown>) => mapInvoiceRow(row))
}

async function loadAppointmentsSummary(
  supabase: SupabaseClient,
  companyId: string,
): Promise<string> {
  const { data: planningAppointments } = await supabase
    .from('planning_appointments')
    .select('customer_name, date, time, type, notes')
    .eq('company_id', companyId)
    .order('date', { ascending: true })
    .order('time', { ascending: true })

  if (!planningAppointments?.length) {
    return ''
  }

  const lines = planningAppointments.map(
    (appointment: {
      customer_name: string
      date: string
      time: string | null
      type: string
      notes: string | null
    }) => {
      const time = appointment.time ? ` ${appointment.time}` : ''
      const notes = appointment.notes
        ? ` - ${appointment.notes.slice(0, 80)}${appointment.notes.length > 80 ? '...' : ''}`
        : ''
      return `${appointment.date}${time} | ${appointment.type} | ${appointment.customer_name}${notes}`
    },
  )

  return lines.join('\n')
}

export async function buildChatStreamContext(
  supabase: SupabaseClient,
  companyId: string,
  projects: CustomerProject[],
): Promise<BuildChatStreamContextResult> {
  const [invoicesForSummary, appointmentsSummary] = await Promise.all([
    loadInvoicesForSummary(supabase, projects),
    loadAppointmentsSummary(supabase, companyId),
  ])

  return {
    projectSummary: buildProjectSummary(projects, invoicesForSummary),
    appointmentsSummary,
  }
}
