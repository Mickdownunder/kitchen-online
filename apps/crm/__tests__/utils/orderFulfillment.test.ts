import {
  collectSupplierOrderCandidateInvoiceItemIds,
  deriveInternalStockFulfillmentQuantity,
  deriveProjectDeliveryStatus,
  shouldResetSyntheticInternalStockProgress,
  toFiniteNumber,
} from '@/lib/orders/orderFulfillment'

describe('orderFulfillment', () => {
  it('collects supplier candidates including explicit order-linked invoice items', () => {
    const candidates = collectSupplierOrderCandidateInvoiceItemIds(
      [
        { id: 'a', supplierId: 'supplier-1', procurementType: 'external_order' },
        { id: 'b', supplierId: null, procurementType: 'external_order' },
        { id: 'c', supplierId: 'supplier-2', procurementType: 'external_order' },
      ],
      'supplier-1',
      ['b'],
    )

    expect(Array.from(candidates).sort()).toEqual(['a', 'b'])
  })

  it('derives fully_ordered state when all items ordered but not delivered', () => {
    const result = deriveProjectDeliveryStatus([
      {
        delivery_status: 'ordered',
        quantity: 3,
        quantity_ordered: 3,
        quantity_delivered: 0,
      },
      {
        delivery_status: 'ordered',
        quantity: 2,
        quantity_ordered: 2,
        quantity_delivered: 0,
      },
    ])

    expect(result.status).toBe('fully_ordered')
    expect(result.allDelivered).toBe(false)
  })

  it('derives fully_delivered state and normalizes numeric inputs', () => {
    expect(toFiniteNumber('3.5')).toBe(3.5)

    const result = deriveProjectDeliveryStatus([
      {
        delivery_status: 'delivered',
        quantity: '2',
        quantity_ordered: '2',
        quantity_delivered: '2',
      },
    ])

    expect(result.status).toBe('fully_delivered')
    expect(result.allDelivered).toBe(true)
  })

  it('ignores reservation_only items for project delivery progress', () => {
    const result = deriveProjectDeliveryStatus([
      {
        delivery_status: 'not_ordered',
        quantity: 1,
        quantity_ordered: 0,
        quantity_delivered: 0,
        procurement_type: 'reservation_only',
      },
    ])

    expect(result.status).toBe('fully_delivered')
    expect(result.allDelivered).toBe(true)
  })

  it('includes external_order items with no supplier when marking order sent (fix 5/8 display)', () => {
    const candidates = collectSupplierOrderCandidateInvoiceItemIds(
      [
        { id: 'a', supplierId: 'supplier-1', procurementType: 'external_order' },
        { id: 'b', supplierId: 'supplier-1', procurementType: 'external_order' },
        { id: 'c', supplierId: null, procurementType: 'external_order' },
        { id: 'd', supplierId: '', procurementType: 'external_order' },
      ],
      'supplier-1',
      ['a'],
    )
    expect(Array.from(candidates).sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('skips non-external items for supplier ordering candidates', () => {
    const candidates = collectSupplierOrderCandidateInvoiceItemIds(
      [
        { id: 'external', supplierId: 'supplier-1', procurementType: 'external_order' },
        { id: 'stock', supplierId: 'supplier-1', procurementType: 'internal_stock' },
      ],
      'supplier-1',
      ['stock'],
    )

    expect(Array.from(candidates)).toEqual(['external'])
  })

  it('derives internal-stock fulfillment quantity without decreasing persisted progress', () => {
    const quantity = deriveInternalStockFulfillmentQuantity(
      {
        delivery_status: 'partially_delivered',
        quantity: 2,
        quantity_ordered: 3,
        quantity_delivered: 1,
      },
      1,
    )

    expect(quantity).toBe(3)
  })

  it('resets synthetic internal-stock progress only for fully auto-fulfilled rows', () => {
    expect(
      shouldResetSyntheticInternalStockProgress({
        delivery_status: 'delivered',
        quantity: 2,
        quantity_ordered: 2,
        quantity_delivered: 2,
      }),
    ).toBe(true)

    expect(
      shouldResetSyntheticInternalStockProgress({
        delivery_status: 'partially_delivered',
        quantity: 2,
        quantity_ordered: 2,
        quantity_delivered: 1,
      }),
    ).toBe(false)
  })
})
