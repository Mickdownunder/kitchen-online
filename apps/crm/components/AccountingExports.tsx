import * as XLSX from 'xlsx'
import React from 'react'
import { CompanySettings, SupplierInvoice } from '@/types'
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// Types - Export for use in other components
export interface UVAEntry {
  taxRate: number
  netAmount: number
  taxAmount: number
  grossAmount: number
  invoiceCount: number
}

export interface InvoiceData {
  invoiceNumber: string
  date: string
  customerName: string
  netAmount: number
  taxRate: number
  taxAmount: number
  grossAmount: number
  isPaid: boolean
  paidDate?: string
  projectId: string
  orderNumber: string
  type?: 'partial' | 'final' | 'credit'
}

export interface SupplierInvoiceData {
  invoiceNumber: string
  date: string
  supplierName: string
  supplierUid?: string
  netAmount: number
  taxRate: number
  taxAmount: number
  grossAmount: number
  isPaid: boolean
  paidDate?: string
  category: string
}

export interface Totals {
  totalNet: number
  totalTax: number
  totalGross: number
  totalPaid: number
  totalOutstanding: number
  invoiceCount: number
  paidCount: number
}

export interface InputTaxTotals {
  totalNet: number
  totalTax: number
  count: number
}

// SKR03 Kontenrahmen (Standard für kleine/mittlere Unternehmen)
const SKR03_ACCOUNTS = {
  // Erlöse (Ausgangsrechnungen)
  revenue20: '8400', // Erlöse 20% USt
  revenue13: '8300', // Erlöse 13% USt
  revenue10: '8200', // Erlöse 10% USt
  revenue0: '8100', // Steuerfreie Erlöse

  // Aufwendungen (Eingangsrechnungen)
  material: '3400', // Wareneinkauf
  subcontractor: '4100', // Fremdleistungen
  tools: '0400', // Werkzeuge/Maschinen (Anlagevermögen)
  rent: '4210', // Miete
  insurance: '4360', // Versicherungen
  vehicle: '4500', // Fahrzeugkosten
  office: '4930', // Bürobedarf
  marketing: '4600', // Werbekosten
  other: '4900', // Sonstige Aufwendungen
}

// Kategorie zu DATEV-Konto Mapping
function getCategoryAccount(category: string): string {
  return SKR03_ACCOUNTS[category as keyof typeof SKR03_ACCOUNTS] || SKR03_ACCOUNTS.other
}

// Erlöskonto basierend auf Steuersatz
function getRevenueAccount(taxRate: number): string {
  if (taxRate >= 19) return SKR03_ACCOUNTS.revenue20
  if (taxRate >= 12) return SKR03_ACCOUNTS.revenue13
  if (taxRate >= 9) return SKR03_ACCOUNTS.revenue10
  return SKR03_ACCOUNTS.revenue0
}

// ============================================
// Excel Export: Komplette UVA mit Vorsteuer
// ============================================
export async function exportUVAExcel(
  uvaData: UVAEntry[],
  totals: Totals,
  period: string,
  companySettings?: CompanySettings | null,
  inputTaxData?: { taxRate: number; netAmount: number; taxAmount: number }[],
  inputTaxTotals?: InputTaxTotals
): Promise<void> {
  const workbook = XLSX.utils.book_new()

  // Sheet 1: UVA Komplett
  const uvaSheetData: (string | number)[][] = [
    ['UMSATZSTEUERVORANMELDUNG (UVA)'],
    [`Zeitraum: ${period}`],
    [`Firma: ${companySettings?.companyName || 'Ihr Unternehmen'}`],
    [`UID: ${companySettings?.uid || ''}`],
    [`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`],
    [],
    ['═══════════════════════════════════════════════════════════════'],
    ['UMSATZSTEUER (Ausgangsrechnungen)'],
    ['═══════════════════════════════════════════════════════════════'],
    [],
    ['Steuersatz', 'Netto-Umsatz (€)', 'Umsatzsteuer (€)', 'Brutto (€)', 'Anzahl'],
  ]

  uvaData.forEach(entry => {
    uvaSheetData.push([
      `${entry.taxRate}%`,
      entry.netAmount.toFixed(2),
      entry.taxAmount.toFixed(2),
      entry.grossAmount.toFixed(2),
      entry.invoiceCount,
    ])
  })

  uvaSheetData.push([])
  uvaSheetData.push([
    'SUMME UMSATZSTEUER',
    totals.totalNet.toFixed(2),
    totals.totalTax.toFixed(2),
    totals.totalGross.toFixed(2),
    totals.invoiceCount,
  ])

  // Vorsteuer (Eingangsrechnungen)
  if (inputTaxData && inputTaxData.length > 0 && inputTaxTotals) {
    uvaSheetData.push([])
    uvaSheetData.push(['═══════════════════════════════════════════════════════════════'])
    uvaSheetData.push(['VORSTEUER (Eingangsrechnungen)'])
    uvaSheetData.push(['═══════════════════════════════════════════════════════════════'])
    uvaSheetData.push([])
    uvaSheetData.push(['Steuersatz', 'Netto-Einkauf (€)', 'Vorsteuer (€)', '', 'Anzahl'])

    inputTaxData.forEach(entry => {
      uvaSheetData.push([
        `${entry.taxRate}%`,
        entry.netAmount.toFixed(2),
        entry.taxAmount.toFixed(2),
        '',
        '',
      ])
    })

    uvaSheetData.push([])
    uvaSheetData.push([
      'SUMME VORSTEUER',
      inputTaxTotals.totalNet.toFixed(2),
      inputTaxTotals.totalTax.toFixed(2),
      '',
      inputTaxTotals.count,
    ])

    // Zahllast
    const zahllast = totals.totalTax - inputTaxTotals.totalTax
    uvaSheetData.push([])
    uvaSheetData.push(['═══════════════════════════════════════════════════════════════'])
    uvaSheetData.push(['ZAHLLAST / ERSTATTUNG'])
    uvaSheetData.push(['═══════════════════════════════════════════════════════════════'])
    uvaSheetData.push([])
    uvaSheetData.push(['Umsatzsteuer gesamt:', '', totals.totalTax.toFixed(2) + ' €'])
    uvaSheetData.push(['Vorsteuer gesamt:', '', '−' + inputTaxTotals.totalTax.toFixed(2) + ' €'])
    uvaSheetData.push([])
    uvaSheetData.push([
      zahllast >= 0 ? 'ZAHLLAST (an Finanzamt):' : 'ERSTATTUNG (vom Finanzamt):',
      '',
      (zahllast >= 0 ? '' : '−') + Math.abs(zahllast).toFixed(2) + ' €',
    ])
  }

  const uvaSheet = XLSX.utils.aoa_to_sheet(uvaSheetData)

  // Spaltenbreiten
  uvaSheet['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 10 }]

  XLSX.utils.book_append_sheet(workbook, uvaSheet, 'UVA Komplett')

  // Sheet 2: Zusammenfassung
  const summaryData: (string | number)[][] = [
    ['ZUSAMMENFASSUNG'],
    [`Zeitraum: ${period}`],
    [],
    ['AUSGANGSRECHNUNGEN (Verkäufe)'],
    ['────────────────────────────────'],
    ['Gesamtumsatz (Netto)', totals.totalNet.toFixed(2) + ' €'],
    ['Umsatzsteuer', totals.totalTax.toFixed(2) + ' €'],
    ['Gesamtumsatz (Brutto)', totals.totalGross.toFixed(2) + ' €'],
    [],
    ['Anzahl Rechnungen', totals.invoiceCount],
    ['Bezahlte Rechnungen', totals.paidCount],
    ['Offene Rechnungen', totals.invoiceCount - totals.paidCount],
    ['Eingegangen', totals.totalPaid.toFixed(2) + ' €'],
    ['Ausstehend', totals.totalOutstanding.toFixed(2) + ' €'],
  ]

  if (inputTaxTotals) {
    summaryData.push([])
    summaryData.push(['EINGANGSRECHNUNGEN (Einkäufe)'])
    summaryData.push(['────────────────────────────────'])
    summaryData.push(['Gesamteinkauf (Netto)', inputTaxTotals.totalNet.toFixed(2) + ' €'])
    summaryData.push(['Vorsteuer', inputTaxTotals.totalTax.toFixed(2) + ' €'])
    summaryData.push(['Anzahl Rechnungen', inputTaxTotals.count])
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Zusammenfassung')

  const fileName = `UVA_${period.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(workbook, fileName)
}

// ============================================
// Excel Export: Alle Rechnungen (Ausgang + Eingang)
// ============================================
export async function exportInvoicesExcel(
  invoices: InvoiceData[],
  period: string,
  companySettings?: CompanySettings | null,
  supplierInvoices?: SupplierInvoice[]
): Promise<void> {
  const workbook = XLSX.utils.book_new()

  // Sheet 1: Ausgangsrechnungen
  const outgoingSheetData: (string | number)[][] = [
    ['AUSGANGSRECHNUNGEN (Verkäufe)'],
    [`Zeitraum: ${period}`],
    [`Firma: ${companySettings?.companyName || 'Ihr Unternehmen'}`],
    [`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`],
    [],
    [
      'Rechnungsnr.',
      'Datum',
      'Kunde',
      'Auftragsnr.',
      'Netto (€)',
      'MwSt (€)',
      'Brutto (€)',
      'Satz',
      'Status',
      'Bezahlt am',
    ],
  ]

  invoices.forEach(invoice => {
    outgoingSheetData.push([
      invoice.invoiceNumber,
      new Date(invoice.date).toLocaleDateString('de-DE'),
      invoice.customerName,
      invoice.orderNumber,
      invoice.netAmount.toFixed(2),
      invoice.taxAmount.toFixed(2),
      invoice.grossAmount.toFixed(2),
      `${invoice.taxRate}%`,
      invoice.isPaid ? 'Bezahlt' : 'Offen',
      invoice.paidDate ? new Date(invoice.paidDate).toLocaleDateString('de-DE') : '',
    ])
  })

  const totalNet = invoices.reduce((sum, inv) => sum + inv.netAmount, 0)
  const totalTax = invoices.reduce((sum, inv) => sum + inv.taxAmount, 0)
  const totalGross = invoices.reduce((sum, inv) => sum + inv.grossAmount, 0)

  outgoingSheetData.push([])
  outgoingSheetData.push([
    'SUMME',
    '',
    '',
    '',
    totalNet.toFixed(2),
    totalTax.toFixed(2),
    totalGross.toFixed(2),
    '',
    '',
    '',
  ])

  const outgoingSheet = XLSX.utils.aoa_to_sheet(outgoingSheetData)
  outgoingSheet['!cols'] = [
    { wch: 15 },
    { wch: 12 },
    { wch: 25 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 6 },
    { wch: 10 },
    { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(workbook, outgoingSheet, 'Ausgangsrechnungen')

  // Sheet 2: Eingangsrechnungen (wenn vorhanden)
  if (supplierInvoices && supplierInvoices.length > 0) {
    const incomingSheetData: (string | number)[][] = [
      ['EINGANGSRECHNUNGEN (Einkäufe)'],
      [`Zeitraum: ${period}`],
      [`Firma: ${companySettings?.companyName || 'Ihr Unternehmen'}`],
      [`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`],
      [],
      [
        'Rechnungsnr.',
        'Datum',
        'Lieferant',
        'UID',
        'Kategorie',
        'Netto (€)',
        'VSt (€)',
        'Brutto (€)',
        'Skonto %',
        'Skonto (€)',
        'Zahlungsbetrag (€)',
        'Satz',
        'Status',
      ],
    ]

    const categoryLabels: Record<string, string> = {
      material: 'Wareneinkauf',
      subcontractor: 'Subunternehmer',
      tools: 'Werkzeuge',
      rent: 'Miete',
      insurance: 'Versicherung',
      vehicle: 'Fahrzeug',
      office: 'Büro',
      marketing: 'Marketing',
      other: 'Sonstiges',
    }

    supplierInvoices.forEach(inv => {
      const skontoAmount = inv.skontoAmount ?? 0
      const zahlungsbetrag = inv.grossAmount - skontoAmount
      incomingSheetData.push([
        inv.invoiceNumber,
        new Date(inv.invoiceDate).toLocaleDateString('de-DE'),
        inv.supplierName,
        inv.supplierUid || '',
        categoryLabels[inv.category] || inv.category,
        inv.netAmount.toFixed(2),
        inv.taxAmount.toFixed(2),
        inv.grossAmount.toFixed(2),
        inv.skontoPercent != null ? inv.skontoPercent.toFixed(2) : '',
        skontoAmount > 0 ? skontoAmount.toFixed(2) : '',
        zahlungsbetrag.toFixed(2),
        `${inv.taxRate}%`,
        inv.isPaid ? 'Bezahlt' : 'Offen',
      ])
    })

    const suppTotalNet = supplierInvoices.reduce((sum, inv) => sum + inv.netAmount, 0)
    const suppTotalTax = supplierInvoices.reduce((sum, inv) => sum + inv.taxAmount, 0)
    const suppTotalGross = supplierInvoices.reduce((sum, inv) => sum + inv.grossAmount, 0)
    const suppTotalSkonto = supplierInvoices.reduce((sum, inv) => sum + (inv.skontoAmount ?? 0), 0)
    const suppTotalZahlung = suppTotalGross - suppTotalSkonto

    incomingSheetData.push([])
    incomingSheetData.push([
      'SUMME',
      '',
      '',
      '',
      '',
      suppTotalNet.toFixed(2),
      suppTotalTax.toFixed(2),
      suppTotalGross.toFixed(2),
      '',
      suppTotalSkonto.toFixed(2),
      suppTotalZahlung.toFixed(2),
      '',
      '',
    ])

    const incomingSheet = XLSX.utils.aoa_to_sheet(incomingSheetData)
    incomingSheet['!cols'] = [
      { wch: 15 },
      { wch: 12 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 8 },
      { wch: 12 },
      { wch: 14 },
      { wch: 6 },
      { wch: 10 },
    ]
    XLSX.utils.book_append_sheet(workbook, incomingSheet, 'Eingangsrechnungen')
  }

  // Sheet 3: Nach Steuersätzen gruppiert (Ausgang)
  const groupedByTax: { [key: number]: InvoiceData[] } = {}
  invoices.forEach(inv => {
    if (!groupedByTax[inv.taxRate]) groupedByTax[inv.taxRate] = []
    groupedByTax[inv.taxRate].push(inv)
  })

  Object.entries(groupedByTax).forEach(([taxRate, taxInvoices]) => {
    const taxSheetData: (string | number)[][] = [
      [`Rechnungen mit ${taxRate}% MwSt`],
      [],
      ['Rechnungsnr.', 'Datum', 'Kunde', 'Netto (€)', 'MwSt (€)', 'Brutto (€)', 'Status'],
    ]

    taxInvoices.forEach(inv => {
      taxSheetData.push([
        inv.invoiceNumber,
        new Date(inv.date).toLocaleDateString('de-DE'),
        inv.customerName,
        inv.netAmount.toFixed(2),
        inv.taxAmount.toFixed(2),
        inv.grossAmount.toFixed(2),
        inv.isPaid ? 'Bezahlt' : 'Offen',
      ])
    })

    const taxTotalNet = taxInvoices.reduce((sum, inv) => sum + inv.netAmount, 0)
    const taxTotalTax = taxInvoices.reduce((sum, inv) => sum + inv.taxAmount, 0)
    const taxTotalGross = taxInvoices.reduce((sum, inv) => sum + inv.grossAmount, 0)

    taxSheetData.push([])
    taxSheetData.push([
      'SUMME',
      '',
      '',
      taxTotalNet.toFixed(2),
      taxTotalTax.toFixed(2),
      taxTotalGross.toFixed(2),
      '',
    ])

    const taxSheet = XLSX.utils.aoa_to_sheet(taxSheetData)
    XLSX.utils.book_append_sheet(workbook, taxSheet, `USt ${taxRate}%`)
  })

  const fileName = `Rechnungen_${period.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(workbook, fileName)
}

// ============================================
// DATEV Export (Verbessertes Format mit SKR03)
// ============================================
export async function exportDATEV(
  invoices: InvoiceData[],
  uvaData: UVAEntry[],
  period: string,
  companySettings?: CompanySettings | null,
  supplierInvoices?: SupplierInvoice[]
): Promise<void> {
  // DATEV Buchungsstapel Format (vereinfacht)
  const datevLines: string[] = []

  // Header
  datevLines.push(
    '"Umsatz";"Soll/Haben";"Konto";"Gegenkonto";"BU-Schlüssel";"Belegdatum";"Belegfeld1";"Buchungstext";"USt-Satz"'
  )

  // Ausgangsrechnungen (Erlöse)
  invoices.forEach(invoice => {
    const belegDatum = formatDATEVDate(invoice.date)
    const konto = getRevenueAccount(invoice.taxRate)
    const buSchluessel = getBUSchluessel(invoice.taxRate)

    datevLines.push(
      [
        invoice.grossAmount.toFixed(2).replace('.', ','),
        'H', // Haben = Einnahme
        '1200', // Debitor/Bank
        konto,
        buSchluessel,
        belegDatum,
        `"${invoice.invoiceNumber}"`,
        `"${invoice.customerName.replace(/"/g, '""')}"`,
        invoice.taxRate.toString(),
      ].join(';')
    )
  })

  // Eingangsrechnungen (Aufwendungen)
  if (supplierInvoices && supplierInvoices.length > 0) {
    supplierInvoices.forEach(inv => {
      const belegDatum = formatDATEVDate(inv.invoiceDate)
      const konto = getCategoryAccount(inv.category)
      const buSchluessel = getBUSchluessel(inv.taxRate)

      datevLines.push(
        [
          inv.grossAmount.toFixed(2).replace('.', ','),
          'S', // Soll = Ausgabe
          konto,
          '1200', // Kreditor/Bank
          buSchluessel,
          belegDatum,
          `"${inv.invoiceNumber}"`,
          `"${inv.supplierName.replace(/"/g, '""')}"`,
          inv.taxRate.toString(),
        ].join(';')
      )
    })
  }

  // CSV erstellen
  const csvContent = datevLines.join('\n')
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `DATEV_${period.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// DATEV Datum Format: TTMM (nur Tag und Monat, Jahr aus Wirtschaftsjahr)
function formatDATEVDate(dateStr: string): string {
  const date = new Date(dateStr)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}${month}`
}

// BU-Schlüssel für Steuersätze (Österreich)
function getBUSchluessel(taxRate: number): string {
  if (taxRate === 20) return '9' // 20% Normalsteuersatz
  if (taxRate === 13) return '8' // 13% ermäßigt
  if (taxRate === 10) return '7' // 10% ermäßigt
  return '0' // Steuerfrei
}

// ============================================
// PDF Export für Steuerberater (Professionell)
// ============================================
const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 25,
    borderBottomWidth: 3,
    borderBottomColor: '#f59e0b',
    borderBottomStyle: 'solid',
    paddingBottom: 15,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 3,
  },
  title: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
    backgroundColor: '#f1f5f9',
    padding: 8,
  },
  uvaBox: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  uvaColumn: {
    flex: 1,
    padding: 10,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
  },
  uvaLabel: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  uvaValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  zahllastBox: {
    backgroundColor: '#fef3c7',
    padding: 12,
    marginTop: 10,
    borderRadius: 4,
  },
  zahllastLabel: {
    fontSize: 10,
    color: '#92400e',
    marginBottom: 3,
  },
  zahllastValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#92400e',
  },
  table: {
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
    paddingVertical: 6,
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
    fontWeight: 'bold',
  },
  tableCell: {
    fontSize: 9,
    color: '#334155',
    paddingHorizontal: 4,
  },
  tableCellRight: {
    textAlign: 'right',
  },
  summaryRow: {
    backgroundColor: '#f1f5f9',
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderTopStyle: 'solid',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
  },
  signatureArea: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '45%',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    borderTopStyle: 'solid',
    paddingTop: 5,
  },
  signatureLabel: {
    fontSize: 8,
    color: '#64748b',
  },
})

export interface AccountingPDFProps {
  title: string
  period: string
  startDate: Date
  endDate: Date
  uvaData: UVAEntry[]
  totals: Totals
  invoices: InvoiceData[]
  companySettings?: CompanySettings
  inputTaxData?: { taxRate: number; netAmount: number; taxAmount: number }[]
  inputTaxTotals?: InputTaxTotals
  supplierInvoices?: SupplierInvoice[]
}

const AccountingPDFDocument: React.FC<AccountingPDFProps> = ({
  period,
  uvaData,
  totals,
  invoices,
  companySettings,
  inputTaxData,
  inputTaxTotals,
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-AT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const zahllast = inputTaxTotals ? totals.totalTax - inputTaxTotals.totalTax : totals.totalTax

  return (
    <Document>
      {/* Seite 1: UVA Übersicht */}
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.companyName}>
            {companySettings?.companyName || 'Ihr Unternehmen'}
          </Text>
          <Text style={pdfStyles.title}>Buchhaltungsübersicht - {period}</Text>
          <Text style={pdfStyles.subtitle}>
            {companySettings?.uid ? `UID: ${companySettings.uid} • ` : ''}
            Erstellt am {new Date().toLocaleDateString('de-AT')}
          </Text>
        </View>

        {/* UVA Zusammenfassung */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Umsatzsteuervoranmeldung (UVA)</Text>

          <View style={pdfStyles.uvaBox}>
            <View style={[pdfStyles.uvaColumn, { backgroundColor: '#eff6ff' }]}>
              <Text style={pdfStyles.uvaLabel}>Umsatzsteuer</Text>
              <Text style={pdfStyles.uvaValue}>{formatCurrency(totals.totalTax)} €</Text>
              <Text style={{ fontSize: 8, color: '#64748b' }}>
                aus {totals.invoiceCount} Ausgangsrechnung{totals.invoiceCount !== 1 ? 'en' : ''}
              </Text>
            </View>

            <View style={[pdfStyles.uvaColumn, { backgroundColor: '#ecfdf5' }]}>
              <Text style={pdfStyles.uvaLabel}>Vorsteuer</Text>
              <Text style={pdfStyles.uvaValue}>
                {inputTaxTotals ? formatCurrency(inputTaxTotals.totalTax) : '0,00'} €
              </Text>
              <Text style={{ fontSize: 8, color: '#64748b' }}>
                aus {inputTaxTotals?.count || 0} Eingangsrechnung
                {(inputTaxTotals?.count || 0) !== 1 ? 'en' : ''}
              </Text>
            </View>
          </View>

          <View style={pdfStyles.zahllastBox}>
            <Text style={pdfStyles.zahllastLabel}>
              {zahllast >= 0 ? 'ZAHLLAST (an Finanzamt)' : 'ERSTATTUNG (vom Finanzamt)'}
            </Text>
            <Text style={pdfStyles.zahllastValue}>
              {zahllast >= 0 ? '' : '−'}
              {formatCurrency(Math.abs(zahllast))} €
            </Text>
          </View>
        </View>

        {/* Umsatzsteuer nach Steuersätzen */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Umsatzsteuer nach Steuersätzen</Text>
          <View style={pdfStyles.table}>
            <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
              <Text style={[pdfStyles.tableCell, { width: '20%' }]}>Steuersatz</Text>
              <Text style={[pdfStyles.tableCell, pdfStyles.tableCellRight, { width: '25%' }]}>
                Netto
              </Text>
              <Text style={[pdfStyles.tableCell, pdfStyles.tableCellRight, { width: '25%' }]}>
                USt
              </Text>
              <Text style={[pdfStyles.tableCell, pdfStyles.tableCellRight, { width: '20%' }]}>
                Brutto
              </Text>
              <Text style={[pdfStyles.tableCell, pdfStyles.tableCellRight, { width: '10%' }]}>
                Anz.
              </Text>
            </View>
            {uvaData.map((entry, index) => (
              <View key={index} style={pdfStyles.tableRow}>
                <Text style={[pdfStyles.tableCell, { width: '20%' }]}>{entry.taxRate}%</Text>
                <Text style={[pdfStyles.tableCell, pdfStyles.tableCellRight, { width: '25%' }]}>
                  {formatCurrency(entry.netAmount)} €
                </Text>
                <Text style={[pdfStyles.tableCell, pdfStyles.tableCellRight, { width: '25%' }]}>
                  {formatCurrency(entry.taxAmount)} €
                </Text>
                <Text style={[pdfStyles.tableCell, pdfStyles.tableCellRight, { width: '20%' }]}>
                  {formatCurrency(entry.grossAmount)} €
                </Text>
                <Text style={[pdfStyles.tableCell, pdfStyles.tableCellRight, { width: '10%' }]}>
                  {entry.invoiceCount}
                </Text>
              </View>
            ))}
            <View style={[pdfStyles.tableRow, pdfStyles.summaryRow]}>
              <Text style={[pdfStyles.tableCell, { width: '20%' }]}>Summe</Text>
              <Text style={[pdfStyles.tableCell, pdfStyles.tableCellRight, { width: '25%' }]}>
                {formatCurrency(totals.totalNet)} €
              </Text>
              <Text style={[pdfStyles.tableCell, pdfStyles.tableCellRight, { width: '25%' }]}>
                {formatCurrency(totals.totalTax)} €
              </Text>
              <Text style={[pdfStyles.tableCell, pdfStyles.tableCellRight, { width: '20%' }]}>
                {formatCurrency(totals.totalGross)} €
              </Text>
              <Text style={[pdfStyles.tableCell, pdfStyles.tableCellRight, { width: '10%' }]}>
                {totals.invoiceCount}
              </Text>
            </View>
          </View>
        </View>

        {/* Vorsteuer nach Steuersätzen */}
        {inputTaxData && inputTaxData.length > 0 && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Vorsteuer nach Steuersätzen</Text>
            <View style={pdfStyles.table}>
              <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
                <Text style={[pdfStyles.tableCell, { width: '30%' }]}>Steuersatz</Text>
                <Text style={[pdfStyles.tableCell, pdfStyles.tableCellRight, { width: '35%' }]}>
                  Netto
                </Text>
                <Text style={[pdfStyles.tableCell, pdfStyles.tableCellRight, { width: '35%' }]}>
                  Vorsteuer
                </Text>
              </View>
              {inputTaxData.map((entry, index) => (
                <View key={index} style={pdfStyles.tableRow}>
                  <Text style={[pdfStyles.tableCell, { width: '30%' }]}>{entry.taxRate}%</Text>
                  <Text style={[pdfStyles.tableCell, pdfStyles.tableCellRight, { width: '35%' }]}>
                    {formatCurrency(entry.netAmount)} €
                  </Text>
                  <Text style={[pdfStyles.tableCell, pdfStyles.tableCellRight, { width: '35%' }]}>
                    {formatCurrency(entry.taxAmount)} €
                  </Text>
                </View>
              ))}
              {inputTaxTotals && (
                <View style={[pdfStyles.tableRow, pdfStyles.summaryRow]}>
                  <Text style={[pdfStyles.tableCell, { width: '30%' }]}>Summe</Text>
                  <Text style={[pdfStyles.tableCell, pdfStyles.tableCellRight, { width: '35%' }]}>
                    {formatCurrency(inputTaxTotals.totalNet)} €
                  </Text>
                  <Text style={[pdfStyles.tableCell, pdfStyles.tableCellRight, { width: '35%' }]}>
                    {formatCurrency(inputTaxTotals.totalTax)} €
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Signaturbereich */}
        <View style={pdfStyles.signatureArea}>
          <View style={pdfStyles.signatureBox}>
            <Text style={pdfStyles.signatureLabel}>Datum, Unterschrift Unternehmer</Text>
          </View>
          <View style={pdfStyles.signatureBox}>
            <Text style={pdfStyles.signatureLabel}>Stempel</Text>
          </View>
        </View>

        <View style={pdfStyles.footer}>
          <Text style={pdfStyles.footerText}>
            {companySettings?.companyName || 'Ihr Unternehmen'} • {companySettings?.street || ''} •{' '}
            {companySettings?.postalCode || ''} {companySettings?.city || ''}
          </Text>
          <Text style={pdfStyles.footerText}>
            Dieses Dokument wurde automatisch erstellt und dient als Grundlage für die Buchhaltung.
          </Text>
        </View>
      </Page>

      {/* Seite 2: Rechnungsliste (wenn Rechnungen vorhanden) */}
      {invoices.length > 0 && (
        <Page size="A4" style={pdfStyles.page}>
          <View style={pdfStyles.header}>
            <Text style={pdfStyles.companyName}>Rechnungsübersicht</Text>
            <Text style={pdfStyles.title}>Ausgangsrechnungen - {period}</Text>
          </View>

          <View style={pdfStyles.table}>
            <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
              <Text style={[pdfStyles.tableCell, { width: '15%' }]}>RE-Nr.</Text>
              <Text style={[pdfStyles.tableCell, { width: '12%' }]}>Datum</Text>
              <Text style={[pdfStyles.tableCell, { width: '28%' }]}>Kunde</Text>
              <Text style={[pdfStyles.tableCell, pdfStyles.tableCellRight, { width: '15%' }]}>
                Netto
              </Text>
              <Text style={[pdfStyles.tableCell, pdfStyles.tableCellRight, { width: '15%' }]}>
                Brutto
              </Text>
              <Text style={[pdfStyles.tableCell, { width: '15%' }]}>Status</Text>
            </View>
            {invoices.slice(0, 35).map((invoice, index) => (
              <View key={index} style={pdfStyles.tableRow}>
                <Text style={[pdfStyles.tableCell, { width: '15%' }]}>{invoice.invoiceNumber}</Text>
                <Text style={[pdfStyles.tableCell, { width: '12%' }]}>
                  {new Date(invoice.date).toLocaleDateString('de-AT')}
                </Text>
                <Text style={[pdfStyles.tableCell, { width: '28%' }]}>
                  {invoice.customerName.substring(0, 25)}
                </Text>
                <Text style={[pdfStyles.tableCell, pdfStyles.tableCellRight, { width: '15%' }]}>
                  {formatCurrency(invoice.netAmount)} €
                </Text>
                <Text style={[pdfStyles.tableCell, pdfStyles.tableCellRight, { width: '15%' }]}>
                  {formatCurrency(invoice.grossAmount)} €
                </Text>
                <Text style={[pdfStyles.tableCell, { width: '15%' }]}>
                  {invoice.isPaid ? 'Bezahlt' : 'Offen'}
                </Text>
              </View>
            ))}
            {invoices.length > 35 && (
              <View style={pdfStyles.tableRow}>
                <Text style={[pdfStyles.tableCell, { width: '100%', fontStyle: 'italic' }]}>
                  ... und {invoices.length - 35} weitere Rechnungen (siehe Excel-Export)
                </Text>
              </View>
            )}
          </View>

          <View style={pdfStyles.footer}>
            <Text style={pdfStyles.footerText}>
              Seite 2 • {companySettings?.companyName || 'Ihr Unternehmen'}
            </Text>
          </View>
        </Page>
      )}
    </Document>
  )
}

export async function exportAccountingPDF(props: AccountingPDFProps): Promise<void> {
  const blob = await pdf(<AccountingPDFDocument {...props} />).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Buchhaltung_${props.period.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
