import type { PaymentMethod, SupplierInvoice, SupplierInvoiceCategory } from '@/types'
import { roundTo2Decimals } from '@/lib/utils/priceCalculations'
import { getTodayIsoDate } from './validators'
import type {
  CreateSupplierInvoiceInput,
  InputTaxBucket,
  SupplierInvoiceCustomCategory,
  SupplierInvoiceCustomCategoryInsert,
  SupplierInvoiceCustomCategoryRow,
  SupplierInvoiceInsert,
  SupplierInvoiceRow,
  SupplierInvoiceStats,
  SupplierInvoiceUpdate,
  UpdateSupplierInvoiceInput,
} from './types'

export function mapSupplierInvoiceFromRow(row: SupplierInvoiceRow): SupplierInvoice {
  return {
    id: row.id,
    userId: row.user_id,
    supplierName: row.supplier_name,
    supplierUid: row.supplier_uid || undefined,
    supplierAddress: row.supplier_address || undefined,
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    dueDate: row.due_date || undefined,
    netAmount: row.net_amount,
    taxAmount: row.tax_amount,
    grossAmount: row.gross_amount,
    taxRate: row.tax_rate as number,
    isPaid: row.is_paid as boolean,
    paidDate: row.paid_date || undefined,
    paymentMethod: (row.payment_method as PaymentMethod) || undefined,
    category: row.category as SupplierInvoiceCategory | string,
    skontoPercent: row.skonto_percent ?? undefined,
    skontoAmount: row.skonto_amount ?? undefined,
    projectId: row.project_id || undefined,
    documentUrl: row.document_url || undefined,
    documentName: row.document_name || undefined,
    notes: row.notes || undefined,
    datevAccount: row.datev_account || undefined,
    costCenter: row.cost_center || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function mapCreateInputToInsert(
  userId: string,
  input: CreateSupplierInvoiceInput,
): SupplierInvoiceInsert {
  const taxRate = input.taxRate ?? 20
  const netAmountRounded = roundTo2Decimals(input.netAmount)
  const taxAmount =
    input.taxAmount !== undefined
      ? roundTo2Decimals(input.taxAmount)
      : roundTo2Decimals(netAmountRounded * (taxRate / 100))
  const grossAmount =
    input.grossAmount !== undefined
      ? roundTo2Decimals(input.grossAmount)
      : roundTo2Decimals(netAmountRounded + taxAmount)
  const skontoAmount =
    input.skontoAmount !== undefined ? roundTo2Decimals(input.skontoAmount) : null

  return {
    user_id: userId,
    supplier_name: input.supplierName,
    supplier_uid: input.supplierUid || null,
    supplier_address: input.supplierAddress || null,
    invoice_number: input.invoiceNumber,
    invoice_date: input.invoiceDate || getTodayIsoDate(),
    due_date: input.dueDate || null,
    net_amount: netAmountRounded,
    tax_amount: taxAmount,
    gross_amount: grossAmount,
    tax_rate: taxRate,
    category: input.category || 'material',
    skonto_percent: input.skontoPercent ?? null,
    skonto_amount: skontoAmount,
    project_id: input.projectId || null,
    document_url: input.documentUrl || null,
    document_name: input.documentName || null,
    notes: input.notes || null,
    datev_account: input.datevAccount || null,
    cost_center: input.costCenter || null,
  }
}

export function mapUpdateInputToRow(input: UpdateSupplierInvoiceInput): SupplierInvoiceUpdate {
  const updateData: SupplierInvoiceUpdate = {}

  if (input.supplierName !== undefined) updateData.supplier_name = input.supplierName
  if (input.supplierUid !== undefined) updateData.supplier_uid = input.supplierUid || null
  if (input.supplierAddress !== undefined) updateData.supplier_address = input.supplierAddress || null
  if (input.invoiceNumber !== undefined) updateData.invoice_number = input.invoiceNumber
  if (input.invoiceDate !== undefined) updateData.invoice_date = input.invoiceDate
  if (input.dueDate !== undefined) updateData.due_date = input.dueDate || null
  if (input.netAmount !== undefined) updateData.net_amount = roundTo2Decimals(input.netAmount)
  if (input.taxAmount !== undefined) updateData.tax_amount = roundTo2Decimals(input.taxAmount)
  if (input.grossAmount !== undefined) updateData.gross_amount = roundTo2Decimals(input.grossAmount)
  if (input.taxRate !== undefined) updateData.tax_rate = input.taxRate
  if (input.isPaid !== undefined) updateData.is_paid = input.isPaid
  if (input.paidDate !== undefined) updateData.paid_date = input.paidDate || null
  if (input.paymentMethod !== undefined) updateData.payment_method = input.paymentMethod || null
  if (input.category !== undefined) updateData.category = input.category
  if (input.skontoPercent !== undefined) updateData.skonto_percent = input.skontoPercent ?? null
  if (input.skontoAmount !== undefined) updateData.skonto_amount = roundTo2Decimals(input.skontoAmount)
  if (input.projectId !== undefined) updateData.project_id = input.projectId
  if (input.documentUrl !== undefined) updateData.document_url = input.documentUrl || null
  if (input.documentName !== undefined) updateData.document_name = input.documentName || null
  if (input.notes !== undefined) updateData.notes = input.notes || null
  if (input.datevAccount !== undefined) updateData.datev_account = input.datevAccount || null
  if (input.costCenter !== undefined) updateData.cost_center = input.costCenter || null

  return updateData
}

export function mapCustomCategoryFromRow(
  row: SupplierInvoiceCustomCategoryRow,
): SupplierInvoiceCustomCategory {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: row.created_at ?? '',
  }
}

export function mapCustomCategoryToInsert(
  userId: string,
  name: string,
): SupplierInvoiceCustomCategoryInsert {
  return {
    user_id: userId,
    name,
  }
}

export function buildSupplierInvoiceStats(
  invoices: SupplierInvoice[],
  todayIsoDate: string = getTodayIsoDate(),
): SupplierInvoiceStats {
  const paid = invoices.filter((invoice) => invoice.isPaid)
  const open = invoices.filter((invoice) => !invoice.isPaid)
  const overdue = open.filter((invoice) => invoice.dueDate && invoice.dueDate < todayIsoDate)

  const categoryMap = new Map<
    SupplierInvoiceCategory,
    { count: number; netAmount: number; taxAmount: number }
  >()
  invoices.forEach((invoice) => {
    const category = invoice.category as SupplierInvoiceCategory
    const existing = categoryMap.get(category) || { count: 0, netAmount: 0, taxAmount: 0 }
    categoryMap.set(category, {
      count: existing.count + 1,
      netAmount: existing.netAmount + invoice.netAmount,
      taxAmount: existing.taxAmount + invoice.taxAmount,
    })
  })

  const taxRateMap = new Map<number, { count: number; netAmount: number; taxAmount: number }>()
  invoices.forEach((invoice) => {
    const existing = taxRateMap.get(invoice.taxRate) || { count: 0, netAmount: 0, taxAmount: 0 }
    taxRateMap.set(invoice.taxRate, {
      count: existing.count + 1,
      netAmount: existing.netAmount + invoice.netAmount,
      taxAmount: existing.taxAmount + invoice.taxAmount,
    })
  })

  return {
    totalCount: invoices.length,
    totalNetAmount: invoices.reduce((sum, invoice) => sum + invoice.netAmount, 0),
    totalTaxAmount: invoices.reduce((sum, invoice) => sum + invoice.taxAmount, 0),
    totalGrossAmount: invoices.reduce((sum, invoice) => sum + invoice.grossAmount, 0),
    paidCount: paid.length,
    paidAmount: paid.reduce((sum, invoice) => sum + invoice.grossAmount, 0),
    openCount: open.length,
    openAmount: open.reduce((sum, invoice) => sum + invoice.grossAmount, 0),
    overdueCount: overdue.length,
    overdueAmount: overdue.reduce((sum, invoice) => sum + invoice.grossAmount, 0),
    byCategory: Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      ...data,
    })),
    byTaxRate: Array.from(taxRateMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([taxRate, data]) => ({
        taxRate,
        ...data,
      })),
  }
}

export function buildInputTaxBuckets(invoices: SupplierInvoice[]): InputTaxBucket[] {
  const taxRateMap = new Map<number, { netAmount: number; taxAmount: number }>()

  invoices.forEach((invoice) => {
    const existing = taxRateMap.get(invoice.taxRate) || { netAmount: 0, taxAmount: 0 }
    taxRateMap.set(invoice.taxRate, {
      netAmount: existing.netAmount + invoice.netAmount,
      taxAmount: existing.taxAmount + invoice.taxAmount,
    })
  })

  return Array.from(taxRateMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([taxRate, data]) => ({
      taxRate,
      netAmount: roundTo2Decimals(data.netAmount),
      taxAmount: roundTo2Decimals(data.taxAmount),
    }))
}
