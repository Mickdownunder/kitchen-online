import type { InvoiceItemProcurementType } from '@/types'

export interface WorkflowGroupingItem {
  procurementType: InvoiceItemProcurementType
}

export interface MissingSupplierWorkflowGroup<TItem extends WorkflowGroupingItem> {
  key: 'external' | 'non_external'
  items: TItem[]
}

export function splitMissingSupplierItemsByProcurement<TItem extends WorkflowGroupingItem>(
  items: TItem[],
): MissingSupplierWorkflowGroup<TItem>[] {
  const externalItems = items.filter((item) => item.procurementType === 'external_order')
  const nonExternalItems = items.filter((item) => item.procurementType !== 'external_order')
  const groups: MissingSupplierWorkflowGroup<TItem>[] = []

  if (externalItems.length > 0) {
    groups.push({
      key: 'external',
      items: externalItems,
    })
  }

  if (nonExternalItems.length > 0) {
    groups.push({
      key: 'non_external',
      items: nonExternalItems,
    })
  }

  return groups
}
