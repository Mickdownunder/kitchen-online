import {
  roundTo2Decimals,
  calculateNetFromGross,
  calculateGrossFromNet,
  calculateTaxFromNet,
  calculateTaxFromGross,
  calculateItemTotalsFromNet,
  calculateItemTotalsFromGross,
  calculateProjectTotals,
  calculateTotalPurchaseNet,
  calculateProfitAndMargin,
  calculateMarginOnlyWithPurchase,
} from '@/lib/utils/priceCalculations'

// ---------------------------------------------------------------------------
// roundTo2Decimals
// ---------------------------------------------------------------------------
describe('roundTo2Decimals', () => {
  it('rounds standard values', () => {
    expect(roundTo2Decimals(1.005)).toBe(1.0)
    expect(roundTo2Decimals(1.006)).toBe(1.01)
    expect(roundTo2Decimals(2.345)).toBe(2.35)
    expect(roundTo2Decimals(2.344)).toBe(2.34)
  })

  it('handles negative values', () => {
    expect(roundTo2Decimals(-1.006)).toBe(-1.01)
    expect(roundTo2Decimals(-2.344)).toBe(-2.34)
  })

  it('returns 0 for 0', () => {
    expect(roundTo2Decimals(0)).toBe(0)
  })

  it('keeps already-rounded values unchanged', () => {
    expect(roundTo2Decimals(99.99)).toBe(99.99)
    expect(roundTo2Decimals(100)).toBe(100)
  })

  it('handles very large values', () => {
    expect(roundTo2Decimals(123456.789)).toBe(123456.79)
  })
})

// ---------------------------------------------------------------------------
// calculateNetFromGross
// ---------------------------------------------------------------------------
describe('calculateNetFromGross', () => {
  it('calculates net from gross with 20% tax', () => {
    expect(calculateNetFromGross(120, 20)).toBe(100)
  })

  it('calculates net from gross with 10% tax', () => {
    expect(calculateNetFromGross(110, 10)).toBe(100)
  })

  it('returns 0 when gross is 0', () => {
    expect(calculateNetFromGross(0, 20)).toBe(0)
  })

  it('returns 0 when taxRate is 0', () => {
    expect(calculateNetFromGross(100, 0)).toBe(0)
  })

  it('handles non-round amounts', () => {
    // 59.99 / 1.20 = 49.991666...
    expect(calculateNetFromGross(59.99, 20)).toBe(49.99)
  })
})

// ---------------------------------------------------------------------------
// calculateGrossFromNet
// ---------------------------------------------------------------------------
describe('calculateGrossFromNet', () => {
  it('calculates gross from net with 20% tax', () => {
    expect(calculateGrossFromNet(100, 20)).toBe(120)
  })

  it('returns 0 when net is 0', () => {
    expect(calculateGrossFromNet(0, 20)).toBe(0)
  })

  it('handles 0% tax rate', () => {
    expect(calculateGrossFromNet(100, 0)).toBe(100)
  })

  it('is the inverse of calculateNetFromGross for clean amounts', () => {
    const net = 100
    const gross = calculateGrossFromNet(net, 20)
    expect(calculateNetFromGross(gross, 20)).toBe(net)
  })

  it('handles non-round amounts', () => {
    // 49.99 * 1.20 = 59.988
    expect(calculateGrossFromNet(49.99, 20)).toBe(59.99)
  })
})

// ---------------------------------------------------------------------------
// calculateTaxFromNet
// ---------------------------------------------------------------------------
describe('calculateTaxFromNet', () => {
  it('calculates tax from net at 20%', () => {
    expect(calculateTaxFromNet(100, 20)).toBe(20)
  })

  it('calculates tax from net at 10%', () => {
    expect(calculateTaxFromNet(100, 10)).toBe(10)
  })

  it('returns 0 when net is 0', () => {
    expect(calculateTaxFromNet(0, 20)).toBe(0)
  })

  it('returns 0 when taxRate is 0', () => {
    expect(calculateTaxFromNet(100, 0)).toBe(0)
  })

  it('rounds correctly', () => {
    // 33.33 * 0.20 = 6.666
    expect(calculateTaxFromNet(33.33, 20)).toBe(6.67)
  })
})

// ---------------------------------------------------------------------------
// calculateTaxFromGross
// ---------------------------------------------------------------------------
describe('calculateTaxFromGross', () => {
  it('calculates tax from gross at 20%', () => {
    expect(calculateTaxFromGross(120, 20)).toBe(20)
  })

  it('returns 0 when gross is 0', () => {
    expect(calculateTaxFromGross(0, 20)).toBe(0)
  })

  it('returns 0 when taxRate is 0', () => {
    expect(calculateTaxFromGross(100, 0)).toBe(0)
  })

  it('calculates tax for non-round gross', () => {
    // net = 59.99 / 1.20 = 49.99 (rounded)
    // tax = 59.99 - 49.99 = 10.00
    expect(calculateTaxFromGross(59.99, 20)).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// calculateItemTotalsFromNet
// ---------------------------------------------------------------------------
describe('calculateItemTotalsFromNet', () => {
  it('calculates totals for a standard item', () => {
    const result = calculateItemTotalsFromNet(5, 100, 20)
    expect(result.netTotal).toBe(500)
    expect(result.taxAmount).toBe(100)
    expect(result.grossTotal).toBe(600)
  })

  it('handles pricePerUnit = 0', () => {
    const result = calculateItemTotalsFromNet(1, 0, 20)
    expect(result.netTotal).toBe(0)
    expect(result.taxAmount).toBe(0)
    expect(result.grossTotal).toBe(0)
  })

  it('handles taxRate = 0', () => {
    const result = calculateItemTotalsFromNet(2, 50, 0)
    expect(result.netTotal).toBe(100)
    expect(result.taxAmount).toBe(0)
    expect(result.grossTotal).toBe(100)
  })

  it('throws when quantity <= 0', () => {
    expect(() => calculateItemTotalsFromNet(0, 100, 20)).toThrow('Menge muss größer als 0 sein')
    expect(() => calculateItemTotalsFromNet(-1, 100, 20)).toThrow('Menge muss größer als 0 sein')
  })

  it('throws when pricePerUnit < 0', () => {
    expect(() => calculateItemTotalsFromNet(1, -10, 20)).toThrow('Preis darf nicht negativ sein')
  })

  it('throws when taxRate out of range', () => {
    expect(() => calculateItemTotalsFromNet(1, 100, -1)).toThrow('Steuersatz muss zwischen 0 und 100')
    expect(() => calculateItemTotalsFromNet(1, 100, 101)).toThrow('Steuersatz muss zwischen 0 und 100')
  })

  it('rounds all output fields to 2 decimals', () => {
    const result = calculateItemTotalsFromNet(3, 33.33, 20)
    // netTotal = 3 * 33.33 = 99.99
    expect(result.netTotal).toBe(99.99)
    // tax = 99.99 * 0.20 = 19.998 -> 20.00
    expect(result.taxAmount).toBe(20)
    // gross = 99.99 + 20.00 = 119.99
    expect(result.grossTotal).toBe(119.99)
  })
})

// ---------------------------------------------------------------------------
// calculateItemTotalsFromGross
// ---------------------------------------------------------------------------
describe('calculateItemTotalsFromGross', () => {
  it('calculates totals from gross input', () => {
    const result = calculateItemTotalsFromGross(1, 120, 20)
    expect(result.grossTotal).toBe(120)
    expect(result.netTotal).toBe(100)
    expect(result.taxAmount).toBe(20)
    expect(result.pricePerUnit).toBe(100)
  })

  it('handles quantity > 1', () => {
    const result = calculateItemTotalsFromGross(2, 60, 20)
    // grossTotal = 2 * 60 = 120
    expect(result.grossTotal).toBe(120)
    // netTotal = 120 / 1.2 = 100
    expect(result.netTotal).toBe(100)
    expect(result.taxAmount).toBe(20)
    // pricePerUnit = 100 / 2 = 50
    expect(result.pricePerUnit).toBe(50)
  })

  it('throws when quantity <= 0', () => {
    expect(() => calculateItemTotalsFromGross(0, 120, 20)).toThrow('Menge muss größer als 0 sein')
  })

  it('throws when grossPricePerUnit < 0', () => {
    expect(() => calculateItemTotalsFromGross(1, -10, 20)).toThrow('Preis darf nicht negativ sein')
  })

  it('throws when taxRate out of range', () => {
    expect(() => calculateItemTotalsFromGross(1, 100, -1)).toThrow('Steuersatz muss zwischen 0 und 100')
    expect(() => calculateItemTotalsFromGross(1, 100, 101)).toThrow('Steuersatz muss zwischen 0 und 100')
  })
})

// ---------------------------------------------------------------------------
// calculateProjectTotals
// ---------------------------------------------------------------------------
describe('calculateProjectTotals', () => {
  it('returns zeros for empty items array', () => {
    const result = calculateProjectTotals([])
    expect(result.netTotal).toBe(0)
    expect(result.taxTotal).toBe(0)
    expect(result.grossTotal).toBe(0)
    expect(result.taxByRate).toEqual({})
  })

  it('uses grossPricePerUnit when available', () => {
    const result = calculateProjectTotals([
      { quantity: 2, netTotal: 200, taxAmount: 40, grossPricePerUnit: 120, taxRate: 20 },
    ])
    // grossTotal = 2 * 120 = 240
    expect(result.grossTotal).toBe(240)
    expect(result.netTotal).toBe(200)
    expect(result.taxTotal).toBe(40)
    expect(result.taxByRate).toEqual({ 20: 40 })
  })

  it('falls back to grossTotal when grossPricePerUnit is null', () => {
    const result = calculateProjectTotals([
      { quantity: 1, netTotal: 100, taxAmount: 20, grossTotal: 120, grossPricePerUnit: null, taxRate: 20 },
    ])
    expect(result.grossTotal).toBe(120)
  })

  it('falls back to netTotal + taxAmount when no gross fields present', () => {
    const result = calculateProjectTotals([
      { netTotal: 100, taxAmount: 20, taxRate: 20 },
    ])
    expect(result.grossTotal).toBe(120)
  })

  it('aggregates taxByRate across multiple tax rates', () => {
    const result = calculateProjectTotals([
      { netTotal: 100, taxAmount: 20, grossTotal: 120, grossPricePerUnit: null, taxRate: 20 },
      { netTotal: 100, taxAmount: 10, grossTotal: 110, grossPricePerUnit: null, taxRate: 10 },
    ])
    expect(result.taxByRate).toEqual({ 20: 20, 10: 10 })
    expect(result.taxTotal).toBe(30)
  })

  it('defaults taxRate to 20 when not specified', () => {
    const result = calculateProjectTotals([
      { netTotal: 100, taxAmount: 20, grossTotal: 120, grossPricePerUnit: null },
    ])
    expect(result.taxByRate).toEqual({ 20: 20 })
  })

  it('sums multiple items correctly', () => {
    const result = calculateProjectTotals([
      { quantity: 1, netTotal: 1000, taxAmount: 200, grossPricePerUnit: 1200, taxRate: 20 },
      { quantity: 1, netTotal: 500, taxAmount: 100, grossPricePerUnit: 600, taxRate: 20 },
    ])
    expect(result.netTotal).toBe(1500)
    expect(result.grossTotal).toBe(1800)
    expect(result.taxTotal).toBe(300)
  })
})

// ---------------------------------------------------------------------------
// calculateTotalPurchaseNet
// ---------------------------------------------------------------------------
describe('calculateTotalPurchaseNet', () => {
  it('sums purchase prices for all items', () => {
    const result = calculateTotalPurchaseNet([
      { quantity: 2, purchasePricePerUnit: 50 },
      { quantity: 3, purchasePricePerUnit: 30 },
    ])
    // 2*50 + 3*30 = 100 + 90 = 190
    expect(result).toBe(190)
  })

  it('treats null purchasePricePerUnit as 0', () => {
    const result = calculateTotalPurchaseNet([
      { quantity: 1, purchasePricePerUnit: null },
    ])
    expect(result).toBe(0)
  })

  it('treats undefined purchasePricePerUnit as 0', () => {
    const result = calculateTotalPurchaseNet([
      { quantity: 1 },
    ])
    expect(result).toBe(0)
  })

  it('treats 0 or negative purchasePricePerUnit as 0', () => {
    const result = calculateTotalPurchaseNet([
      { quantity: 1, purchasePricePerUnit: 0 },
      { quantity: 1, purchasePricePerUnit: -5 },
    ])
    expect(result).toBe(0)
  })

  it('defaults quantity to 1 when not specified', () => {
    const result = calculateTotalPurchaseNet([
      { purchasePricePerUnit: 100 },
    ])
    expect(result).toBe(100)
  })

  it('returns 0 for empty array', () => {
    expect(calculateTotalPurchaseNet([])).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// calculateProfitAndMargin
// ---------------------------------------------------------------------------
describe('calculateProfitAndMargin', () => {
  it('returns null when purchaseNetTotal is 0', () => {
    const result = calculateProfitAndMargin(1000, 0)
    expect(result.profitNet).toBeNull()
    expect(result.marginPercent).toBeNull()
  })

  it('returns null when purchaseNetTotal is negative', () => {
    const result = calculateProfitAndMargin(1000, -100)
    expect(result.profitNet).toBeNull()
    expect(result.marginPercent).toBeNull()
  })

  it('calculates positive profit and margin', () => {
    const result = calculateProfitAndMargin(1000, 600)
    expect(result.profitNet).toBe(400)
    // 400 / 1000 * 100 = 40%
    expect(result.marginPercent).toBe(40)
  })

  it('calculates negative profit (loss)', () => {
    const result = calculateProfitAndMargin(500, 800)
    expect(result.profitNet).toBe(-300)
    // -300 / 500 * 100 = -60%
    expect(result.marginPercent).toBe(-60)
  })

  it('handles zero netSaleTotal with positive purchase', () => {
    const result = calculateProfitAndMargin(0, 100)
    expect(result.profitNet).toBe(-100)
    expect(result.marginPercent).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// calculateMarginOnlyWithPurchase
// ---------------------------------------------------------------------------
describe('calculateMarginOnlyWithPurchase', () => {
  it('only considers items with purchasePricePerUnit > 0', () => {
    const result = calculateMarginOnlyWithPurchase([
      { quantity: 1, netTotal: 200, purchasePricePerUnit: 100 },
      { quantity: 1, netTotal: 300, purchasePricePerUnit: null },
    ])
    // Only first item is counted
    expect(result.margin).toBe(100) // 200 - 1*100
    expect(result.netWithPurchase).toBe(200)
    expect(result.marginPercent).toBe(50) // 100/200 * 100
  })

  it('returns marginPercent null when netWithPurchase is 0', () => {
    const result = calculateMarginOnlyWithPurchase([
      { quantity: 1, netTotal: 0, purchasePricePerUnit: null },
    ])
    expect(result.margin).toBe(0)
    expect(result.netWithPurchase).toBe(0)
    expect(result.marginPercent).toBeNull()
  })

  it('handles multiple items with purchase prices', () => {
    const result = calculateMarginOnlyWithPurchase([
      { quantity: 2, netTotal: 400, purchasePricePerUnit: 150 },
      { quantity: 1, netTotal: 200, purchasePricePerUnit: 80 },
    ])
    // margin = (400 - 2*150) + (200 - 1*80) = 100 + 120 = 220
    // netWithPurchase = 400 + 200 = 600
    expect(result.margin).toBe(220)
    expect(result.netWithPurchase).toBe(600)
    // 220/600 * 100 = 36.666... -> 36.67
    expect(result.marginPercent).toBe(36.67)
  })

  it('returns all zeros for empty array', () => {
    const result = calculateMarginOnlyWithPurchase([])
    expect(result.margin).toBe(0)
    expect(result.netWithPurchase).toBe(0)
    expect(result.marginPercent).toBeNull()
  })

  it('defaults quantity to 1 when not specified', () => {
    const result = calculateMarginOnlyWithPurchase([
      { netTotal: 200, purchasePricePerUnit: 100 },
    ])
    expect(result.margin).toBe(100) // 200 - 1*100
  })
})
