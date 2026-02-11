import {
  groupSelectedOrderItemsBySupplier,
  mapProjectItemsToEditorItems,
} from '@/lib/orders/orderEditorUtils'

describe('orderEditorUtils', () => {
  describe('mapProjectItemsToEditorItems', () => {
    it('keeps all project positions visible and marks missing suppliers as unselected', () => {
      const rows = [
        {
          id: 'item-1',
          article_id: 'article-1',
          description: 'Backofen',
          model_number: 'HBG',
          manufacturer: 'Bosch',
          quantity: 2,
          unit: 'Stk',
          procurement_type: null,
          articles: { supplier_id: 'supplier-a' },
        },
        {
          id: 'item-2',
          article_id: 'article-2',
          description: 'Spuele',
          model_number: null,
          manufacturer: 'Blanco',
          quantity: 1,
          unit: 'Stk',
          procurement_type: null,
          articles: null,
        },
      ]

      const result = mapProjectItemsToEditorItems(rows)

      expect(result).toHaveLength(2)
      expect(result[0]?.selected).toBe(true)
      expect(result[0]?.supplierId).toBe('supplier-a')
      expect(result[1]?.selected).toBe(false)
      expect(result[1]?.supplierId).toBe('')
    })

    it('preselects only rows of the preferred supplier', () => {
      const rows = [
        {
          id: 'item-1',
          article_id: null,
          description: 'Kochfeld',
          model_number: null,
          manufacturer: null,
          quantity: 1,
          unit: null,
          procurement_type: null,
          articles: { supplier_id: 'supplier-a' },
        },
        {
          id: 'item-2',
          article_id: null,
          description: 'Abzug',
          model_number: null,
          manufacturer: null,
          quantity: 1,
          unit: null,
          procurement_type: null,
          articles: { supplier_id: 'supplier-b' },
        },
      ]

      const result = mapProjectItemsToEditorItems(rows, 'supplier-a')

      expect(result[0]?.selected).toBe(true)
      expect(result[1]?.selected).toBe(false)
    })

    it('does not preselect reservation-only rows for ordering', () => {
      const rows = [
        {
          id: 'item-1',
          article_id: null,
          description: 'Montage',
          model_number: null,
          manufacturer: null,
          quantity: 1,
          unit: null,
          procurement_type: 'reservation_only',
          articles: { supplier_id: 'supplier-a' },
        },
      ]

      const result = mapProjectItemsToEditorItems(rows)
      expect(result[0]?.selected).toBe(false)
      expect(result[0]?.procurementType).toBe('reservation_only')
    })
  })

  describe('groupSelectedOrderItemsBySupplier', () => {
    it('groups selected valid rows and reports selected rows without supplier', () => {
      const result = groupSelectedOrderItemsBySupplier([
        {
          selected: true,
          supplierId: 'supplier-a',
          invoiceItemId: 'item-1',
          articleId: 'article-1',
          description: 'Backofen',
          modelNumber: 'HBG',
          manufacturer: 'Bosch',
          quantity: '2',
          unit: 'Stk',
          expectedDeliveryDate: '2026-03-01',
          notes: 'Bitte montag',
          procurementType: 'external_order',
        },
        {
          selected: true,
          supplierId: '',
          invoiceItemId: 'item-2',
          description: 'Spuele',
          modelNumber: '',
          manufacturer: 'Blanco',
          quantity: '1',
          unit: 'Stk',
          procurementType: 'external_order',
        },
        {
          selected: false,
          supplierId: 'supplier-b',
          invoiceItemId: 'item-3',
          description: 'Kuehlschrank',
          modelNumber: '',
          manufacturer: 'Siemens',
          quantity: '1',
          unit: 'Stk',
          procurementType: 'external_order',
        },
      ])

      expect(result.selectedCount).toBe(2)
      expect(result.missingSupplierCount).toBe(1)
      expect(Object.keys(result.groups)).toEqual(['supplier-a'])
      expect(result.groups['supplier-a']).toHaveLength(1)
      expect(result.groups['supplier-a']?.[0]?.description).toBe('Backofen')
      expect(result.groups['supplier-a']?.[0]?.quantity).toBe(2)
    })

    it('does not include internal stock in supplier order payload groups', () => {
      const result = groupSelectedOrderItemsBySupplier([
        {
          selected: true,
          supplierId: 'supplier-a',
          invoiceItemId: 'item-1',
          description: 'Montageleistung',
          modelNumber: '',
          manufacturer: '',
          quantity: '1',
          unit: 'Stk',
          procurementType: 'reservation_only',
        },
      ])

      expect(result.selectedCount).toBe(1)
      expect(result.externalSelectedCount).toBe(0)
      expect(Object.keys(result.groups)).toHaveLength(0)
    })
  })
})
