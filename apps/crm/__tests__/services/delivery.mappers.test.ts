import {
  mapCustomerDeliveryNoteFromDB,
  mapDeliveryNoteFromDB,
  mapDeliveryNoteItemFromDB,
  mapGoodsReceiptFromDB,
  mapGoodsReceiptItemFromDB,
} from '@/lib/supabase/services/delivery/mappers'

describe('delivery mappers', () => {
  it('maps delivery note item with numeric coercion', () => {
    const item = mapDeliveryNoteItemFromDB({
      id: 'i-1',
      delivery_note_id: 'dn-1',
      description: 'Schrank',
      quantity_ordered: '2',
      quantity_received: '1',
      unit: null,
      status: 'received',
      created_at: '2026-01-01',
    })

    expect(item).toEqual(
      expect.objectContaining({
        id: 'i-1',
        deliveryNoteId: 'dn-1',
        quantityOrdered: 2,
        quantityReceived: 1,
        unit: 'Stk',
      }),
    )
  })

  it('maps delivery note including nested items', () => {
    const note = mapDeliveryNoteFromDB({
      id: 'dn-1',
      user_id: 'user-1',
      supplier_name: 'Lieferant',
      supplier_delivery_note_number: 'LS-1',
      delivery_date: '2026-01-01',
      received_date: '2026-01-02',
      status: 'received',
      delivery_note_items: [
        {
          id: 'i-1',
          delivery_note_id: 'dn-1',
          description: 'Schrank',
          quantity_ordered: 2,
          quantity_received: 2,
          status: 'received',
          created_at: '2026-01-01',
        },
      ],
    })

    expect(note.id).toBe('dn-1')
    expect(note.items).toHaveLength(1)
    expect(note.items?.[0].description).toBe('Schrank')
  })

  it('maps goods receipt and items', () => {
    const item = mapGoodsReceiptItemFromDB({
      id: 'gri-1',
      goods_receipt_id: 'gr-1',
      project_item_id: 'pi-1',
      quantity_received: '3',
      quantity_expected: '4',
      status: 'received',
      created_at: '2026-01-01',
    })

    expect(item.quantityReceived).toBe(3)
    expect(item.quantityExpected).toBe(4)

    const receipt = mapGoodsReceiptFromDB({
      id: 'gr-1',
      project_id: 'proj-1',
      user_id: 'user-1',
      receipt_date: '2026-01-01',
      receipt_type: 'delivery',
      status: 'received',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      goods_receipt_items: [
        {
          id: 'gri-1',
          goods_receipt_id: 'gr-1',
          project_item_id: 'pi-1',
          quantity_received: 3,
          quantity_expected: 4,
          status: 'received',
          created_at: '2026-01-01',
        },
      ],
    })

    expect(receipt.id).toBe('gr-1')
    expect(receipt.items).toHaveLength(1)
  })

  it('maps customer delivery note', () => {
    const note = mapCustomerDeliveryNoteFromDB({
      id: 'cdn-1',
      project_id: 'proj-1',
      user_id: 'user-1',
      delivery_note_number: 'KLS-1',
      delivery_date: '2026-01-01',
      status: 'draft',
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    })

    expect(note).toEqual(
      expect.objectContaining({
        id: 'cdn-1',
        deliveryNoteNumber: 'KLS-1',
        status: 'draft',
      }),
    )
  })
})
