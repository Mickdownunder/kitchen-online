'use client'

import type { InvoiceItem, CustomerProject } from '@/types'
import {
  calculateItemTotalsFromGross,
  calculateItemTotalsFromNet,
} from '@/lib/utils/priceCalculations'

interface UseProjectItemsProps {
  formData: Partial<CustomerProject>
  setFormData: React.Dispatch<React.SetStateAction<Partial<CustomerProject>>>
}

interface UseProjectItemsResult {
  addItem: () => void
  updateItem: (id: string, updates: Partial<InvoiceItem>) => void
  removeItem: (id: string) => void
}

/**
 * Hook für CRUD-Operationen für Invoice-Items
 */
export function useProjectItems({
  formData: _formData,
  setFormData,
}: UseProjectItemsProps): UseProjectItemsResult {
  void _formData
  const addItem = (): void => {
    setFormData(prev => {
      const items = prev.items || []
      const newItem: InvoiceItem = {
        id: Date.now().toString(),
        position: items.length + 1,
        description: '',
        quantity: 1,
        unit: 'Stk',
        pricePerUnit: 0,
        purchasePricePerUnit: undefined, // Wird später bei Lieferantenrechnung erfasst
        taxRate: 20,
        netTotal: 0,
        taxAmount: 0,
        grossTotal: 0,
      }
      return { ...prev, items: [...items, newItem] }
    })
  }

  const updateItem = (id: string, updates: Partial<InvoiceItem>): void => {
    setFormData(prev => {
      return {
        ...prev,
        items: (prev.items || []).map(item => {
          if (item.id === id) {
            const updated = { ...item, ...updates }

            // BRUTTO-EXAKT: Wenn wir eine Brutto-Quelle haben (grossTotal oder grossPricePerUnit),
            // dann behandeln wir Brutto als "Wahrheit" und rechnen Netto/MwSt rückwärts.
            const hasGrossTotalUpdate =
              updates.grossTotal !== undefined && updates.grossTotal !== null
            const hasGrossPerUnit =
              updated.grossPricePerUnit !== undefined && updated.grossPricePerUnit !== null

            if (hasGrossTotalUpdate || hasGrossPerUnit) {
              const quantity = updated.quantity || 1
              const taxRate = updated.taxRate || 20
              // Gross total: either explicit (e.g. quantity * grossPerUnit), or derived from grossPerUnit
              const grossPricePerUnit = hasGrossTotalUpdate
                ? (updates.grossTotal as number) / quantity
                : (updated.grossPricePerUnit as number)

              // Verwende zentrale Utility-Funktion für Brutto-basierte Berechnung
              const totals = calculateItemTotalsFromGross(quantity, grossPricePerUnit, taxRate)

              updated.grossTotal = totals.grossTotal
              updated.netTotal = totals.netTotal
              updated.taxAmount = totals.taxAmount
              updated.pricePerUnit = totals.pricePerUnit
              updated.grossPricePerUnit = grossPricePerUnit
              return updated
            }

            // Standard-Berechnung für Netto-Eingabe - verwende zentrale Utility-Funktion
            const quantity = updated.quantity || 1
            const pricePerUnit = updated.pricePerUnit || 0
            const taxRate = updated.taxRate || 20

            const totals = calculateItemTotalsFromNet(quantity, pricePerUnit, taxRate)

            updated.netTotal = totals.netTotal
            updated.taxAmount = totals.taxAmount
            updated.grossTotal = totals.grossTotal
            return updated
          }
          return item
        }),
      }
    })
  }

  const removeItem = (id: string): void => {
    setFormData(prev => ({
      ...prev,
      items: (prev.items || []).filter(item => item.id !== id),
    }))
  }

  return {
    addItem,
    updateItem,
    removeItem,
  }
}
