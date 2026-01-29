/**
 * Excel Exporter for Statistics
 * Exports statistics data to formatted Excel files with multiple sheets
 */

// XLSX is used via utility functions
import {
  ExcelSheetData,
  formatCurrencyForExcel,
  formatPercentForExcel,
  createFormattedSheet,
  exportToExcel,
} from './utils/formatExcel'

export interface StatisticsExcelData {
  // Overview
  soldRevenue?: number
  invoicedRevenue?: number
  depositRevenue?: number
  receivedMoney?: number
  outstanding?: number
  // Projects
  projectStats?: {
    totalRevenue: number
    totalNet: number
    totalPurchasePrice: number
    grossMargin: number
    marginPercent: number
    projectCount: number
    avgProjectValue: number
  }
  monthlyProjectData?: Array<{
    month: string
    revenue: number
    net: number
    purchase: number
    margin: number
    marginPercent: number
    count: number
  }>
  topCustomers?: Array<{
    name: string
    revenue: number
    net: number
    purchase: number
    margin: number
    marginPercent: number
    projects: number
    avgValue: number
  }>
  // Invoices
  invoiceStats?: {
    invoicedRevenue: number
    depositRevenue: number
    totalPaid: number
    totalOutstanding: number
    finalCount: number
    depositCount: number
    totalInvoices: number
  }
  monthlyInvoiceData?: Array<{
    month: string
    invoiced: number
    deposit: number
    paid: number
    outstanding: number
  }>
  // Deliveries
  deliveryStats?: {
    totalSupplier: number
    totalCustomer: number
    totalDeliveries: number
  }
}

/**
 * Exports statistics to Excel with multiple formatted sheets
 */
export function exportStatisticsToExcel(
  data: StatisticsExcelData,
  filename: string = `Statistik_${new Date().toISOString().split('T')[0]}`
): void {
  const sheets: ExcelSheetData[] = []

  // Overview Sheet
  if (data.soldRevenue !== undefined || data.invoicedRevenue !== undefined) {
    const overviewData: Array<Array<string | number>> = []

    if (data.soldRevenue !== undefined) {
      overviewData.push(['Verkaufter Umsatz', formatCurrencyForExcel(data.soldRevenue) + ' €'])
    }
    if (data.invoicedRevenue !== undefined) {
      overviewData.push([
        'Buchhalterischer Umsatz',
        formatCurrencyForExcel(data.invoicedRevenue) + ' €',
      ])
    }
    if (data.receivedMoney !== undefined) {
      overviewData.push(['Eingegangen', formatCurrencyForExcel(data.receivedMoney) + ' €'])
    }
    if (data.outstanding !== undefined) {
      overviewData.push(['Offene Forderungen', formatCurrencyForExcel(data.outstanding) + ' €'])
    }
    if (data.invoicedRevenue !== undefined && data.depositRevenue !== undefined) {
      overviewData.push([
        'Gesamt',
        formatCurrencyForExcel(data.invoicedRevenue + data.depositRevenue) + ' €',
      ])
    }

    sheets.push(createFormattedSheet('Übersicht', ['Kennzahl', 'Wert'], overviewData, [30, 20]))
  }

  // Projects Sheet
  if (data.projectStats) {
    const projectData: Array<Array<string | number>> = [
      ['Verkaufter Umsatz', formatCurrencyForExcel(data.projectStats.totalRevenue) + ' €'],
      ['Netto Umsatz', formatCurrencyForExcel(data.projectStats.totalNet) + ' €'],
      ['Einkaufspreis', formatCurrencyForExcel(data.projectStats.totalPurchasePrice) + ' €'],
      ['Bruttomarge', formatCurrencyForExcel(data.projectStats.grossMargin) + ' €'],
      ['Marge %', formatPercentForExcel(data.projectStats.marginPercent)],
      ['Projekte', data.projectStats.projectCount],
      ['Ø Projektwert', formatCurrencyForExcel(data.projectStats.avgProjectValue) + ' €'],
    ]

    sheets.push(createFormattedSheet('Aufträge', ['Kennzahl', 'Wert'], projectData, [30, 20]))
  }

  // Monthly Project Data
  if (data.monthlyProjectData && data.monthlyProjectData.length > 0) {
    const monthlyData = data.monthlyProjectData.map(month => [
      month.month,
      formatCurrencyForExcel(month.revenue) + ' €',
      formatCurrencyForExcel(month.net) + ' €',
      formatCurrencyForExcel(month.purchase) + ' €',
      formatCurrencyForExcel(month.margin) + ' €',
      formatPercentForExcel(month.marginPercent),
      month.count,
    ])

    sheets.push(
      createFormattedSheet(
        'Monatliche Aufträge',
        ['Monat', 'Umsatz', 'Netto', 'Einkauf', 'Marge', 'Marge %', 'Anzahl'],
        monthlyData,
        [10, 15, 15, 15, 15, 10, 10]
      )
    )
  }

  // Top Customers
  if (data.topCustomers && data.topCustomers.length > 0) {
    const customerData = data.topCustomers.map((customer, index) => [
      index + 1,
      customer.name,
      formatCurrencyForExcel(customer.revenue) + ' €',
      formatCurrencyForExcel(customer.net) + ' €',
      formatCurrencyForExcel(customer.purchase) + ' €',
      formatCurrencyForExcel(customer.margin) + ' €',
      formatPercentForExcel(customer.marginPercent),
      customer.projects,
      formatCurrencyForExcel(customer.avgValue) + ' €',
    ])

    sheets.push(
      createFormattedSheet(
        'Top Kunden',
        ['Rang', 'Kunde', 'Umsatz', 'Netto', 'Einkauf', 'Marge', 'Marge %', 'Projekte', 'Ø Wert'],
        customerData,
        [5, 25, 15, 15, 15, 15, 10, 10, 15]
      )
    )
  }

  // Invoices Sheet
  if (data.invoiceStats) {
    const invoiceData: Array<Array<string | number>> = [
      ['Buchhalterischer Umsatz', formatCurrencyForExcel(data.invoiceStats.invoicedRevenue) + ' €'],
      ['Anzahlungs-Umsatz', formatCurrencyForExcel(data.invoiceStats.depositRevenue) + ' €'],
      [
        'Gesamt',
        formatCurrencyForExcel(
          data.invoiceStats.invoicedRevenue + data.invoiceStats.depositRevenue
        ) + ' €',
      ],
      ['Eingegangen', formatCurrencyForExcel(data.invoiceStats.totalPaid) + ' €'],
      ['Offen', formatCurrencyForExcel(data.invoiceStats.totalOutstanding) + ' €'],
      ['Schlussrechnungen', data.invoiceStats.finalCount],
      ['Anzahlungen', data.invoiceStats.depositCount],
      ['Gesamt Rechnungen', data.invoiceStats.totalInvoices],
    ]

    sheets.push(createFormattedSheet('Rechnungen', ['Kennzahl', 'Wert'], invoiceData, [30, 20]))
  }

  // Monthly Invoice Data
  if (data.monthlyInvoiceData && data.monthlyInvoiceData.length > 0) {
    const monthlyInvoiceData = data.monthlyInvoiceData.map(month => [
      month.month,
      formatCurrencyForExcel(month.invoiced) + ' €',
      formatCurrencyForExcel(month.deposit) + ' €',
      formatCurrencyForExcel(month.paid) + ' €',
      formatCurrencyForExcel(month.outstanding) + ' €',
    ])

    sheets.push(
      createFormattedSheet(
        'Monatliche Rechnungen',
        ['Monat', 'Schlussrechnung', 'Anzahlung', 'Bezahlt', 'Offen'],
        monthlyInvoiceData,
        [10, 18, 18, 18, 18]
      )
    )
  }

  // Deliveries Sheet
  if (data.deliveryStats) {
    const deliveryData: Array<Array<string | number>> = [
      ['Lieferanten-Lieferscheine', data.deliveryStats.totalSupplier],
      ['Kunden-Lieferscheine', data.deliveryStats.totalCustomer],
      ['Gesamt Lieferscheine', data.deliveryStats.totalDeliveries],
    ]

    sheets.push(createFormattedSheet('Lieferscheine', ['Typ', 'Anzahl'], deliveryData, [30, 15]))
  }

  // Export the workbook
  exportToExcel(sheets, filename)
}

/**
 * Exports a single tab's data to Excel
 */
export function exportTabToExcel(
  tabName: string,
  data: StatisticsExcelData,
  filename?: string
): void {
  const baseFilename = filename || `Statistik_${tabName}_${new Date().toISOString().split('T')[0]}`

  // Filter data based on tab
  const filteredData: StatisticsExcelData = {}

  switch (tabName.toLowerCase()) {
    case 'overview':
      filteredData.soldRevenue = data.soldRevenue
      filteredData.invoicedRevenue = data.invoicedRevenue
      filteredData.receivedMoney = data.receivedMoney
      filteredData.outstanding = data.outstanding
      break
    case 'projects':
    case 'aufträge':
      filteredData.projectStats = data.projectStats
      filteredData.monthlyProjectData = data.monthlyProjectData
      filteredData.topCustomers = data.topCustomers
      break
    case 'invoices':
    case 'rechnungen':
      filteredData.invoiceStats = data.invoiceStats
      filteredData.monthlyInvoiceData = data.monthlyInvoiceData
      break
    case 'deliveries':
    case 'lieferscheine':
      filteredData.deliveryStats = data.deliveryStats
      break
  }

  exportStatisticsToExcel(filteredData, baseFilename)
}
