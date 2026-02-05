'use client'

import { useMemo, useEffect } from 'react'
import type { CustomerProject } from '@/types'
import {
  calculateProjectTotals,
  calculateTotalPurchaseNet,
  calculateProfitAndMargin,
} from '@/lib/utils/priceCalculations'

interface UseProjectCalculationsProps {
  formData: Partial<CustomerProject>
  setFormData: React.Dispatch<React.SetStateAction<Partial<CustomerProject>>>
  /** Wareneinsatz aus verknüpften Eingangsrechnungen – hat Vorrang vor EK pro Position */
  supplierInvoiceTotal?: number
}

/**
 * Hook für Preisberechnungen für Projekte
 *
 * Berechnet Netto, Brutto, MwSt, Gewinn und Marge basierend auf Items.
 * Wenn supplierInvoiceTotal > 0: Wareneinsatz aus Eingangsrechnungen (genauer).
 * Sonst: Wareneinsatz aus purchasePricePerUnit pro Position.
 */
export function useProjectCalculations({
  formData,
  setFormData,
  supplierInvoiceTotal = 0,
}: UseProjectCalculationsProps) {
  // Calculations - verwendet zentrale Utility-Funktionen
  const calculations = useMemo(() => {
    const items = formData.items || []

    // Verwende zentrale Utility-Funktion für Projekt-Gesamtwerte
    const { netTotal, taxTotal, grossTotal, taxByRate } = calculateProjectTotals(items)

    // Wareneinsatz: Eingangsrechnungen haben Vorrang, sonst EK pro Position
    const totalPurchaseNet =
      supplierInvoiceTotal > 0 ? supplierInvoiceTotal : calculateTotalPurchaseNet(items)

    // Gewinn und Marge nur wenn EK erfasst (sonst null, um 100%-Verfälschung zu vermeiden)
    const { profitNet, marginPercent } = calculateProfitAndMargin(netTotal, totalPurchaseNet)

    return {
      netTotal,
      taxTotal,
      grossTotal,
      totalPurchaseNet,
      profitNet,
      marginPercent,
      taxByRate,
    }
  }, [formData.items, supplierInvoiceTotal])

  // Aktualisiere formData.totalAmount wenn sich grossTotal ändert
  useEffect(() => {
    if (calculations.grossTotal !== formData.totalAmount) {
      setFormData(prev => ({ ...prev, totalAmount: calculations.grossTotal }))
    }
  }, [calculations.grossTotal, formData.totalAmount, setFormData])

  return {
    calculations,
  }
}
