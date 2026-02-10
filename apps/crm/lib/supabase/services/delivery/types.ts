import type {
  CustomerDeliveryNote,
  DeliveryNote,
  DeliveryNoteItem,
  GoodsReceipt,
  GoodsReceiptItem,
} from '@/types'

export type CreateDeliveryNoteInput = Omit<
  DeliveryNote,
  'id' | 'createdAt' | 'updatedAt' | 'userId'
> & {
  items?: DeliveryNoteItem[]
}

export type UpdateDeliveryNoteInput = Partial<DeliveryNote>

export type CreateGoodsReceiptInput = Omit<GoodsReceipt, 'id' | 'createdAt' | 'updatedAt'> & {
  items?: GoodsReceiptItem[]
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
