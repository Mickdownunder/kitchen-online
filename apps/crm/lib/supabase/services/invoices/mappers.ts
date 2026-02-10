import type {
  CustomerProject,
  Invoice,
  InvoiceScheduleType,
  InvoiceType,
  Reminder,
} from '@/types'
import { roundTo2Decimals } from '@/lib/utils/priceCalculations'
import type {
  CreateInvoiceParams,
  InvoiceInsert,
  InvoiceProject,
  InvoiceProjectRow,
  InvoiceRowExt,
  InvoiceStats,
  InvoiceStatsRow,
  InvoiceUpdate,
  InvoiceWithProjectRow,
  UpdateInvoiceInput,
} from './types'

function computeOverdueDays(row: InvoiceRowExt): number | undefined {
  if (row.is_paid || !row.due_date) {
    return undefined
  }

  const dueDate = new Date(row.due_date)
  const today = new Date()
  const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

  return diffDays > 0 ? diffDays : undefined
}

export function mapInvoiceFromRow(row: InvoiceRowExt): Invoice {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    invoiceNumber: row.invoice_number,
    type: row.type as InvoiceType,
    amount: row.amount ?? 0,
    netAmount: row.net_amount ?? 0,
    taxAmount: row.tax_amount ?? 0,
    taxRate: row.tax_rate ?? 20,
    invoiceDate: row.invoice_date,
    dueDate: row.due_date ?? undefined,
    isPaid: row.is_paid ?? false,
    paidDate: row.paid_date ?? undefined,
    description: row.description ?? undefined,
    notes: row.notes ?? undefined,
    scheduleType: (row.schedule_type as InvoiceScheduleType) ?? undefined,
    originalInvoiceId: row.original_invoice_id ?? undefined,
    originalInvoiceNumber: row.original_invoice_number ?? undefined,
    reminders: (row.reminders as unknown as Reminder[]) ?? [],
    overdueDays: computeOverdueDays(row),
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  }
}

function mapProjectFromRow(project: InvoiceProjectRow): InvoiceProject {
  return {
    id: project.id,
    customerName: project.customer_name,
    orderNumber: project.order_number,
    address: project.customer_address,
    phone: project.customer_phone,
    email: project.customer_email,
    customerId: project.customer_id,
    totalAmount: project.total_amount,
    netAmount: project.net_amount,
    taxAmount: project.tax_amount,
  } as CustomerProject
}

export function mapInvoiceWithProjectFromRow(row: InvoiceWithProjectRow): Invoice {
  const invoice = mapInvoiceFromRow(row)

  if (row.project) {
    invoice.project = mapProjectFromRow(row.project)
  }

  return invoice
}

export function mapCreateInvoiceToInsert(
  userId: string,
  invoiceNumber: string,
  params: CreateInvoiceParams & { invoiceDate: string },
): InvoiceInsert {
  const taxRate = params.taxRate || 20
  const amountRounded = roundTo2Decimals(params.amount)

  let netAmount = params.netAmount
  let taxAmount = params.taxAmount

  if (netAmount === undefined || taxAmount === undefined) {
    const netRounded = roundTo2Decimals(amountRounded / (1 + taxRate / 100))
    netAmount = netRounded
    taxAmount = roundTo2Decimals(amountRounded - netRounded)
  }

  return {
    user_id: userId,
    project_id: params.projectId,
    invoice_number: invoiceNumber,
    type: params.type,
    amount: amountRounded,
    net_amount: netAmount,
    tax_amount: taxAmount,
    tax_rate: taxRate,
    invoice_date: params.invoiceDate,
    due_date: params.dueDate ?? null,
    description: params.description ?? null,
    notes: params.notes ?? null,
    schedule_type: params.scheduleType ?? null,
    is_paid: false,
    reminders: [],
  }
}

export function mapInvoiceUpdateToRow(updates: UpdateInvoiceInput): InvoiceUpdate {
  const updateData: InvoiceUpdate = {}

  if (updates.projectId !== undefined) updateData.project_id = updates.projectId
  if (updates.invoiceNumber !== undefined) updateData.invoice_number = updates.invoiceNumber
  if (updates.type !== undefined) updateData.type = updates.type
  if (updates.amount !== undefined) updateData.amount = roundTo2Decimals(updates.amount)
  if (updates.netAmount !== undefined) updateData.net_amount = roundTo2Decimals(updates.netAmount)
  if (updates.taxAmount !== undefined) updateData.tax_amount = roundTo2Decimals(updates.taxAmount)
  if (updates.taxRate !== undefined) updateData.tax_rate = updates.taxRate
  if (updates.invoiceDate !== undefined) updateData.invoice_date = updates.invoiceDate
  if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate
  if (updates.isPaid !== undefined) updateData.is_paid = updates.isPaid
  if (updates.paidDate !== undefined) updateData.paid_date = updates.paidDate
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.notes !== undefined) updateData.notes = updates.notes
  if (updates.scheduleType !== undefined) updateData.schedule_type = updates.scheduleType
  if (updates.reminders !== undefined) {
    updateData.reminders = updates.reminders as unknown as InvoiceUpdate['reminders']
  }

  return updateData
}

export function buildInvoiceStats(rows: InvoiceStatsRow[], today: string): InvoiceStats {
  const creditNotes = rows.filter((row) => row.type === 'credit')

  return {
    totalInvoiced: rows.reduce((sum, row) => sum + (row.amount ?? 0), 0),
    totalPaid: rows.filter((row) => row.is_paid).reduce((sum, row) => sum + (row.amount ?? 0), 0),
    totalOutstanding: rows
      .filter((row) => !row.is_paid)
      .reduce((sum, row) => sum + (row.amount ?? 0), 0),
    partialCount: rows.filter((row) => row.type === 'partial').length,
    finalCount: rows.filter((row) => row.type === 'final').length,
    creditCount: creditNotes.length,
    creditAmount: creditNotes.reduce((sum, row) => sum + Math.abs(row.amount ?? 0), 0),
    paidCount: rows.filter((row) => row.is_paid).length,
    overdueCount: rows.filter((row) => !row.is_paid && row.due_date && row.due_date < today).length,
  }
}
