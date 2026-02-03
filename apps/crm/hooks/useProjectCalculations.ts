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
}

/**
 * Hook für Preisberechnungen für Projekte
 *
 * Berechnet Netto, Brutto, MwSt, Gewinn und Marge basierend auf Items
 * Aktualisiert automatisch formData.totalAmount wenn sich grossTotal ändert
 */
export function useProjectCalculations({ formData, setFormData }: UseProjectCalculationsProps) {
  // Calculations - verwendet zentrale Utility-Funktionen
  const calculations = useMemo(() => {
    const items = formData.items || []

    // Verwende zentrale Utility-Funktion für Projekt-Gesamtwerte
    const { netTotal, taxTotal, grossTotal, taxByRate } = calculateProjectTotals(items)

    // Verwende zentrale Utility-Funktion für Einkaufspreis-Gesamt
    const totalPurchaseNet = calculateTotalPurchaseNet(items)

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
  }, [formData.items])

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
