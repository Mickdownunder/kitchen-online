import { splitMissingSupplierItemsByProcurement } from '@/lib/orders/workflowGrouping'

describe('workflowGrouping', () => {
  it('splits mixed missing-supplier items into external and non-external groups', () => {
    const groups = splitMissingSupplierItemsByProcurement([
      { procurementType: 'external_order' as const, id: 'a' },
      { procurementType: 'reservation_only' as const, id: 'b' },
      { procurementType: 'internal_stock' as const, id: 'c' },
    ])

    expect(groups).toHaveLength(2)
    expect(groups[0]?.key).toBe('external')
    expect(groups[0]?.items.map((item) => item.id)).toEqual(['a'])
    expect(groups[1]?.key).toBe('non_external')
    expect(groups[1]?.items.map((item) => item.id)).toEqual(['b', 'c'])
  })

  it('keeps a single group when all items are reservation/internal only', () => {
    const groups = splitMissingSupplierItemsByProcurement([
      { procurementType: 'reservation_only' as const, id: 'b' },
      { procurementType: 'internal_stock' as const, id: 'c' },
    ])

    expect(groups).toEqual([
      {
        key: 'non_external',
        items: [
          { procurementType: 'reservation_only', id: 'b' },
          { procurementType: 'internal_stock', id: 'c' },
        ],
      },
    ])
  })
})
