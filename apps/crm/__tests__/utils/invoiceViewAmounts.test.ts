import { calculateInvoiceViewAmounts, calculateProjectGrossTotal } from '@/lib/utils/invoiceViewAmounts'

describe('invoiceViewAmounts', () => {
  it('calculates project gross from item totals when items are present', () => {
    const gross = calculateProjectGrossTotal(
      [
        { grossTotal: 1200, netTotal: 1000, taxAmount: 200 },
        { netTotal: 500, taxAmount: 100 },
      ],
      9999,
    )

    expect(gross).toBe(1800)
  })

  it('falls back to provided gross amount when items are missing', () => {
    expect(calculateProjectGrossTotal(undefined, 4000.125)).toBe(4000.13)
    expect(calculateProjectGrossTotal([], 2500)).toBe(2500)
  })

  it('calculates final invoice view amounts with partial payments', () => {
    const amounts = calculateInvoiceViewAmounts({
      projectItems: [{ grossTotal: 6000 }, { grossTotal: 4000 }],
      fallbackGrossAmount: 10000,
      totalPartialPayments: 4000,
      taxRate: 20,
    })

    expect(amounts).toEqual({
      projectGrossTotal: 10000,
      projectNetTotal: 8333.33,
      projectTaxTotal: 1666.67,
      partialPaymentsNet: 3333.33,
      partialPaymentsTax: 666.67,
      restGross: 6000,
      restNet: 5000,
      restTax: 1000,
    })
  })
})
