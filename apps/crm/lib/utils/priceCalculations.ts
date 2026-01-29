/**
 * Zentrale Preisberechnungs-Utilities
 *
 * WICHTIG: Diese Funktionen werden sowohl im Frontend als auch im Backend verwendet,
 * um Konsistenz bei Preisberechnungen zu gewährleisten.
 *
 * Alle Berechnungen verwenden volle Präzision und runden erst am Ende auf 2 Dezimalstellen.
 */

/**
 * Rundet eine Zahl auf 2 Dezimalstellen
 */
export function roundTo2Decimals(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Berechnet Netto-Betrag aus Brutto-Betrag und Steuersatz
 * @param gross - Brutto-Betrag
 * @param taxRate - Steuersatz in Prozent (z.B. 20 für 20%)
 * @returns Netto-Betrag (gerundet auf 2 Dezimalstellen)
 */
export function calculateNetFromGross(gross: number, taxRate: number): number {
  if (gross === 0 || taxRate === 0) return 0
  const net = gross / (1 + taxRate / 100)
  return roundTo2Decimals(net)
}

/**
 * Berechnet Brutto-Betrag aus Netto-Betrag und Steuersatz
 * @param net - Netto-Betrag
 * @param taxRate - Steuersatz in Prozent (z.B. 20 für 20%)
 * @returns Brutto-Betrag (gerundet auf 2 Dezimalstellen)
 */
export function calculateGrossFromNet(net: number, taxRate: number): number {
  if (net === 0) return 0
  const gross = net * (1 + taxRate / 100)
  return roundTo2Decimals(gross)
}

/**
 * Berechnet Steuerbetrag aus Netto-Betrag und Steuersatz
 * @param net - Netto-Betrag
 * @param taxRate - Steuersatz in Prozent (z.B. 20 für 20%)
 * @returns Steuerbetrag (gerundet auf 2 Dezimalstellen)
 */
export function calculateTaxFromNet(net: number, taxRate: number): number {
  if (net === 0 || taxRate === 0) return 0
  const tax = net * (taxRate / 100)
  return roundTo2Decimals(tax)
}

/**
 * Berechnet Steuerbetrag aus Brutto-Betrag und Steuersatz
 * @param gross - Brutto-Betrag
 * @param taxRate - Steuersatz in Prozent (z.B. 20 für 20%)
 * @returns Steuerbetrag (gerundet auf 2 Dezimalstellen)
 */
export function calculateTaxFromGross(gross: number, taxRate: number): number {
  if (gross === 0 || taxRate === 0) return 0
  const net = calculateNetFromGross(gross, taxRate)
  return roundTo2Decimals(gross - net)
}

/**
 * Berechnet alle Werte für ein Invoice-Item basierend auf Netto-Eingabe
 * @param quantity - Menge (muss > 0 sein)
 * @param pricePerUnit - Netto-Preis pro Einheit (muss >= 0 sein)
 * @param taxRate - Steuersatz in Prozent (0-100)
 * @returns Objekt mit netTotal, taxAmount, grossTotal (alle gerundet)
 * @throws Error bei ungültigen Eingabewerten
 */
export function calculateItemTotalsFromNet(
  quantity: number,
  pricePerUnit: number,
  taxRate: number
): { netTotal: number; taxAmount: number; grossTotal: number } {
  // KRITISCH: Input-Validierung
  if (quantity <= 0) {
    throw new Error(`Ungültige Menge: ${quantity}. Menge muss größer als 0 sein.`)
  }
  if (pricePerUnit < 0) {
    throw new Error(`Ungültiger Preis: ${pricePerUnit}. Preis darf nicht negativ sein.`)
  }
  if (taxRate < 0 || taxRate > 100) {
    throw new Error(`Ungültiger Steuersatz: ${taxRate}. Steuersatz muss zwischen 0 und 100 liegen.`)
  }

  const netTotal = quantity * pricePerUnit
  const taxAmount = calculateTaxFromNet(netTotal, taxRate)
  const grossTotal = netTotal + taxAmount

  return {
    netTotal: roundTo2Decimals(netTotal),
    taxAmount: roundTo2Decimals(taxAmount),
    grossTotal: roundTo2Decimals(grossTotal),
  }
}

/**
 * Berechnet alle Werte für ein Invoice-Item basierend auf Brutto-Eingabe
 * WICHTIG: Bei Brutto-Eingabe wird Brutto als "Wahrheit" behandelt und Netto/MwSt rückwärts berechnet
 * @param quantity - Menge (muss > 0 sein)
 * @param grossPricePerUnit - Brutto-Preis pro Einheit (muss >= 0 sein)
 * @param taxRate - Steuersatz in Prozent (0-100)
 * @returns Objekt mit netTotal, taxAmount, grossTotal, pricePerUnit (alle gerundet)
 * @throws Error bei ungültigen Eingabewerten
 */
export function calculateItemTotalsFromGross(
  quantity: number,
  grossPricePerUnit: number,
  taxRate: number
): { netTotal: number; taxAmount: number; grossTotal: number; pricePerUnit: number } {
  // KRITISCH: Input-Validierung
  if (quantity <= 0) {
    throw new Error(`Ungültige Menge: ${quantity}. Menge muss größer als 0 sein.`)
  }
  if (grossPricePerUnit < 0) {
    throw new Error(`Ungültiger Brutto-Preis: ${grossPricePerUnit}. Preis darf nicht negativ sein.`)
  }
  if (taxRate < 0 || taxRate > 100) {
    throw new Error(`Ungültiger Steuersatz: ${taxRate}. Steuersatz muss zwischen 0 und 100 liegen.`)
  }

  // Gesamt-Brutto = Menge × Brutto-Preis pro Einheit (exakt)
  const grossTotal = quantity * grossPricePerUnit
  // Gesamt-Netto = Gesamt-Brutto / (1 + MwSt) - mit voller Präzision
  const netTotal = calculateNetFromGross(grossTotal, taxRate)
  // Steuerbetrag = Brutto - Netto
  const taxAmount = grossTotal - netTotal
  // Netto pro Einheit = Gesamt-Netto / Menge
  const pricePerUnit = netTotal / quantity

  return {
    netTotal: roundTo2Decimals(netTotal),
    taxAmount: roundTo2Decimals(taxAmount),
    grossTotal: roundTo2Decimals(grossTotal),
    pricePerUnit: roundTo2Decimals(pricePerUnit),
  }
}

/**
 * Berechnet Projekt-Gesamtwerte aus einer Liste von Items
 * WICHTIG: Verwendet exakte Brutto-Werte der Items, um Rundungsfehler zu vermeiden
 * @param items - Array von InvoiceItems mit netTotal, taxAmount, grossTotal, grossPricePerUnit
 * @returns Objekt mit netTotal, taxTotal, grossTotal, taxByRate
 */
export function calculateProjectTotals(
  items: Array<{
    quantity?: number
    netTotal?: number
    taxAmount?: number
    grossTotal?: number
    grossPricePerUnit?: number | null
    taxRate?: number
  }>
): {
  netTotal: number
  taxTotal: number
  grossTotal: number
  taxByRate: Record<number, number>
} {
  // WICHTIG: Berechne Brutto-Gesamt aus exakten Brutto-Werten der Zeilen
  // Das verhindert Rundungsfehler: 1200 + 1000 = 2200 (exakt)
  let grossTotal = 0
  items.forEach(item => {
    const quantity = item.quantity || 1
    // Wenn grossPricePerUnit vorhanden ist, verwende es für exakte Berechnung
    if (item.grossPricePerUnit !== undefined && item.grossPricePerUnit !== null) {
      grossTotal += quantity * item.grossPricePerUnit
    } else if (item.grossTotal !== undefined && item.grossTotal !== null) {
      // Sonst verwende den gespeicherten grossTotal-Wert
      grossTotal += item.grossTotal
    } else {
      // Fallback: Berechne aus Netto + MwSt
      const netTotal = item.netTotal || 0
      const taxAmount = item.taxAmount || 0
      grossTotal += netTotal + taxAmount
    }
  })
  grossTotal = roundTo2Decimals(grossTotal)

  // Berechne Netto-Gesamt: Summe aller netTotal-Werte
  let netTotal = 0
  items.forEach(item => {
    netTotal += item.netTotal || 0
  })
  netTotal = roundTo2Decimals(netTotal)

  // Berechne MwSt pro Satz - verwende bereits berechnete taxAmount-Werte
  const taxByRate: Record<number, number> = {}
  items.forEach(item => {
    const taxAmount = item.taxAmount || 0
    const rate = item.taxRate || 20
    taxByRate[rate] = (taxByRate[rate] || 0) + taxAmount
  })

  // Runde MwSt-Beträge auf 2 Dezimalstellen
  Object.keys(taxByRate).forEach(rate => {
    taxByRate[parseInt(rate)] = roundTo2Decimals(taxByRate[parseInt(rate)])
  })

  const taxTotal = roundTo2Decimals(Object.values(taxByRate).reduce((acc, tax) => acc + tax, 0))

  return { netTotal, taxTotal, grossTotal, taxByRate }
}

/**
 * Berechnet Einkaufspreis-Gesamt aus Items
 * @param items - Array von InvoiceItems mit purchasePricePerUnit und quantity
 * @returns Gesamt-Einkaufspreis (Netto)
 */
export function calculateTotalPurchaseNet(
  items: Array<{
    quantity?: number
    purchasePricePerUnit?: number | null
  }>
): number {
  const total = items.reduce((acc, item) => {
    const quantity = item.quantity || 1
    const purchasePrice =
      item.purchasePricePerUnit && item.purchasePricePerUnit > 0 ? item.purchasePricePerUnit : 0
    return acc + quantity * purchasePrice
  }, 0)
  return roundTo2Decimals(total)
}

/**
 * Berechnet Gewinn und Marge aus Netto-Verkaufspreis und Einkaufspreis
 * @param netSaleTotal - Netto-Verkaufspreis-Gesamt
 * @param purchaseNetTotal - Einkaufspreis-Gesamt (Netto)
 * @returns Objekt mit profitNet und marginPercent
 */
export function calculateProfitAndMargin(
  netSaleTotal: number,
  purchaseNetTotal: number
): { profitNet: number; marginPercent: number } {
  const profitNet = netSaleTotal - purchaseNetTotal
  const marginPercent = netSaleTotal > 0 ? (profitNet / netSaleTotal) * 100 : 0
  return {
    profitNet: roundTo2Decimals(profitNet),
    marginPercent: roundTo2Decimals(marginPercent),
  }
}
