import type { CustomerProject, Invoice } from '@/types'
import { calculateNetFromGross, roundTo2Decimals } from '@/lib/utils/priceCalculations'
import type {
  DateRangeResult,
  InputTaxEntry,
  InputTaxTotals,
  InvoiceData,
  MissingInvoice,
  UVAEntry,
} from '@/components/accounting/accounting.types'

export function formatCurrency(value: number): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function createProjectMap(projects: CustomerProject[]): Map<string, CustomerProject> {
  return new Map(projects.map((project) => [project.id, project]))
}

export function getProjectTaxRate(project: CustomerProject): number {
  if (!project.items || project.items.length === 0) {
    return 20
  }
  const taxRates = project.items.map((item) => item.taxRate || 20)
  const counts: Record<number, number> = {}
  taxRates.forEach((rate) => {
    counts[rate] = (counts[rate] || 0) + 1
  })
  return parseInt(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0], 10)
}

export function mapFilteredInvoices(
  dbInvoices: Invoice[],
  projectMap: Map<string, CustomerProject>,
  dateRange: DateRangeResult,
): InvoiceData[] {
  const invoices: InvoiceData[] = []

  dbInvoices.forEach((invoice) => {
    const invoiceDate = new Date(invoice.invoiceDate)
    if (invoiceDate < dateRange.startDate || invoiceDate > dateRange.endDate) {
      return
    }

    const project = invoice.project || projectMap.get(invoice.projectId)
    if (!project) {
      return
    }

    const taxRate = invoice.taxRate || getProjectTaxRate(project as CustomerProject)
    const grossAmount = invoice.amount
    const netAmount = invoice.netAmount || calculateNetFromGross(grossAmount, taxRate)
    const taxAmount = invoice.taxAmount || grossAmount - netAmount

    invoices.push({
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.invoiceDate,
      customerName: (project as CustomerProject).customerName || 'Unbekannt',
      netAmount,
      taxRate,
      taxAmount,
      grossAmount,
      isPaid: invoice.isPaid,
      paidDate: invoice.paidDate,
      projectId: invoice.projectId,
      orderNumber: (project as CustomerProject).orderNumber || '',
      type: invoice.type,
    })
  })

  return invoices.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export function mapMissingInvoices(
  projects: CustomerProject[],
  dbInvoices: Invoice[],
  dateRange: DateRangeResult,
): MissingInvoice[] {
  const missing: MissingInvoice[] = []
  const projectsWithInvoices = new Set(dbInvoices.map((invoice) => invoice.projectId))

  projects.forEach((project) => {
    if (projectsWithInvoices.has(project.id)) {
      return
    }

    if ((project.depositAmount || 0) > 0 && project.paymentSchedule) {
      const depositDate = project.orderDate || project.measurementDate
      if (depositDate) {
        const parsedDate = new Date(depositDate)
        if (parsedDate >= dateRange.startDate && parsedDate <= dateRange.endDate) {
          missing.push({
            projectId: project.id,
            orderNumber: project.orderNumber,
            customerName: project.customerName,
            kind: 'deposit',
            date: depositDate,
            amountGross: project.depositAmount || 0,
          })
        }
      }
    }

    const hasFinalInvoice = dbInvoices.some(
      (invoice) => invoice.projectId === project.id && invoice.type === 'final',
    )
    const isFinished = Boolean(project.completionDate || project.installationDate)
    const hasRemainingAmount = (project.totalAmount || 0) > (project.depositAmount || 0)

    if (!hasFinalInvoice && isFinished && hasRemainingAmount && project.isFinalPaid) {
      const finalDate = project.completionDate || project.installationDate || project.deliveryDate
      if (finalDate) {
        const parsedDate = new Date(finalDate)
        if (parsedDate >= dateRange.startDate && parsedDate <= dateRange.endDate) {
          const remaining = (project.totalAmount || 0) - (project.depositAmount || 0)
          missing.push({
            projectId: project.id,
            orderNumber: project.orderNumber,
            customerName: project.customerName,
            kind: 'final',
            date: finalDate,
            amountGross: remaining,
          })
        }
      }
    }
  })

  return missing.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export function calculateUvaData(filteredInvoices: InvoiceData[]): UVAEntry[] {
  const uvaByTaxRate: Record<number, UVAEntry> = {}

  filteredInvoices.forEach((invoice) => {
    const rate = invoice.taxRate
    if (!uvaByTaxRate[rate]) {
      uvaByTaxRate[rate] = {
        taxRate: rate,
        netAmount: 0,
        taxAmount: 0,
        grossAmount: 0,
        invoiceCount: 0,
      }
    }

    const entry = uvaByTaxRate[rate]
    entry.netAmount += invoice.netAmount
    entry.taxAmount += invoice.taxAmount
    entry.grossAmount += invoice.grossAmount
    entry.invoiceCount += 1
  })

  return Object.values(uvaByTaxRate)
    .map((entry) => ({
      ...entry,
      netAmount: roundTo2Decimals(entry.netAmount),
      taxAmount: roundTo2Decimals(entry.taxAmount),
      grossAmount: roundTo2Decimals(entry.grossAmount),
    }))
    .filter((entry) => entry.invoiceCount > 0 || entry.grossAmount > 0)
    .sort((a, b) => b.taxRate - a.taxRate)
}

export function calculateTotals(filteredInvoices: InvoiceData[], uvaData: UVAEntry[]) {
  const totalNet = uvaData.reduce((sum, entry) => sum + entry.netAmount, 0)
  const totalTax = uvaData.reduce((sum, entry) => sum + entry.taxAmount, 0)
  const totalGross = uvaData.reduce((sum, entry) => sum + entry.grossAmount, 0)
  const totalPaid = filteredInvoices
    .filter((invoice) => invoice.isPaid)
    .reduce((sum, invoice) => sum + invoice.grossAmount, 0)
  const totalOutstanding = totalGross - totalPaid

  return {
    totalNet,
    totalTax,
    totalGross,
    totalPaid,
    totalOutstanding,
    invoiceCount: filteredInvoices.length,
    paidCount: filteredInvoices.filter((invoice) => invoice.isPaid).length,
  }
}

export function calculateInputTaxTotals(
  inputTaxData: InputTaxEntry[],
  supplierInvoicesCount: number,
): InputTaxTotals {
  const totalNet = inputTaxData.reduce((sum, entry) => sum + entry.netAmount, 0)
  const totalTax = inputTaxData.reduce((sum, entry) => sum + entry.taxAmount, 0)
  return {
    totalNet: roundTo2Decimals(totalNet),
    totalTax: roundTo2Decimals(totalTax),
    count: supplierInvoicesCount,
  }
}

export function calculateAvailableMonths(
  dbInvoices: Invoice[],
  projects: CustomerProject[],
): string[] {
  const months = new Set<string>()

  dbInvoices.forEach((invoice) => {
    if (invoice.invoiceDate) {
      const date = new Date(invoice.invoiceDate)
      months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
    }
  })

  if (months.size === 0) {
    projects.forEach((project) => {
      const dateSource = project.orderDate || project.measurementDate || project.offerDate
      if (dateSource) {
        const date = new Date(dateSource)
        months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
      }
    })
  }

  const now = new Date()
  months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  return Array.from(months).sort().reverse()
}

export function calculateAvailableYears(
  dbInvoices: Invoice[],
  projects: CustomerProject[],
): number[] {
  const years = new Set<number>()

  dbInvoices.forEach((invoice) => {
    if (invoice.invoiceDate) {
      years.add(new Date(invoice.invoiceDate).getFullYear())
    }
  })

  if (years.size === 0) {
    projects.forEach((project) => {
      const dateSource = project.orderDate || project.measurementDate || project.offerDate
      if (dateSource) {
        years.add(new Date(dateSource).getFullYear())
      }
    })
  }

  years.add(new Date().getFullYear())
  return Array.from(years).sort((a, b) => b - a)
}
