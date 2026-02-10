import type { SupabaseClient } from '@supabase/supabase-js'
import type { CustomerProject, Invoice, InvoiceScheduleType, InvoiceType } from '@/types'
import { buildProjectSummary } from '@/lib/ai/projectSummary'

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

export async function loadInvoicesForProjectSummary(
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

export async function buildProjectSummaryFromSupabase(
  supabase: SupabaseClient,
  projects: CustomerProject[],
): Promise<string> {
  const invoices = await loadInvoicesForProjectSummary(supabase, projects)
  return buildProjectSummary(projects, invoices)
}
