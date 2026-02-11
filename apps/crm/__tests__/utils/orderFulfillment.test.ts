import {
  collectSupplierOrderCandidateInvoiceItemIds,
  deriveProjectDeliveryStatus,
  toFiniteNumber,
} from '@/lib/orders/orderFulfillment'

describe('orderFulfillment', () => {
  it('collects supplier candidates including explicit order-linked invoice items', () => {
    const candidates = collectSupplierOrderCandidateInvoiceItemIds(
      [
        { id: 'a', supplierId: 'supplier-1' },
        { id: 'b', supplierId: null },
        { id: 'c', supplierId: 'supplier-2' },
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
})
