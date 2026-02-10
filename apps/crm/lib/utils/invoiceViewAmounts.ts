import { calculateNetFromGross, calculateTaxFromGross, roundTo2Decimals } from '@/lib/utils/priceCalculations'
import type { InvoiceItem } from '@/types'

interface CalculateInvoiceViewAmountsInput {
  projectItems: InvoiceItem[] | undefined
  fallbackGrossAmount: number
  totalPartialPayments: number
  taxRate: number
}

export interface InvoiceViewAmounts {
  projectGrossTotal: number
  projectNetTotal: number
  projectTaxTotal: number
  partialPaymentsNet: number
  partialPaymentsTax: number
  restGross: number
  restNet: number
  restTax: number
}

export function calculateProjectGrossTotal(
  projectItems: InvoiceItem[] | undefined,
  fallbackGrossAmount: number,
): number {
  const grossFromItems =
    projectItems?.reduce(
      (sum, item) => sum + (item.grossTotal ?? (item.netTotal ?? 0) + (item.taxAmount ?? 0)),
      0,
    ) ?? 0

  if (grossFromItems > 0) {
    return roundTo2Decimals(grossFromItems)
  }

  return roundTo2Decimals(fallbackGrossAmount)
}

export function calculateInvoiceViewAmounts({
  projectItems,
  fallbackGrossAmount,
  totalPartialPayments,
  taxRate,
}: CalculateInvoiceViewAmountsInput): InvoiceViewAmounts {
  const projectGrossTotal = calculateProjectGrossTotal(projectItems, fallbackGrossAmount)
  const projectNetTotal = calculateNetFromGross(projectGrossTotal, taxRate)
  const projectTaxTotal = calculateTaxFromGross(projectGrossTotal, taxRate)

  const partialPaymentsNet = calculateNetFromGross(totalPartialPayments, taxRate)
  const partialPaymentsTax = calculateTaxFromGross(totalPartialPayments, taxRate)

  const restGross = roundTo2Decimals(fallbackGrossAmount - totalPartialPayments)
  const restNet = roundTo2Decimals(projectNetTotal - partialPaymentsNet)
  const restTax = roundTo2Decimals(projectTaxTotal - partialPaymentsTax)

  return {
    projectGrossTotal,
    projectNetTotal,
    projectTaxTotal,
    partialPaymentsNet,
    partialPaymentsTax,
    restGross,
    restNet,
    restTax,
  }
}
