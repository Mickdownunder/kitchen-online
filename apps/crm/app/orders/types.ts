import type React from 'react'
import type { SupplierOrderItem, SupplierOrderStatus } from '@/types'
import type { SupplierOrderChannel } from '@/lib/orders/orderChannel'
import type { AbTimingStatus, SupplierWorkflowQueue } from '@/lib/orders/workflowQueue'

export type InstallationReservationStatus = 'draft' | 'requested' | 'confirmed' | 'cancelled'

export interface SupplierLookupOption {
  id: string
  name: string
  email: string | null
  order_email: string | null
}

export interface WorkflowProjectItem {
  id: string
  articleId?: string
  supplierId?: string
  description: string
  modelNumber?: string
  manufacturer?: string
  unit: string
  quantity: number
  quantityOrdered: number
  quantityDelivered: number
  deliveryStatus: string
}

export interface OrderWorkflowRow {
  key: string
  kind: 'supplier' | 'missing_supplier'
  projectId: string
  projectOrderNumber: string
  customerName: string
  installationDate?: string
  daysUntilInstallation?: number
  supplierId?: string
  supplierName: string
  supplierOrderEmail?: string
  orderId?: string
  supplierOrderNumber?: string
  orderStatus?: SupplierOrderStatus
  sentAt?: string
  abNumber?: string
  abReceivedAt?: string
  abConfirmedDeliveryDate?: string
  supplierDeliveryNoteId?: string
  goodsReceiptId?: string
  bookedAt?: string
  totalItems: number
  openOrderItems: number
  openDeliveryItems: number
  queue: SupplierWorkflowQueue
  queueLabel: string
  nextAction: string
  abTimingStatus: AbTimingStatus
  projectItems: WorkflowProjectItem[]
  unresolvedItems: WorkflowProjectItem[]
  orderItems: SupplierOrderItem[]
  orderChannel: SupplierOrderChannel
  installationReservationStatus?: InstallationReservationStatus
  installationReservationRequestedAt?: string
  installationReservationConfirmedDate?: string
  installationReservationCompany?: string
}

export interface EditableOrderItem {
  localId: string
  selected: boolean
  supplierId: string
  invoiceItemId?: string
  articleId?: string
  description: string
  modelNumber: string
  manufacturer: string
  quantity: string
  unit: string
  expectedDeliveryDate: string
  notes: string
}

export interface GoodsReceiptDraftItem {
  projectItemId: string
  description: string
  unit: string
  remainingQuantity: number
  receiveQuantity: string
}

export type SupplierDocumentKind = 'ab' | 'supplier_delivery_note'
export type EditorViewFilter = 'all' | 'selected' | 'missing_supplier'

export interface SupplierOrderAbAnalysisResult {
  kind: 'ab'
  abNumber?: string
  abNumberConfidence?: number
  confirmedDeliveryDate?: string
  confirmedDeliveryDateConfidence?: number
  deviationSummary?: string
  deviationSummaryConfidence?: number
  notes?: string
  notesConfidence?: number
  overallConfidence?: number
  warnings?: string[]
}

export interface SupplierOrderDeliveryAnalysisResult {
  kind: 'supplier_delivery_note'
  deliveryNoteNumber?: string
  deliveryNoteNumberConfidence?: number
  deliveryDate?: string
  deliveryDateConfidence?: number
  supplierNameFromDocument?: string
  supplierNameConfidence?: number
  notes?: string
  notesConfidence?: number
  overallConfidence?: number
  warnings?: string[]
}

export type QueueStyle = {
  chipClass: string
  rowClass: string
  icon: React.ComponentType<{ className?: string }>
}
