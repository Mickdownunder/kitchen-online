import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  PackageCheck,
} from 'lucide-react'
import { confidenceBand, normalizeConfidence } from '@/lib/orders/documentAnalysisConfidence'
import type { SupplierOrderStatus } from '@/types'
import type {
  EditableOrderItem,
  GoodsReceiptDraftItem,
  OrderWorkflowRow,
  QueueStyle,
} from './types'
import type { SupplierWorkflowQueue } from '@/lib/orders/workflowQueue'

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const ORDER_SENT_OR_LATER_STATUSES = new Set<SupplierOrderStatus>([
  'sent',
  'ab_received',
  'delivery_note_received',
  'goods_receipt_open',
  'goods_receipt_booked',
  'ready_for_installation',
])

export const QUEUE_STYLES: Record<SupplierWorkflowQueue, QueueStyle> = {
  zu_bestellen: {
    chipClass: 'border-slate-300 bg-slate-100 text-slate-700',
    rowClass: 'bg-slate-50',
    icon: ClipboardCheck,
  },
  brennt: {
    chipClass: 'border-red-200 bg-red-50 text-red-700',
    rowClass: 'bg-red-50/40',
    icon: AlertTriangle,
  },
  ab_fehlt: {
    chipClass: 'border-slate-300 bg-slate-100 text-slate-700',
    rowClass: 'bg-slate-50',
    icon: FileCheck2,
  },
  wareneingang_offen: {
    chipClass: 'border-slate-300 bg-slate-100 text-slate-700',
    rowClass: 'bg-slate-50',
    icon: PackageCheck,
  },
  reservierung_offen: {
    chipClass: 'border-amber-200 bg-amber-50 text-amber-700',
    rowClass: 'bg-amber-50/40',
    icon: ClipboardCheck,
  },
  montagebereit: {
    chipClass: 'border-slate-300 bg-slate-100 text-slate-700',
    rowClass: 'bg-slate-50',
    icon: CheckCircle2,
  },
  erledigt: {
    chipClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rowClass: 'bg-emerald-50/30',
    icon: CheckCircle2,
  },
}

export function formatDate(value?: string): string {
  if (!value) {
    return '—'
  }

  const normalized = value.includes('T') ? value.slice(0, 10) : value
  const parsed = new Date(`${normalized}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString('de-DE')
}

export function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

export function formatConfidence(value: number | undefined): string {
  return `${Math.round(normalizeConfidence(value) * 100)}%`
}

export function confidenceClass(value: number | undefined): string {
  const band = confidenceBand(normalizeConfidence(value))
  if (band === 'high') {
    return 'text-emerald-700'
  }
  if (band === 'medium') {
    return 'text-amber-700'
  }
  return 'text-red-700'
}

export function isOrderSent(row: OrderWorkflowRow): boolean {
  return Boolean(row.sentAt) || Boolean(row.orderStatus && ORDER_SENT_OR_LATER_STATUSES.has(row.orderStatus))
}

export function hasAB(row: OrderWorkflowRow): boolean {
  return Boolean(row.abReceivedAt || row.abNumber || row.abConfirmedDeliveryDate)
}

export function hasDeliveryNote(row: OrderWorkflowRow): boolean {
  return Boolean(row.supplierDeliveryNoteId)
}

export function hasGoodsReceipt(row: OrderWorkflowRow): boolean {
  return Boolean(row.goodsReceiptId || row.bookedAt)
}

export function createEmptyEditableItem(defaultSupplierId?: string): EditableOrderItem {
  return {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    selected: true,
    supplierId: (defaultSupplierId || '').trim(),
    description: '',
    modelNumber: '',
    manufacturer: '',
    quantity: '1',
    unit: 'Stk',
    expectedDeliveryDate: '',
    notes: '',
    procurementType: 'external_order',
  }
}

export function mapRowItemsToEditableItems(row: OrderWorkflowRow): EditableOrderItem[] {
  if (row.orderItems.length > 0) {
    const projectItemById = new Map(
      [...row.projectItems, ...row.unresolvedItems].map((item) => [item.id, item]),
    )

    return row.orderItems.map((item, index) => ({
      procurementType:
        (item.invoiceItemId ? projectItemById.get(item.invoiceItemId)?.procurementType : undefined) ||
        'external_order',
      localId: `${item.id}-${index}`,
      selected:
        ((item.invoiceItemId ? projectItemById.get(item.invoiceItemId)?.procurementType : undefined) ||
          'external_order') === 'external_order',
      supplierId: row.supplierId || '',
      invoiceItemId: item.invoiceItemId,
      articleId: item.articleId,
      description: item.description,
      modelNumber: item.modelNumber || '',
      manufacturer: item.manufacturer || '',
      quantity: String(item.quantity),
      unit: item.unit || 'Stk',
      expectedDeliveryDate: item.expectedDeliveryDate || '',
      notes: item.notes || '',
    }))
  }

  const source = row.kind === 'missing_supplier' ? row.unresolvedItems : row.projectItems
  return source.map((item, index) => ({
    localId: `${item.id}-${index}`,
    selected:
      item.procurementType === 'external_order'
        ? row.kind === 'supplier'
          ? true
          : Boolean(item.supplierId)
        : false,
    supplierId: item.supplierId || row.supplierId || '',
    invoiceItemId: item.id,
    articleId: item.articleId,
    description: item.description,
    modelNumber: item.modelNumber || '',
    manufacturer: item.manufacturer || '',
    quantity: String(item.quantity),
    unit: item.unit || 'Stk',
    expectedDeliveryDate: '',
    notes: '',
    procurementType: item.procurementType || 'external_order',
  }))
}

export function buildGoodsReceiptDraftItems(row: OrderWorkflowRow): GoodsReceiptDraftItem[] {
  if (row.kind !== 'supplier') {
    return []
  }

  return row.projectItems
    .map((item) => ({
      projectItemId: item.id,
      description: item.description,
      unit: item.unit || 'Stk',
      remainingQuantity: Math.max(0, item.quantity - item.quantityDelivered),
      receiveQuantity: String(Math.max(0, item.quantity - item.quantityDelivered)),
    }))
    .filter((item) => item.remainingQuantity > 0 && UUID_PATTERN.test(item.projectItemId))
}
