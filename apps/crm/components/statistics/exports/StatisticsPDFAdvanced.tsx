'use client'

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer'
// CustomerProject type available via props

interface StatisticsPDFAdvancedProps {
  title: string
  year: number | 'all'
  companyName?: string
  // Overview data
  soldRevenue?: number
  invoicedRevenue?: number
  receivedMoney?: number
  outstanding?: number
  // Projects data
  projectStats?: {
    totalRevenue: number
    totalNet: number
    totalPurchasePrice: number
    grossMargin: number | null
    marginPercent: number | null
    projectCount: number
    avgProjectValue: number
  }
  monthlyProjectData?: Array<{
    month: string
    revenue: number
    net: number
    purchase: number
    margin: number
    marginPercent: number | null
    count: number
  }>
  topCustomers?: Array<{
    name: string
    revenue: number
    net: number
    purchase: number
    margin: number
    marginPercent: number | null
    projects: number
    avgValue: number
  }>
  // Invoices data
  invoiceStats?: {
    invoicedRevenue: number
    accountingRevenue?: number
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
  // Chart images (base64 encoded PNGs)
  chartImages?: {
    monthlyRevenue?: string
    projectCount?: string
    statusDistribution?: string
    topCustomers?: string
    invoiceTypes?: string
    paymentStatus?: string
  }
}

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  coverPage: {
    height: '100%',
    backgroundColor: '#1e293b',
    padding: 60,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 24,
    color: '#cbd5e1',
    marginBottom: 40,
    textAlign: 'center',
  },
  coverYear: {
    fontSize: 18,
    color: '#f59e0b',
    fontWeight: 'bold',
  },
  coverFooter: {
    position: 'absolute',
    bottom: 40,
    fontSize: 12,
    color: '#94a3b8',
  },
  contentPage: {
    padding: 40,
  },
  header: {
    marginBottom: 30,
    borderBottom: '3 solid #f59e0b',
    paddingBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  section: {
    marginBottom: 30,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 15,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#f8fafc',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    border: '2 solid #e2e8f0',
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  metricSubtext: {
    fontSize: 9,
    color: '#94a3b8',
  },
  chartContainer: {
    marginTop: 15,
    marginBottom: 15,
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 4,
    border: '1 solid #e2e8f0',
  },
  chartImage: {
    width: '100%',
    maxHeight: 300,
    objectFit: 'contain',
  },
  table: {
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  tableHeader: {
    backgroundColor: '#1e293b',
    fontWeight: 'bold',
    fontSize: 10,
    color: '#ffffff',
  },
  tableCell: {
    fontSize: 9,
    color: '#1e293b',
    paddingHorizontal: 5,
  },
  colRank: { width: '8%' },
  colName: { width: '32%' },
  colRevenue: { width: '15%', textAlign: 'right' },
  colMargin: { width: '15%', textAlign: 'right' },
  colMarginPercent: { width: '15%', textAlign: 'right' },
  colProjects: { width: '15%', textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
    borderTop: '1 solid #e2e8f0',
    paddingTop: 10,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    fontSize: 8,
    color: '#94a3b8',
  },
  highlightBox: {
    backgroundColor: '#fef3c7',
    border: '2 solid #f59e0b',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  highlightText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400e',
  },
})

const StatisticsPDFAdvancedDocument: React.FC<StatisticsPDFAdvancedProps> = ({
  title,
  year,
  companyName = 'KüchenProfi',
  soldRevenue,
  invoicedRevenue,
  receivedMoney,
  outstanding,
  projectStats,
  topCustomers = [],
  invoiceStats,
  chartImages,
}) => {
  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '—'
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatPercent = (value: number | null | undefined) => {
    if (value == null) return '—'
    return `${value.toFixed(1)}%`
  }

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          <Text style={styles.coverTitle}>{title}</Text>
          <Text style={styles.coverSubtitle}>{companyName}</Text>
          <Text style={styles.coverYear}>
            {year === 'all' ? 'Gesamtübersicht' : `Jahr ${year}`}
          </Text>
          <Text style={styles.coverFooter}>
            Erstellt am{' '}
            {new Date().toLocaleDateString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </Page>

      {/* Overview Page */}
      {(soldRevenue !== undefined || invoicedRevenue !== undefined) && (
        <Page size="A4" style={styles.contentPage}>
          <View style={styles.header}>
            <Text style={styles.title}>Übersicht</Text>
            <Text style={styles.subtitle}>Kernkennzahlen und Key Metrics</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Umsatz-Kennzahlen</Text>
            <View style={styles.metricsGrid}>
              {soldRevenue !== undefined && (
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Verkaufter Umsatz</Text>
                  <Text style={styles.metricValue}>{formatCurrency(soldRevenue)} €</Text>
                  <Text style={styles.metricSubtext}>Auftrags-Umsatz</Text>
                </View>
              )}
              {invoicedRevenue !== undefined && (
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Buchhalterischer Umsatz</Text>
                  <Text style={styles.metricValue}>{formatCurrency(invoicedRevenue)} €</Text>
                  <Text style={styles.metricSubtext}>Nur Schlussrechnungen</Text>
                </View>
              )}
              {receivedMoney !== undefined && (
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Eingegangen</Text>
                  <Text style={styles.metricValue}>{formatCurrency(receivedMoney)} €</Text>
                  <Text style={styles.metricSubtext}>Cash Flow</Text>
                </View>
              )}
              {outstanding !== undefined && (
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Offene Forderungen</Text>
                  <Text style={styles.metricValue}>{formatCurrency(outstanding)} €</Text>
                  <Text style={styles.metricSubtext}>Ausstehend</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.footer}>Seite 1 • {companyName} Statistik Report</Text>
          <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} />
        </Page>
      )}

      {/* Projects Page */}
      {projectStats && (
        <Page size="A4" style={styles.contentPage}>
          <View style={styles.header}>
            <Text style={styles.title}>Aufträge</Text>
            <Text style={styles.subtitle}>Projekt-Statistiken und Analysen</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Projekt-Kennzahlen</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Verkaufter Umsatz</Text>
                <Text style={styles.metricValue}>
                  {formatCurrency(projectStats.totalRevenue)} €
                </Text>
                <Text style={styles.metricSubtext}>
                  Netto: {formatCurrency(projectStats.totalNet)} €
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Projekte</Text>
                <Text style={styles.metricValue}>{projectStats.projectCount}</Text>
                <Text style={styles.metricSubtext}>
                  Ø {formatCurrency(projectStats.avgProjectValue)} €
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Marge</Text>
                <Text style={styles.metricValue}>{formatPercent(projectStats.marginPercent)}</Text>
                <Text style={styles.metricSubtext}>
                  {projectStats.grossMargin != null
                    ? `${formatCurrency(projectStats.grossMargin)} €`
                    : 'EK erfassen'}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Einkaufspreis</Text>
                <Text style={styles.metricValue}>
                  {formatCurrency(projectStats.totalPurchasePrice)} €
                </Text>
                <Text style={styles.metricSubtext}>Gesamt</Text>
              </View>
            </View>
          </View>

          {chartImages?.monthlyRevenue && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Monatliche Umsatz-Entwicklung</Text>
              <View style={styles.chartContainer}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image
                  src={chartImages.monthlyRevenue}
                  style={styles.chartImage}
                />
              </View>
            </View>
          )}

          {topCustomers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top 15 Kunden nach Umsatz</Text>
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.tableCell, styles.colRank]}>#</Text>
                  <Text style={[styles.tableCell, styles.colName]}>Kunde</Text>
                  <Text style={[styles.tableCell, styles.colRevenue]}>Umsatz</Text>
                  <Text style={[styles.tableCell, styles.colMargin]}>Marge</Text>
                  <Text style={[styles.tableCell, styles.colMarginPercent]}>Marge %</Text>
                  <Text style={[styles.tableCell, styles.colProjects]}>Projekte</Text>
                </View>
                {topCustomers.slice(0, 15).map((customer, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.colRank]}>{index + 1}</Text>
                    <Text style={[styles.tableCell, styles.colName]}>{customer.name}</Text>
                    <Text style={[styles.tableCell, styles.colRevenue]}>
                      {formatCurrency(customer.revenue)} €
                    </Text>
                    <Text style={[styles.tableCell, styles.colMargin]}>
                      {customer.marginPercent != null
                        ? `${formatCurrency(customer.margin)} €`
                        : '—'}
                    </Text>
                    <Text style={[styles.tableCell, styles.colMarginPercent]}>
                      {formatPercent(customer.marginPercent)}
                    </Text>
                    <Text style={[styles.tableCell, styles.colProjects]}>{customer.projects}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <Text style={styles.footer}>Seite 2 • {companyName} Statistik Report</Text>
          <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} />
        </Page>
      )}

      {/* Invoices Page */}
      {invoiceStats && (
        <Page size="A4" style={styles.contentPage}>
          <View style={styles.header}>
            <Text style={styles.title}>Rechnungen</Text>
            <Text style={styles.subtitle}>Rechnungs-Statistiken und Zahlungsstatus</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rechnungs-Kennzahlen</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Buchhalterischer Umsatz</Text>
                <Text style={styles.metricValue}>
                  {formatCurrency(invoiceStats.invoicedRevenue)} €
                </Text>
                <Text style={styles.metricSubtext}>
                  Nur Schlussrechnungen
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Anzahlungs-Umsatz</Text>
                <Text style={styles.metricValue}>
                  {formatCurrency(invoiceStats.depositRevenue)} €
                </Text>
                <Text style={styles.metricSubtext}>{invoiceStats.depositCount} Anzahlungen</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Gesamt</Text>
                <Text style={styles.metricValue}>
                  {formatCurrency(invoiceStats.invoicedRevenue + invoiceStats.depositRevenue)} €
                </Text>
                <Text style={styles.metricSubtext}>{invoiceStats.totalInvoices} Rechnungen</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Eingegangen</Text>
                <Text style={styles.metricValue}>{formatCurrency(invoiceStats.totalPaid)} €</Text>
                <Text style={styles.metricSubtext}>Bezahlt</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Offen</Text>
                <Text style={styles.metricValue}>
                  {formatCurrency(invoiceStats.totalOutstanding)} €
                </Text>
                <Text style={styles.metricSubtext}>Ausstehend</Text>
              </View>
            </View>
          </View>

          {chartImages?.invoiceTypes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Umsatz nach Rechnungsart</Text>
              <View style={styles.chartContainer}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image
                  src={chartImages.invoiceTypes}
                  style={styles.chartImage}
                />
              </View>
            </View>
          )}

          {chartImages?.paymentStatus && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Zahlungsstatus</Text>
              <View style={styles.chartContainer}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image
                  src={chartImages.paymentStatus}
                  style={styles.chartImage}
                />
              </View>
            </View>
          )}

          <Text style={styles.footer}>Seite 3 • {companyName} Statistik Report</Text>
          <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} />
        </Page>
      )}
    </Document>
  )
}

export const downloadStatisticsPDFAdvanced = async (
  props: StatisticsPDFAdvancedProps
): Promise<void> => {
  const blob = await pdf(<StatisticsPDFAdvancedDocument {...props} />).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const yearStr = props.year === 'all' ? 'Gesamt' : String(props.year)
  link.download = `Statistik_${yearStr}_${new Date().toISOString().split('T')[0]}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default StatisticsPDFAdvancedDocument
