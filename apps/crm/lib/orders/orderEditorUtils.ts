interface SupplierRelation {
  supplier_id: string | null
}

export type InvoiceItemProcurementType = 'external_order' | 'internal_stock' | 'reservation_only'

export type SupplierRelationValue = SupplierRelation | SupplierRelation[] | null

export interface ProjectInvoiceItemForOrderEditor {
  id: string
  article_id: string | null
  description: string | null
  model_number: string | null
  manufacturer: string | null
  quantity: number | string | null
  unit: string | null
  procurement_type: string | null
  articles: SupplierRelationValue
}

export interface LoadedOrderEditorItem {
  invoiceItemId: string
  articleId?: string
  description: string
  modelNumber: string
  manufacturer: string
  quantity: string
  unit: string
  supplierId: string
  selected: boolean
  procurementType: InvoiceItemProcurementType
}

export interface GroupableOrderEditorItem {
  selected: boolean
  supplierId: string
  invoiceItemId?: string
  articleId?: string
  description: string
  modelNumber: string
  manufacturer: string
  quantity: string | number
  unit: string
  expectedDeliveryDate?: string
  notes?: string
  procurementType?: InvoiceItemProcurementType
}

export interface GroupedOrderPayloadItem {
  invoiceItemId?: string
  articleId?: string
  description: string
  modelNumber?: string
  manufacturer?: string
  quantity: number
  unit: string
  expectedDeliveryDate?: string
  notes?: string
}

export interface GroupSelectedOrderItemsResult {
  selectedCount: number
  externalSelectedCount: number
  nonExternalSelectedCount: number
  missingSupplierCount: number
  groups: Record<string, GroupedOrderPayloadItem[]>
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

export function getSupplierIdFromRelation(relation: SupplierRelationValue): string | null {
  if (!relation) {
    return null
  }

  if (Array.isArray(relation)) {
    return relation[0]?.supplier_id || null
  }

  return relation.supplier_id || null
}

export function mapProjectItemsToEditorItems(
  rows: ProjectInvoiceItemForOrderEditor[],
  preferredSupplierId?: string,
): LoadedOrderEditorItem[] {
  const normalizedPreferredSupplier = (preferredSupplierId || '').trim()

  return rows.map((row) => {
    const supplierId = getSupplierIdFromRelation(row.articles) || ''
    const quantityValue = Math.max(1, toNumber(row.quantity))
    const procurementType =
      row.procurement_type === 'internal_stock' || row.procurement_type === 'reservation_only'
        ? row.procurement_type
        : 'external_order'

    const selected =
      procurementType === 'external_order' &&
      (normalizedPreferredSupplier ? supplierId === normalizedPreferredSupplier : Boolean(supplierId))

    return {
      invoiceItemId: row.id,
      articleId: row.article_id || undefined,
      description: row.description || '',
      modelNumber: row.model_number || '',
      manufacturer: row.manufacturer || '',
      quantity: String(quantityValue),
      unit: row.unit || 'Stk',
      supplierId,
      selected,
      procurementType,
    }
  })
}

export function groupSelectedOrderItemsBySupplier(
  items: GroupableOrderEditorItem[],
): GroupSelectedOrderItemsResult {
  const groups: Record<string, GroupedOrderPayloadItem[]> = {}
  let selectedCount = 0
  let externalSelectedCount = 0
  let nonExternalSelectedCount = 0
  let missingSupplierCount = 0

  items.forEach((item) => {
    if (!item.selected) {
      return
    }

    selectedCount += 1
    const procurementType =
      item.procurementType === 'internal_stock' || item.procurementType === 'reservation_only'
        ? item.procurementType
        : 'external_order'
    if (procurementType !== 'external_order') {
      nonExternalSelectedCount += 1
      return
    }

    externalSelectedCount += 1

    const description = item.description.trim()
    const quantityValue = Math.max(0, toNumber(item.quantity))
    if (!description || quantityValue <= 0) {
      return
    }

    const supplierId = item.supplierId.trim()
    if (!supplierId) {
      missingSupplierCount += 1
      return
    }

    if (!groups[supplierId]) {
      groups[supplierId] = []
    }

    const existingIds = new Set(
      groups[supplierId].map((g) => g.invoiceItemId).filter((id): id is string => Boolean(id)),
    )
    if (item.invoiceItemId && existingIds.has(item.invoiceItemId)) {
      return
    }
    if (item.invoiceItemId) {
      existingIds.add(item.invoiceItemId)
    }

    groups[supplierId].push({
      invoiceItemId: item.invoiceItemId,
      articleId: item.articleId,
      description,
      modelNumber: item.modelNumber.trim() || undefined,
      manufacturer: item.manufacturer.trim() || undefined,
      quantity: quantityValue,
      unit: item.unit.trim() || 'Stk',
      expectedDeliveryDate: item.expectedDeliveryDate || undefined,
      notes: item.notes?.trim() || undefined,
    })
  })

  return {
    selectedCount,
    externalSelectedCount,
    nonExternalSelectedCount,
    missingSupplierCount,
    groups,
  }
}
