import { roundTo2Decimals } from '@/lib/utils/priceCalculations'

export interface SupplierInvoiceAmounts {
  netAmount: number
  taxAmount: number
  grossAmount: number
}

export function calculateTaxAmount(netAmount: number, taxRate: number): number {
  return roundTo2Decimals(netAmount * (taxRate / 100))
}

export function calculateGrossAmount(netAmount: number, taxRate: number): number {
  return roundTo2Decimals(netAmount + calculateTaxAmount(netAmount, taxRate))
}

export function calculateSupplierInvoiceAmounts(
  netAmount: number,
  taxRate: number,
): SupplierInvoiceAmounts {
  const safeNetAmount = roundTo2Decimals(netAmount)
  const taxAmount = calculateTaxAmount(safeNetAmount, taxRate)
  const grossAmount = roundTo2Decimals(safeNetAmount + taxAmount)

  return {
    netAmount: safeNetAmount,
    taxAmount,
    grossAmount,
  }
}

export function calculateSkontoAmount(grossAmount: number, skontoPercent: number): number {
  return roundTo2Decimals(grossAmount * (skontoPercent / 100))
}

export function calculatePayableAmount(grossAmount: number, skontoAmount: number): number {
  return roundTo2Decimals(grossAmount - skontoAmount)
}

export function calculatePercentAmount(totalAmount: number, percent: number): number {
  return roundTo2Decimals((totalAmount * percent) / 100)
}

export function calculateRemainingGrossAmount(
  grossTotalAmount: number,
  alreadyInvoicedGrossAmount: number,
): number {
  return roundTo2Decimals(grossTotalAmount - alreadyInvoicedGrossAmount)
}
