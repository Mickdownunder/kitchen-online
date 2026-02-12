export type InboundDocumentKind = 'ab' | 'supplier_delivery_note' | 'supplier_invoice' | 'unknown'

export type InboundProcessingStatus =
  | 'received'
  | 'classified'
  | 'preassigned'
  | 'needs_review'
  | 'confirmed'
  | 'rejected'
  | 'failed'

export type InboundStatusPreset = 'open' | 'review' | 'done' | 'all'

export interface InboundInboxItem {
  id: string
  file_name: string
  mime_type: string | null
  file_size: number | null
  sender_email: string | null
  sender_name: string | null
  recipient_email: string | null
  subject: string | null
  received_at: string
  document_kind: string
  processing_status: string
  processing_error: string | null
  extracted_payload: unknown
  assignment_candidates: unknown
  assignment_confidence: number | null
  assigned_supplier_order_id: string | null
  assigned_project_id: string | null
  assigned_supplier_invoice_id: string | null
  confirmed_at: string | null
  rejected_reason: string | null
}

export interface InboundCandidate {
  orderId: string
  orderNumber?: string
  projectId?: string
  projectOrderNumber?: string | null
  supplierName?: string | null
  score?: number
  reasons?: string[]
}

export interface InboundSignals {
  kind?: InboundDocumentKind
  abNumber?: string
  confirmedDeliveryDate?: string
  deliveryNoteNumber?: string
  deliveryDate?: string
  supplierName?: string
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
  netAmount?: number
  taxRate?: number
  category?: string
  deliveryWeek?: string
  warnings: string[]
}

