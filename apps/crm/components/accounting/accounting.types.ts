import type { CustomerProject, Invoice, SupplierInvoice } from '@/types'

export type TimeRange = 'month' | 'quarter' | 'year' | 'custom'
export type ExportType = 'uva' | 'invoices' | 'datev' | 'all'
export type AccountingTab = 'overview' | 'outgoing' | 'incoming' | 'bank' | 'inbound'

export interface DateRangeResult {
  startDate: Date
  endDate: Date
  label: string
}

export interface UVAEntry {
  taxRate: number
  netAmount: number
  taxAmount: number
  grossAmount: number
  invoiceCount: number
}

export interface InvoiceData {
  invoiceNumber: string
  date: string
  customerName: string
  netAmount: number
  taxRate: number
  taxAmount: number
  grossAmount: number
  isPaid: boolean
  paidDate?: string
  projectId: string
  orderNumber: string
  type: 'partial' | 'final' | 'credit'
}

export interface MissingInvoice {
  projectId: string
  orderNumber: string
  customerName: string
  kind: 'deposit' | 'final'
  date: string
  amountGross: number
}

export interface InputTaxEntry {
  taxRate: number
  netAmount: number
  taxAmount: number
}

export interface AccountingTotals {
  totalNet: number
  totalTax: number
  totalGross: number
  totalPaid: number
  totalOutstanding: number
  invoiceCount: number
  paidCount: number
}

export interface InputTaxTotals {
  totalNet: number
  totalTax: number
  count: number
}

export interface AccountingExportData {
  uvaData: UVAEntry[]
  totals: AccountingTotals
  filteredInvoices: InvoiceData[]
  supplierInvoices: SupplierInvoice[]
  inputTaxData: InputTaxEntry[]
  inputTaxTotals: InputTaxTotals
}

export interface AccountingBaseData {
  projects: CustomerProject[]
  dbInvoices: Invoice[]
}
