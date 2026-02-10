import {
  BankAccount,
  CompanySettings,
  CustomerDeliveryNote,
  CustomerProject,
  DeliveryNote,
  Invoice,
} from '@/types'

export type DocumentType =
  | 'all'
  | 'invoices'
  | 'customer-delivery-notes'
  | 'supplier-delivery-notes'
  | 'offers'
  | 'plans'
  | 'orders'

export interface DocumentItem {
  id: string
  type:
    | 'invoice'
    | 'customer-delivery-note'
    | 'supplier-delivery-note'
    | 'offer'
    | 'plan'
    | 'order'
    | 'other'
  title: string
  date: string
  number?: string
  status?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
}

export interface SignatureAudit {
  ip_address: string | null
  user_agent: string | null
  geodata: { country?: string; city?: string; lat?: number; lon?: number } | null
}

export interface UseProjectDocumentActionOptions {
  project: CustomerProject
  companySettings: CompanySettings | null
  onDocumentPublished: (doc: DocumentItem) => void
}

export interface BuildInvoiceDataContext {
  project: CustomerProject
  companySettings: CompanySettings | null
  bankAccount: BankAccount | null
}

export type PortalPublishableDocumentType = 'invoice' | 'customer-delivery-note' | 'order'

export interface InvoicePreviewContext {
  invoice: Invoice
  project: CustomerProject
}

export interface CustomerDeliveryNotePreviewContext {
  note: CustomerDeliveryNote
  project: CustomerProject
}

export interface SupplierDeliveryNotePreviewContext {
  note: DeliveryNote
  project: CustomerProject
}
