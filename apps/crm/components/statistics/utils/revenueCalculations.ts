import { CustomerProject, Invoice } from '@/types'
import { calculateMarginOnlyWithPurchase } from '@/lib/utils/priceCalculations'

/**
 * Statistics Calculations - Invoice-based (New System)
 * Alle Berechnungen basieren auf der invoices-Tabelle
 */

export interface DateFilter {
  year?: number | 'all'
  month?: number | 'all'
  timeRange?: 'month' | 'quarter' | 'year' | 'all'
}

/**
 * Matches a date string against a date filter
 */
export function matchesDateFilter(dateStr: string | undefined, filter: DateFilter): boolean {
  if (!dateStr) return false

  const date = new Date(dateStr)

  if (filter.timeRange === 'all') return true

  if (filter.timeRange === 'year' && filter.year !== 'all') {
    return date.getFullYear() === filter.year
  }

  if (filter.timeRange === 'month') {
    const now = new Date()
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  }

  if (filter.timeRange === 'quarter') {
    const now = new Date()
    const currentQuarter = Math.floor(now.getMonth() / 3)
    return (
      date.getFullYear() === now.getFullYear() && Math.floor(date.getMonth() / 3) === currentQuarter
    )
  }

  // Custom year/month filter
  if (filter.year !== 'all' && filter.year !== undefined) {
    if (date.getFullYear() !== filter.year) return false
  }

  if (filter.month !== 'all' && filter.month !== undefined) {
    if (date.getMonth() + 1 !== filter.month) return false
  }

  return true
}

// ============================================
// INVOICE-BASED CALCULATIONS (New System)
// ============================================

/**
 * Buchhalterischer Umsatz – nur bezahlte Schlussrechnungen
 * Anzahlungen zählen nicht; unbezahlte Schlussrechnungen auch nicht.
 * Datum = Bezahldatum (wann der Umsatz realisiert wurde)
 */
export function calculateAccountingRevenueFromInvoices(
  invoices: Invoice[],
  filter: DateFilter
): number {
  return invoices
    .filter(
      inv =>
        inv.type === 'final' &&
        inv.isPaid &&
        matchesDateFilter(inv.paidDate, filter)
    )
    .reduce((sum, inv) => sum + (inv.amount || 0), 0)
}

/**
 * @deprecated Verwende calculateAccountingRevenueFromInvoices für Buchhalterischen Umsatz
 * Fakturierter Umsatz (alle Rechnungen) – nur für Legacy/andere Zwecke
 */
export function calculateInvoicedRevenueFromInvoices(
  invoices: Invoice[],
  filter: DateFilter
): number {
  return invoices
    .filter(inv => matchesDateFilter(inv.invoiceDate, filter))
    .reduce((sum, inv) => sum + (inv.amount || 0), 0)
}

/**
 * Hilfsfunktion: Auftragswert für Schlussrechnung ermitteln.
 * Die Schlussrechnung zeigt am Ende nur den Restbetrag; der Auftragswert steht am Anfang.
 * Buchhalterischer Umsatz = Summe der Auftragswerte aller gestellten Schlussrechnungen.
 */
function getOrderValueForFinalInvoice(inv: Invoice): number {
  if (inv.project?.totalAmount != null && inv.project.totalAmount > 0) {
    return inv.project.totalAmount
  }
  return inv.amount || 0
}

/**
 * Buchhalterischer Umsatz – Summe der Auftragswerte aller gestellten Schlussrechnungen.
 * Verwendet project.totalAmount (Auftragswert), nicht inv.amount (Restbetrag).
 * Invoices müssen project-Daten enthalten (z.B. via getInvoicesWithProject).
 */
export function calculateFinalInvoiceRevenue(invoices: Invoice[], filter: DateFilter): number {
  return invoices
    .filter(inv => inv.type === 'final' && matchesDateFilter(inv.invoiceDate, filter))
    .reduce((sum, inv) => sum + getOrderValueForFinalInvoice(inv), 0)
}

/**
 * Anzahlungs-Umsatz
 */
export function calculateDepositRevenueFromInvoices(
  invoices: Invoice[],
  filter: DateFilter
): number {
  return invoices
    .filter(inv => inv.type === 'partial' && matchesDateFilter(inv.invoiceDate, filter))
    .reduce((sum, inv) => sum + (inv.amount || 0), 0)
}

/**
 * Eingegangenes Geld (Cash Flow) - basierend auf Bezahldatum
 */
export function calculateReceivedMoneyFromInvoices(
  invoices: Invoice[],
  filter: DateFilter
): number {
  return invoices
    .filter(inv => inv.isPaid && matchesDateFilter(inv.paidDate, filter))
    .reduce((sum, inv) => sum + (inv.amount || 0), 0)
}

/**
 * Offene Forderungen - alle unbezahlten Rechnungen
 */
export function calculateOutstandingFromInvoices(invoices: Invoice[]): number {
  return invoices.filter(inv => !inv.isPaid).reduce((sum, inv) => sum + (inv.amount || 0), 0)
}

/**
 * Berechnet Rechnungs-Statistiken aus invoices-Tabelle
 * accountingRevenue = Buchhalterischer Umsatz (nur bezahlte Schlussrechnungen, nach Bezahldatum)
 */
export function calculateInvoiceStatsFromInvoices(invoices: Invoice[], filter: DateFilter) {
  const filtered = invoices.filter(inv => matchesDateFilter(inv.invoiceDate, filter))

  const accountingRevenue = invoices
    .filter(
      inv =>
        inv.type === 'final' &&
        inv.isPaid &&
        matchesDateFilter(inv.paidDate, filter)
    )
    .reduce((sum, inv) => sum + (inv.amount || 0), 0)

  const invoicedRevenue = filtered
    .filter(inv => inv.type === 'final')
    .reduce((sum, inv) => sum + getOrderValueForFinalInvoice(inv), 0)

  const depositRevenue = filtered
    .filter(inv => inv.type === 'partial')
    .reduce((sum, inv) => sum + (inv.amount || 0), 0)

  const totalPaid = filtered
    .filter(inv => inv.isPaid)
    .reduce((sum, inv) => sum + (inv.amount || 0), 0)

  const totalOutstanding = filtered
    .filter(inv => !inv.isPaid)
    .reduce((sum, inv) => sum + (inv.amount || 0), 0)

  const finalCount = filtered.filter(inv => inv.type === 'final').length
  const depositCount = filtered.filter(inv => inv.type === 'partial').length
  const totalInvoices = filtered.length
  const paidCount = filtered.filter(inv => inv.isPaid).length

  return {
    invoicedRevenue,
    accountingRevenue,
    depositRevenue,
    totalPaid,
    totalOutstanding,
    finalCount,
    depositCount,
    totalInvoices,
    paidCount,
  }
}

/**
 * Berechnet monatliche Rechnungsdaten aus invoices-Tabelle
 */
export function calculateMonthlyInvoiceDataFromInvoices(invoices: Invoice[], year: number) {
  const monthNames = [
    'Jan',
    'Feb',
    'Mär',
    'Apr',
    'Mai',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Okt',
    'Nov',
    'Dez',
  ]
  const monthly: {
    [key: number]: { invoiced: number; deposit: number; paid: number; outstanding: number }
  } = {}

  for (let i = 0; i < 12; i++) {
    monthly[i] = { invoiced: 0, deposit: 0, paid: 0, outstanding: 0 }
  }

  invoices.forEach(inv => {
    const invoiceDate = new Date(inv.invoiceDate)
    if (invoiceDate.getFullYear() === year) {
      const month = invoiceDate.getMonth()

      if (inv.type === 'final') {
        monthly[month].invoiced += getOrderValueForFinalInvoice(inv)
      } else if (inv.type === 'partial') {
        monthly[month].deposit += inv.amount || 0
      }

      if (inv.isPaid) {
        monthly[month].paid += inv.amount || 0
      } else {
        monthly[month].outstanding += inv.amount || 0
      }
    }
  })

  return monthNames.map((month, index) => ({
    month,
    invoiced: Math.round(monthly[index].invoiced),
    deposit: Math.round(monthly[index].deposit),
    paid: Math.round(monthly[index].paid),
    outstanding: Math.round(monthly[index].outstanding),
  }))
}

/**
 * Berechnet monatliche Einnahmen für Übersicht aus invoices-Tabelle
 */
export function calculateMonthlyReceivedFromInvoices(invoices: Invoice[], year: number) {
  const monthly: { [key: number]: number } = {}
  for (let i = 0; i < 12; i++) {
    monthly[i] = 0
  }

  invoices.forEach(inv => {
    if (inv.isPaid && inv.paidDate) {
      const paidDate = new Date(inv.paidDate)
      if (paidDate.getFullYear() === year) {
        const month = paidDate.getMonth()
        monthly[month] += inv.amount || 0
      }
    }
  })

  return monthly
}

/**
 * Berechnet monatliche fakturierte Beträge aus invoices-Tabelle (alle Rechnungstypen)
 * @deprecated Für Buchhalterischen Umsatz calculateMonthlyFinalInvoiceFromInvoices verwenden
 */
export function calculateMonthlyInvoicedFromInvoices(invoices: Invoice[], year: number) {
  const monthly: { [key: number]: number } = {}
  for (let i = 0; i < 12; i++) {
    monthly[i] = 0
  }

  invoices.forEach(inv => {
    const invoiceDate = new Date(inv.invoiceDate)
    if (invoiceDate.getFullYear() === year) {
      const month = invoiceDate.getMonth()
      monthly[month] += inv.amount || 0
    }
  })

  return monthly
}

/**
 * Berechnet monatliche Schlussrechnungs-Beträge (Buchhalterischer Umsatz)
 * Nur type === 'final', Auftragswert (nicht Restbetrag), gefiltert nach Rechnungsdatum
 */
export function calculateMonthlyFinalInvoiceFromInvoices(invoices: Invoice[], year: number) {
  const monthly: { [key: number]: number } = {}
  for (let i = 0; i < 12; i++) {
    monthly[i] = 0
  }

  invoices.forEach(inv => {
    if (inv.type !== 'final') return
    const invoiceDate = new Date(inv.invoiceDate)
    if (invoiceDate.getFullYear() === year) {
      const month = invoiceDate.getMonth()
      monthly[month] += getOrderValueForFinalInvoice(inv)
    }
  })

  return monthly
}

// ============================================
// PROJECT-BASED CALCULATIONS (For Sold Revenue / Order Stats)
// ============================================

/**
 * Verkaufter Umsatz (Auftrags-Umsatz)
 * Summe aller Aufträge basierend auf Auftragsdatum
 * NOTE: This stays project-based since it's about orders, not invoices
 */
export function calculateSoldRevenue(projects: CustomerProject[], filter: DateFilter): number {
  return projects
    .filter(p => {
      const dateStr = p.orderDate || p.measurementDate || p.offerDate
      return matchesDateFilter(dateStr, filter)
    })
    .reduce((sum, p) => sum + (p.totalAmount || 0), 0)
}

/**
 * Berechnet Projekt-Statistiken (order-based, stays with projects)
 */
export function calculateProjectStats(projects: CustomerProject[], filter: DateFilter) {
  const filtered = projects.filter(p => {
    const dateStr = p.orderDate || p.offerDate || p.createdAt
    if (!dateStr) return false
    return matchesDateFilter(dateStr, filter)
  })

  const totalRevenue = filtered.reduce((acc, p) => acc + (p.totalAmount || 0), 0)
  const totalNet = filtered.reduce((acc, p) => acc + (p.netAmount || 0), 0)

  let totalPurchasePrice = 0
  let grossMargin = 0
  let netWithPurchase = 0
  filtered.forEach(p => {
    const { margin, netWithPurchase: nwp } = calculateMarginOnlyWithPurchase(p.items || [])
    if (nwp > 0) {
      grossMargin += margin
      netWithPurchase += nwp
      totalPurchasePrice += (p.items || []).reduce((s, i) => {
        const q = i.quantity || 1
        const pp =
          i.purchasePricePerUnit && i.purchasePricePerUnit > 0 ? i.purchasePricePerUnit : 0
        return s + q * pp
      }, 0)
    }
  })
  const marginPercent = netWithPurchase > 0 ? (grossMargin / netWithPurchase) * 100 : null
  const projectCount = filtered.length
  const avgProjectValue = projectCount > 0 ? totalRevenue / projectCount : 0

  return {
    totalRevenue,
    totalNet,
    totalPurchasePrice,
    grossMargin: marginPercent != null ? grossMargin : null,
    marginPercent,
    projectCount,
    avgProjectValue,
  }
}

/**
 * Berechnet monatliche Projektdaten (sold revenue by order date)
 */
export function calculateMonthlySoldFromProjects(projects: CustomerProject[], year: number) {
  const monthly: { [key: number]: number } = {}
  for (let i = 0; i < 12; i++) {
    monthly[i] = 0
  }

  projects.forEach(project => {
    const orderDate = project.orderDate || project.measurementDate || project.offerDate
    if (orderDate) {
      const date = new Date(orderDate)
      if (date.getFullYear() === year) {
        const month = date.getMonth()
        monthly[month] += project.totalAmount || 0
      }
    }
  })

  return monthly
}

// ============================================
// LEGACY COMPATIBILITY (deprecated, remove later)
// ============================================

/**
 * @deprecated Use calculateInvoicedRevenueFromInvoices instead
 */
export function calculateInvoicedRevenue(projects: CustomerProject[], filter: DateFilter): number {
  return projects
    .filter(p => {
      if (!p.finalInvoice) return false
      return matchesDateFilter(p.finalInvoice.date, filter)
    })
    .reduce((sum, p) => sum + (p.finalInvoice?.amount || 0), 0)
}

/**
 * @deprecated Use calculateDepositRevenueFromInvoices instead
 */
export function calculateDepositRevenue(projects: CustomerProject[], filter: DateFilter): number {
  let total = 0
  projects.forEach(p => {
    if (p.partialPayments) {
      total += p.partialPayments
        .filter(pp => matchesDateFilter(pp.date, filter))
        .reduce((sum, pp) => sum + pp.amount, 0)
    }
  })
  return total
}

/**
 * @deprecated Use calculateReceivedMoneyFromInvoices instead
 */
export function calculateReceivedMoney(projects: CustomerProject[], filter: DateFilter): number {
  let received = 0
  projects.forEach(p => {
    if (p.partialPayments) {
      received += p.partialPayments
        .filter(pp => pp.isPaid && matchesDateFilter(pp.paidDate, filter))
        .reduce((sum, pp) => sum + pp.amount, 0)
    }
    if (p.finalInvoice?.isPaid && matchesDateFilter(p.finalInvoice.paidDate, filter)) {
      received += p.finalInvoice.amount
    }
  })
  return received
}

/**
 * @deprecated Use calculateOutstandingFromInvoices instead
 */
export function calculateOutstanding(projects: CustomerProject[]): number {
  let outstanding = 0
  projects.forEach(p => {
    if (p.partialPayments) {
      outstanding += p.partialPayments
        .filter(pp => !pp.isPaid)
        .reduce((sum, pp) => sum + pp.amount, 0)
    }
    if (p.finalInvoice && !p.finalInvoice.isPaid) {
      outstanding += p.finalInvoice.amount
    }
  })
  return outstanding
}

/**
 * @deprecated Use calculateInvoiceStatsFromInvoices instead
 */
export function calculateInvoiceStats(projects: CustomerProject[], filter: DateFilter) {
  let invoicedRevenue = 0
  let depositRevenue = 0
  let totalPaid = 0
  let totalOutstanding = 0
  let finalCount = 0
  let depositCount = 0
  let totalInvoices = 0

  projects.forEach(p => {
    if (p.finalInvoice && matchesDateFilter(p.finalInvoice.date, filter)) {
      invoicedRevenue += p.finalInvoice.amount || 0
      finalCount++
      totalInvoices++
      if (
        p.finalInvoice.isPaid &&
        p.finalInvoice.paidDate &&
        matchesDateFilter(p.finalInvoice.paidDate, filter)
      ) {
        totalPaid += p.finalInvoice.amount || 0
      } else {
        totalOutstanding += p.finalInvoice.amount || 0
      }
    }

    if (p.partialPayments) {
      p.partialPayments.forEach(pp => {
        if (matchesDateFilter(pp.date, filter)) {
          depositRevenue += pp.amount || 0
          depositCount++
          totalInvoices++
          if (pp.isPaid && pp.paidDate && matchesDateFilter(pp.paidDate, filter)) {
            totalPaid += pp.amount || 0
          } else {
            totalOutstanding += pp.amount || 0
          }
        }
      })
    }
  })

  return {
    invoicedRevenue,
    depositRevenue,
    totalPaid,
    totalOutstanding,
    finalCount,
    depositCount,
    totalInvoices,
  }
}
