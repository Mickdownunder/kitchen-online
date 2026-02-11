interface SupplierRelation {
  supplier_id: string | null
}

export type SupplierRelationValue = SupplierRelation | SupplierRelation[] | null

export interface ProjectInvoiceItemForOrderEditor {
  id: string
  article_id: string | null
  description: string | null
  model_number: string | null
  manufacturer: string | null
  quantity: number | string | null
  unit: string | null
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

    const selected = normalizedPreferredSupplier
      ? supplierId === normalizedPreferredSupplier
      : Boolean(supplierId)

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
    }
  })
}

export function groupSelectedOrderItemsBySupplier(
  items: GroupableOrderEditorItem[],
): GroupSelectedOrderItemsResult {
  const groups: Record<string, GroupedOrderPayloadItem[]> = {}
  let selectedCount = 0
  let missingSupplierCount = 0

  items.forEach((item) => {
    if (!item.selected) {
      return
    }

    selectedCount += 1

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
    missingSupplierCount,
    groups,
  }
}
