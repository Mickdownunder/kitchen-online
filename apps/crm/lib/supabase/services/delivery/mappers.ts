import type {
  CustomerDeliveryNote,
  DeliveryNote,
  DeliveryNoteItem,
  GoodsReceipt,
  GoodsReceiptItem,
} from '@/types'
import type { DbRecord } from './types'
import { toNumber } from './validators'

function asRecord(value: unknown): DbRecord {
  return (value || {}) as DbRecord
}

function asRecordArray(value: unknown): DbRecord[] {
  return Array.isArray(value) ? (value as DbRecord[]) : []
}

export function mapDeliveryNoteItemFromDB(dbItem: unknown): DeliveryNoteItem {
  const row = asRecord(dbItem)

  return {
    id: String(row.id || ''),
    deliveryNoteId: String(row.delivery_note_id || ''),
    positionNumber:
      row.position_number !== undefined && row.position_number !== null
        ? toNumber(row.position_number as number | string)
        : undefined,
    description: String(row.description || ''),
    modelNumber: (row.model_number as string | null) || undefined,
    manufacturer: (row.manufacturer as string | null) || undefined,
    quantityOrdered: toNumber(row.quantity_ordered as number | string | null),
    quantityReceived: toNumber(row.quantity_received as number | string | null),
    unit: (row.unit as string | null) || 'Stk',
    matchedProjectItemId: (row.matched_project_item_id as string | null) || undefined,
    aiMatched: Boolean(row.ai_matched),
    aiConfidence:
      row.ai_confidence !== undefined && row.ai_confidence !== null
        ? parseFloat(String(row.ai_confidence))
        : undefined,
    status: String(row.status || '') as DeliveryNoteItem['status'],
    notes: (row.notes as string | null) || undefined,
    createdAt: String(row.created_at || ''),
  }
}

export function mapDeliveryNoteFromDB(dbNote: unknown): DeliveryNote {
  const row = asRecord(dbNote)

  return {
    id: String(row.id || ''),
    userId: String(row.user_id || ''),
    supplierName: String(row.supplier_name || ''),
    supplierDeliveryNoteNumber: String(row.supplier_delivery_note_number || ''),
    deliveryDate: String(row.delivery_date || ''),
    receivedDate: String(row.received_date || ''),
    status: String(row.status || '') as DeliveryNote['status'],
    aiMatched: Boolean(row.ai_matched),
    aiConfidence:
      row.ai_confidence !== undefined && row.ai_confidence !== null
        ? parseFloat(String(row.ai_confidence))
        : undefined,
    matchedProjectId: (row.matched_project_id as string | null) || undefined,
    matchedByUserId: (row.matched_by_user_id as string | null) || undefined,
    matchedAt: (row.matched_at as string | null) || undefined,
    documentUrl: (row.document_url as string | null) || undefined,
    rawText: (row.raw_text as string | null) || undefined,
    notes: (row.notes as string | null) || undefined,
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
    items: asRecordArray(row.delivery_note_items).map(mapDeliveryNoteItemFromDB),
  }
}

export function mapGoodsReceiptItemFromDB(dbItem: unknown): GoodsReceiptItem {
  const row = asRecord(dbItem)

  return {
    id: String(row.id || ''),
    goodsReceiptId: String(row.goods_receipt_id || ''),
    projectItemId: String(row.project_item_id || ''),
    deliveryNoteItemId: (row.delivery_note_item_id as string | null) || undefined,
    quantityReceived: toNumber(row.quantity_received as number | string | null),
    quantityExpected: toNumber(row.quantity_expected as number | string | null),
    status: String(row.status || '') as GoodsReceiptItem['status'],
    notes: (row.notes as string | null) || undefined,
    createdAt: String(row.created_at || ''),
  }
}

export function mapGoodsReceiptFromDB(dbReceipt: unknown): GoodsReceipt {
  const row = asRecord(dbReceipt)

  return {
    id: String(row.id || ''),
    projectId: String(row.project_id || ''),
    deliveryNoteId: (row.delivery_note_id as string | null) || undefined,
    userId: String(row.user_id || ''),
    receiptDate: String(row.receipt_date || ''),
    receiptType: String(row.receipt_type || '') as GoodsReceipt['receiptType'],
    status: String(row.status || '') as GoodsReceipt['status'],
    notes: (row.notes as string | null) || undefined,
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
    items: asRecordArray(row.goods_receipt_items).map(mapGoodsReceiptItemFromDB),
  }
}

export function mapCustomerDeliveryNoteFromDB(dbNote: unknown): CustomerDeliveryNote {
  const row = asRecord(dbNote)

  return {
    id: String(row.id || ''),
    projectId: String(row.project_id || ''),
    userId: String(row.user_id || ''),
    deliveryNoteNumber: String(row.delivery_note_number || ''),
    deliveryDate: String(row.delivery_date || ''),
    deliveryAddress: (row.delivery_address as string | null) || undefined,
    status: String(row.status || '') as CustomerDeliveryNote['status'],
    customerSignature: (row.customer_signature as string | null) || undefined,
    customerSignatureDate: (row.customer_signature_date as string | null) || undefined,
    signedBy: (row.signed_by as string | null) || undefined,
    items: (row.items as CustomerDeliveryNote['items']) || undefined,
    notes: (row.notes as string | null) || undefined,
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  }
}
