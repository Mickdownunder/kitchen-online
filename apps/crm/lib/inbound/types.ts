import type { Json } from '@/types/database.types'

export type InboundDocumentKind = 'ab' | 'supplier_delivery_note' | 'supplier_invoice' | 'unknown'

export type InboundProcessingStatus =
  | 'received'
  | 'classified'
  | 'preassigned'
  | 'needs_review'
  | 'confirmed'
  | 'rejected'
  | 'failed'

export interface NormalizedInboundAttachment {
  externalId: string
  fileName: string
  mimeType: string | null
  size: number | null
  contentBase64: string
}

export interface NormalizedInboundEmail {
  provider: 'resend' | 'generic'
  messageId: string
  fromEmail: string | null
  fromName: string | null
  to: string[]
  subject: string
  text: string | null
  html: string | null
  receivedAt: string
  attachments: NormalizedInboundAttachment[]
}

export interface DocumentSignals {
  kind: InboundDocumentKind
  confidence: number
  orderNumbers: string[]
  projectOrderNumbers: string[]
  abNumber?: string
  deliveryNoteNumber?: string
  invoiceNumber?: string
  supplierName?: string
  confirmedDeliveryDate?: string
  deliveryDate?: string
  invoiceDate?: string
  dueDate?: string
  deliveryWeek?: string
  netAmount?: number
  taxRate?: number
  category?: string
  warnings: string[]
  source: 'heuristic' | 'ai' | 'hybrid'
  raw?: Json
}

export interface SupplierOrderCandidate {
  orderId: string
  orderNumber: string
  projectId: string
  projectOrderNumber: string | null
  supplierName: string | null
  supplierOrderEmail: string | null
  supplierEmail: string | null
  score: number
  reasons: string[]
}

export interface AssignmentDecision {
  status: InboundProcessingStatus
  confidence: number
  assignedSupplierOrderId?: string
  assignedProjectId?: string
  candidates: SupplierOrderCandidate[]
}

export interface InboundRecipientContext {
  userId: string
  companyId: string | null
}

export interface InboundInboxItemPayload {
  userId: string
  companyId: string | null
  sourceProvider: string
  sourceMessageId: string
  sourceAttachmentId: string
  dedupeKey: string
  senderEmail: string | null
  senderName: string | null
  recipientEmail: string | null
  subject: string
  receivedAt: string
  storagePath: string
  fileName: string
  mimeType: string | null
  fileSize: number | null
  contentSha256: string
  extractedPayload?: Json
}

export interface InboundInboxRow {
  id: string
  user_id: string
  company_id: string | null
  source_provider: string
  source_message_id: string
  source_attachment_id: string
  dedupe_key: string
  sender_email: string | null
  sender_name: string | null
  recipient_email: string | null
  subject: string | null
  received_at: string
  storage_path: string
  file_name: string
  mime_type: string | null
  file_size: number | null
  content_sha256: string
  document_kind: string
  processing_status: string
  processing_error: string | null
  extracted_payload: Json
  assignment_candidates: Json
  assignment_confidence: number | null
  assigned_supplier_order_id: string | null
  assigned_project_id: string | null
  assigned_supplier_invoice_id: string | null
  confirmed_by_user_id: string | null
  confirmed_at: string | null
  rejected_reason: string | null
  created_at: string
  updated_at: string
}
