import type { PaymentMethod, SupplierInvoice, SupplierInvoiceCategory } from '@/types'
import type { Insert, Row, Update } from '@/lib/types/service'

export type SupplierInvoiceRow = Row<'supplier_invoices'> & {
  skonto_percent?: number | null
  skonto_amount?: number | null
}
export type SupplierInvoiceInsert = Insert<'supplier_invoices'> & {
  skonto_percent?: number | null
  skonto_amount?: number | null
}
export type SupplierInvoiceUpdate = Update<'supplier_invoices'> & {
  skonto_percent?: number | null
  skonto_amount?: number | null
}

export type SupplierInvoiceCustomCategoryRow = Row<'supplier_invoice_custom_categories'>
export type SupplierInvoiceCustomCategoryInsert = Insert<'supplier_invoice_custom_categories'>

export interface CreateSupplierInvoiceInput {
  supplierName: string
  supplierUid?: string
  supplierAddress?: string
  invoiceNumber: string
  invoiceDate?: string
  dueDate?: string
  netAmount: number
  taxAmount?: number
  grossAmount?: number
  taxRate?: number
  category?: SupplierInvoiceCategory | string
  skontoPercent?: number
  skontoAmount?: number
  projectId?: string
  documentUrl?: string
  documentName?: string
  notes?: string
  datevAccount?: string
  costCenter?: string
}

export interface UpdateSupplierInvoiceInput {
  supplierName?: string
  supplierUid?: string
  supplierAddress?: string
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
  netAmount?: number
  taxAmount?: number
  grossAmount?: number
  taxRate?: number
  isPaid?: boolean
  paidDate?: string
  paymentMethod?: PaymentMethod
  category?: SupplierInvoiceCategory | string
  skontoPercent?: number
  skontoAmount?: number
  projectId?: string | null
  documentUrl?: string
  documentName?: string
  notes?: string
  datevAccount?: string
  costCenter?: string
}

export interface SupplierInvoiceCustomCategory {
  id: string
  userId: string
  name: string
  createdAt: string
}

export interface SupplierInvoiceStats {
  totalCount: number
  totalNetAmount: number
  totalTaxAmount: number
  totalGrossAmount: number
  paidCount: number
  paidAmount: number
  openCount: number
  openAmount: number
  overdueCount: number
  overdueAmount: number
  byCategory: {
    category: SupplierInvoiceCategory
    count: number
    netAmount: number
    taxAmount: number
  }[]
  byTaxRate: {
    taxRate: number
    count: number
    netAmount: number
    taxAmount: number
  }[]
}

export interface InputTaxBucket {
  taxRate: number
  netAmount: number
  taxAmount: number
}

export interface AuthenticatedUserLike {
  id: string
}

export interface PostgrestErrorLike {
  code?: string
}

export type SupplierInvoiceDateRange = Pick<SupplierInvoice, 'invoiceDate' | 'dueDate' | 'isPaid'>
