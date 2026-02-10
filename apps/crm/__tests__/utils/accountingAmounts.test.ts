import {
  calculateSupplierInvoiceAmounts,
  calculateSkontoAmount,
  calculatePayableAmount,
  calculatePercentAmount,
  calculateRemainingGrossAmount,
} from '@/lib/utils/accountingAmounts'

describe('accountingAmounts', () => {
  it('calculates supplier invoice amounts with 20% tax', () => {
    expect(calculateSupplierInvoiceAmounts(100, 20)).toEqual({
      netAmount: 100,
      taxAmount: 20,
      grossAmount: 120,
    })
  })

  it('rounds values to 2 decimals for tax and gross', () => {
    expect(calculateSupplierInvoiceAmounts(456.657, 20)).toEqual({
      netAmount: 456.66,
      taxAmount: 91.33,
      grossAmount: 547.99,
    })
  })

  it('calculates skonto and payable amount', () => {
    const skonto = calculateSkontoAmount(1000, 3)
    expect(skonto).toBe(30)
    expect(calculatePayableAmount(1000, skonto)).toBe(970)
  })

  it('calculates percent amounts for payment flows', () => {
    expect(calculatePercentAmount(9999, 40)).toBe(3999.6)
    expect(calculatePercentAmount(10000, 33.333)).toBe(3333.3)
  })

  it('calculates remaining gross amounts for final invoices', () => {
    expect(calculateRemainingGrossAmount(10000, 4000)).toBe(6000)
    expect(calculateRemainingGrossAmount(10000, 10000)).toBe(0)
    expect(calculateRemainingGrossAmount(10000, 12000)).toBe(-2000)
  })
})
