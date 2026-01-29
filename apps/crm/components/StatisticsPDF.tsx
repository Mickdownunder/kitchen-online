'use client'

import React from 'react'
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
// CustomerProject type available via props

interface StatisticsPDFProps {
  title: string
  year: number
  stats: {
    totalRevenue: number
    totalNet: number
    marginPercent: number
    grossMargin: number
    projectCount: number
    totalPaid: number
    outstanding: number
  }
  monthlyData: Array<{
    month: string
    revenue: number
    margin: number
    marginPercent: number
    count: number
  }>
  topCustomers: Array<{
    name: string
    revenue: number
    margin: number
    marginPercent: number
    projects: number
    avgValue: number
  }>
  companyName?: string
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2 solid #f59e0b',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
    backgroundColor: '#f8fafc',
    padding: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  metricBox: {
    width: '48%',
    backgroundColor: '#f8fafc',
    padding: 12,
    marginBottom: 10,
    borderRadius: 4,
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  table: {
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #e2e8f0',
    paddingVertical: 8,
  },
  tableHeader: {
    backgroundColor: '#f1f5f9',
    fontWeight: 'bold',
    fontSize: 10,
    color: '#475569',
  },
  tableCell: {
    fontSize: 10,
    color: '#1e293b',
    paddingHorizontal: 8,
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
})

const StatisticsPDFDocument: React.FC<StatisticsPDFProps> = ({
  title,
  year,
  stats,
  monthlyData,
  topCustomers,
  companyName = 'KüchenProfi',
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {companyName} • Jahr {year} • Erstellt am {new Date().toLocaleDateString('de-DE')}
          </Text>
        </View>

        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kernkennzahlen</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Gesamtumsatz</Text>
              <Text style={styles.metricValue}>{formatCurrency(stats.totalRevenue)} €</Text>
              <Text style={[styles.metricLabel, { marginTop: 4 }]}>
                Netto: {formatCurrency(stats.totalNet)} €
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Durchschnittliche Marge</Text>
              <Text style={styles.metricValue}>{stats.marginPercent.toFixed(1)}%</Text>
              <Text style={[styles.metricLabel, { marginTop: 4 }]}>
                Bruttomarge: {formatCurrency(stats.grossMargin)} €
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Projekte</Text>
              <Text style={styles.metricValue}>{stats.projectCount}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Eingegangen</Text>
              <Text style={styles.metricValue}>{formatCurrency(stats.totalPaid)} €</Text>
              <Text style={[styles.metricLabel, { marginTop: 4 }]}>
                Ausstehend: {formatCurrency(stats.outstanding)} €
              </Text>
            </View>
          </View>
        </View>

        {/* Monthly Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monatlicher Überblick</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, styles.colName]}>Monat</Text>
              <Text style={[styles.tableCell, styles.colRevenue]}>Umsatz</Text>
              <Text style={[styles.tableCell, styles.colMargin]}>Marge</Text>
              <Text style={[styles.tableCell, styles.colMarginPercent]}>Marge %</Text>
              <Text style={[styles.tableCell, styles.colProjects]}>Projekte</Text>
            </View>
            {monthlyData.map((month, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colName]}>{month.month}</Text>
                <Text style={[styles.tableCell, styles.colRevenue]}>
                  {formatCurrency(month.revenue)} €
                </Text>
                <Text style={[styles.tableCell, styles.colMargin]}>
                  {formatCurrency(month.margin)} €
                </Text>
                <Text style={[styles.tableCell, styles.colMarginPercent]}>
                  {month.marginPercent}%
                </Text>
                <Text style={[styles.tableCell, styles.colProjects]}>{month.count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Customers */}
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
                  {formatCurrency(customer.margin)} €
                </Text>
                <Text style={[styles.tableCell, styles.colMarginPercent]}>
                  {customer.marginPercent.toFixed(1)}%
                </Text>
                <Text style={[styles.tableCell, styles.colProjects]}>{customer.projects}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Diese Statistik wurde automatisch generiert</Text>
      </Page>
    </Document>
  )
}

export const downloadStatisticsPDF = async (props: StatisticsPDFProps): Promise<void> => {
  const blob = await pdf(<StatisticsPDFDocument {...props} />).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Statistik_${props.year}_${new Date().toISOString().split('T')[0]}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default StatisticsPDFDocument
