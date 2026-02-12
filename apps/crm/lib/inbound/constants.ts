import type { InboundDocumentKind, InboundProcessingStatus } from './types'

export const INBOUND_MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024

export const INBOUND_ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
])

export const INBOUND_ALLOWED_DOCUMENT_KINDS = new Set<InboundDocumentKind>([
  'ab',
  'supplier_delivery_note',
  'supplier_invoice',
  'unknown',
])

export const INBOUND_ALLOWED_PROCESSING_STATUSES = new Set<InboundProcessingStatus>([
  'received',
  'classified',
  'preassigned',
  'needs_review',
  'confirmed',
  'rejected',
  'failed',
])

export const INBOUND_PREASSIGN_CONFIDENCE_THRESHOLD = 0.9
export const INBOUND_REVIEW_CONFIDENCE_THRESHOLD = 0.6
