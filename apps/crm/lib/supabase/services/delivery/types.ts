import type {
  CustomerDeliveryNote,
  DeliveryNote,
  DeliveryNoteItem,
  GoodsReceiptItemStatus,
} from '@/types'

export type CreateDeliveryNoteInput = Omit<
  DeliveryNote,
  'id' | 'createdAt' | 'updatedAt' | 'userId'
> & {
  items?: DeliveryNoteItem[]
}

export type UpdateDeliveryNoteInput = Partial<DeliveryNote>

export interface CreateGoodsReceiptInput {
  projectId: string
  deliveryNoteId?: string
  supplierOrderId?: string
  receiptDate?: string
  receiptType: 'partial' | 'complete'
  idempotencyKey?: string
  status?: 'pending' | 'verified' | 'booked'
  notes?: string
  items?: Array<{
    projectItemId: string
    deliveryNoteItemId?: string
    quantityReceived: number
    quantityExpected: number
    status?: GoodsReceiptItemStatus
    notes?: string
  }>
}

export type CreateCustomerDeliveryNoteInput = Omit<
  CustomerDeliveryNote,
  'id' | 'createdAt' | 'updatedAt' | 'userId'
> & {
  deliveryNoteNumber?: string
}

export type UpdateCustomerDeliveryNoteInput = Partial<CustomerDeliveryNote>

export interface AuthenticatedUserLike {
  id: string
}

export interface PostgrestErrorLike {
  code?: string
  message?: string
  details?: string
  hint?: string
}

export type DbRecord = Record<string, unknown>

export interface InvoiceItemDeliveryRow {
  quantity: number | string | null
  quantity_ordered: number | string | null
  quantity_delivered: number | string | null
  delivery_status: string | null
}

export interface ProjectDeliveryItemRow {
  delivery_status: string | null
  quantity: number | string | null
  quantity_ordered: number | string | null
  quantity_delivered: number | string | null
}
