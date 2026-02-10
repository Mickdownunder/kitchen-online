import type {
  CustomerProject,
  Invoice,
  InvoiceScheduleType,
  InvoiceType,
  Reminder,
} from '@/types'
import type { Insert, Row, ServiceResult, Update } from '@/lib/types/service'

export type InvoiceRow = Row<'invoices'>
export type InvoiceInsert = Insert<'invoices'>
export type InvoiceUpdate = Update<'invoices'>

/**
 * `original_invoice_id` exists in DB for credit notes but is missing from generated types.
 */
export type InvoiceRowExt = InvoiceRow & {
  original_invoice_id?: string | null
  original_invoice_number?: string | null
}

export interface InvoiceProjectRow {
  id: string
  customer_name: string
  order_number: string
  customer_address: string | null
  customer_phone: string | null
  customer_email: string | null
  customer_id: string | null
  total_amount: number | null
  net_amount: number | null
  tax_amount: number | null
}

export type InvoiceWithProjectRow = InvoiceRowExt & {
  project: InvoiceProjectRow | null
}

export interface CreateInvoiceParams {
  projectId: string
  type: InvoiceType
  amount: number
  netAmount?: number
  taxAmount?: number
  taxRate?: number
  invoiceDate?: string
  dueDate?: string
  description?: string
  notes?: string
  scheduleType?: InvoiceScheduleType
  invoiceNumber?: string
}

export type UpdateInvoiceInput = Partial<
  Omit<Invoice, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
>

export interface CreateCreditNoteParams {
  invoiceId: string
  partialAmount?: number
  description?: string
  notes?: string
}

export interface InvoiceStats {
  totalInvoiced: number
  totalPaid: number
  totalOutstanding: number
  partialCount: number
  finalCount: number
  creditCount: number
  creditAmount: number
  paidCount: number
  overdueCount: number
}

export const EMPTY_INVOICE_STATS: InvoiceStats = {
  totalInvoiced: 0,
  totalPaid: 0,
  totalOutstanding: 0,
  partialCount: 0,
  finalCount: 0,
  creditCount: 0,
  creditAmount: 0,
  paidCount: 0,
  overdueCount: 0,
}

export interface InvoiceStatsRow {
  id: string
  amount: number | null
  is_paid: boolean | null
  type: string
  due_date: string | null
  invoice_date: string
}

export interface AuthenticatedUserLike {
  id: string
}

export interface PostgrestErrorLike {
  code?: string
  message?: string
}

export type AuthorizedUserId = ServiceResult<string>

export type InvoiceProject = CustomerProject

export type InvoiceReminders = Reminder[]
