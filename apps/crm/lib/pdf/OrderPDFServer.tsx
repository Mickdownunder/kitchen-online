// Server-compatible version of OrderPDF for API routes
// This file intentionally omits 'use client' to work with renderToBuffer

import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { CustomerProject, CompanySettings, InvoiceItem } from '@/types'
import { PDF_DESIGN } from '@/lib/pdf/pdfDesignTokens'

const D = PDF_DESIGN
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: D.fontSize.body,
    padding: D.spacing.pagePadding,
    backgroundColor: '#ffffff',
    color: D.colors.text,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: D.spacing.sectionGap,
    paddingBottom: D.spacing.headerPaddingBottom,
    borderBottomWidth: 3,
    borderBottomColor: D.accent.order,
  },
  logo: {
    fontSize: 18,
    fontWeight: 700,
    color: D.colors.text,
    letterSpacing: -0.5,
  },
  companySubtitle: {
    fontSize: D.fontSize.caption,
    color: D.colors.secondary,
    marginTop: 4,
  },
  companyContact: {
    textAlign: 'right',
    fontSize: D.fontSize.caption,
    color: D.colors.secondary,
  },
  recipientSection: {
    marginBottom: D.spacing.sectionGap,
  },
  recipientLabel: {
    fontSize: D.fontSize.micro,
    color: D.colors.muted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  recipientName: {
    fontSize: 12,
    fontWeight: 700,
    color: D.colors.text,
    marginBottom: 2,
  },
  recipientAddress: {
    fontSize: D.fontSize.body,
    color: D.colors.secondary,
  },
  titleSection: {
    marginBottom: 25,
    paddingBottom: D.spacing.titlePaddingBottom,
    borderBottomWidth: 1,
    borderBottomColor: D.colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleBadge: {
    backgroundColor: D.accent.order,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  orderTitle: {
    fontSize: D.fontSize.title,
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  orderSubtitle: {
    fontSize: D.fontSize.small,
    color: D.colors.secondary,
    marginTop: 8,
  },
  orderNumberLabel: {
    fontSize: D.fontSize.micro,
    color: D.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  orderNumberValue: {
    fontSize: 12,
    fontWeight: 700,
    color: D.colors.text,
    marginTop: 2,
  },
  titleRight: {
    textAlign: 'right',
  },
  // Meta info card
  metaCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    marginBottom: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaColumn: {
    flex: 1,
  },
  metaLabel: {
    fontSize: D.fontSize.micro,
    color: D.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 11,
    fontWeight: 700,
    color: D.colors.text,
  },
  montageRow: {
    marginTop: 8,
  },
  montageLabel: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  montageValue: {
    fontSize: 10,
    fontWeight: 600,
    color: '#1e293b',
  },
  // Table with border
  tableBox: {
    borderWidth: 1.5,
    borderColor: D.colors.borderDark,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 20,
  },
  table: { },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: D.colors.headerBg,
    padding: 10,
  },
  tableHeaderCell: {
    fontSize: D.fontSize.micro,
    fontWeight: 700,
    color: D.colors.headerText,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: D.colors.borderDark,
    padding: 10,
    alignItems: 'flex-start',
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: { fontSize: D.fontSize.small, color: D.colors.secondary },
  tableCellBold: { fontSize: D.fontSize.small, fontWeight: 600, color: D.colors.text },
  // Gleiche Spalten wie in Rechnung: Menge | Modell | Bezeichnung | Hersteller
  colQty: { width: '18%', textAlign: 'left' },
  colModel: { width: '18%' },
  colDesc: { width: '46%' },
  colManufacturer: { width: '18%' },
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 25,
  },
  totalsBox: { width: 250 },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  totalsLabel: { fontSize: D.fontSize.small, color: D.colors.secondary },
  totalsValue: { fontSize: D.fontSize.small, fontWeight: 600, color: D.colors.text },
  totalsFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: D.colors.text,
  },
  totalsFinalLabel: { fontSize: 11, fontWeight: 700, color: D.colors.text },
  totalsFinalValue: { fontSize: 14, fontWeight: 700, color: D.accent.order },
  signatureSection: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: D.colors.border,
  },
  signatureBox: {
    width: '100%',
    maxWidth: 280,
    paddingTop: 28,
    borderTopWidth: 1,
    borderTopColor: D.colors.text,
  },
  signatureLabel: {
    fontSize: D.fontSize.caption,
    color: D.colors.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute' as const,
    bottom: 30,
    left: D.spacing.pagePadding,
    right: D.spacing.pagePadding,
    textAlign: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: D.colors.border,
  },
  footerText: {
    fontSize: D.fontSize.micro,
    color: D.colors.muted,
    marginBottom: 2,
  },
  agbTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: D.colors.text,
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: D.accent.order,
    paddingBottom: 12,
  },
  agbParagraph: {
    marginBottom: 12,
  },
  agbText: {
    fontSize: D.fontSize.small,
    color: D.colors.text,
    lineHeight: 1.4,
  },
  orderFooterParagraph: {
    marginBottom: 8,
  },
  orderFooterText: {
    fontSize: D.fontSize.small,
    color: D.colors.secondary,
    lineHeight: 1.35,
  },
  pageInfo: {
    position: 'absolute' as const,
    bottom: 12,
    right: D.spacing.pagePadding,
    fontSize: D.fontSize.micro,
    color: D.colors.muted,
  },
})

const formatCurrency = (amount: number): string =>
  `${amount.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

export interface OrderPDFServerProps {
  project: CustomerProject
  company: CompanySettings | null
  showUnitPrices?: boolean
  appendAgb?: boolean
}

export const OrderPDFDocumentServer: React.FC<OrderPDFServerProps> = ({
  project,
  company,
  appendAgb = false,
}) => {
  const orderDate =
    project.offerDate || project.orderDate || project.updatedAt || new Date().toISOString()
  const items: InvoiceItem[] = project.items ?? []
  const companyFullName = company
    ? (company.companyName || '') + (company.legalForm ? ` ${company.legalForm}` : '')
    : 'Firmenstammdaten nicht hinterlegt'
  const companyAddress = company
    ? `${company.street || ''} ${company.houseNumber || ''} · ${company.postalCode || ''} ${company.city || ''} · ${company.country || 'Österreich'}`.trim()
    : ''

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>{companyFullName}</Text>
            {companyAddress ? <Text style={styles.companySubtitle}>{companyAddress}</Text> : null}
          </View>
          {company ? (
            <View style={styles.companyContact}>
              {company.phone ? <Text>Tel: {company.phone}</Text> : null}
              {company.email ? <Text>{company.email}</Text> : null}
              {company.website ? <Text>{company.website}</Text> : null}
            </View>
          ) : null}
        </View>

        {/* Recipient / Auftraggeber */}
        <View style={styles.recipientSection}>
          <Text style={styles.recipientLabel}>Auftraggeber</Text>
          <Text style={styles.recipientName}>{project.customerName}</Text>
          {project.address ? <Text style={styles.recipientAddress}>{project.address}</Text> : null}
          {project.phone ? <Text style={styles.recipientAddress}>Tel: {project.phone}</Text> : null}
          {project.email ? (
            <Text style={styles.recipientAddress}>E-Mail: {project.email}</Text>
          ) : null}
        </View>

        {/* Title: Auftrag mit Badge */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <View>
              <View style={styles.titleBadge}>
                <Text style={styles.orderTitle}>AUFTRAG</Text>
              </View>
              <Text style={styles.orderSubtitle}>Auftragsbestätigung</Text>
            </View>
            <View style={styles.titleRight}>
              <Text style={styles.orderNumberLabel}>Auftragsnummer</Text>
              <Text style={styles.orderNumberValue}>{project.orderNumber}</Text>
            </View>
          </View>
        </View>

        {/* Meta Info Card */}
        <View style={styles.metaCard}>
          <View style={styles.metaColumn}>
            <Text style={styles.metaLabel}>Auftragsdatum</Text>
            <Text style={styles.metaValue}>
              {new Date(orderDate).toLocaleDateString('de-AT')}
            </Text>
          </View>
          {project.installationDate ? (
            <View style={styles.metaColumn}>
              <Text style={styles.metaLabel}>Montagetermin</Text>
              <Text style={styles.metaValue}>
                {new Date(project.installationDate).toLocaleDateString('de-AT')}
                {project.installationTime ? `, ${project.installationTime}` : ''}
              </Text>
            </View>
          ) : null}
          {project.customerId ? (
            <View style={styles.metaColumn}>
              <Text style={styles.metaLabel}>Kundennummer</Text>
              <Text style={styles.metaValue}>
                {project.customerId.slice(0, 8) || `K-${(project.id || '').slice(0, 6)}`}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Items Table mit Rahmen - gleiche Spalten wie Rechnung */}
        <View style={styles.tableBox}>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>Menge</Text>
              <Text style={[styles.tableHeaderCell, styles.colModel]}>Modell</Text>
              <Text style={[styles.tableHeaderCell, styles.colDesc]}>Bezeichnung</Text>
              <Text style={[styles.tableHeaderCell, styles.colManufacturer]}>Hersteller</Text>
            </View>
            {items.map((item, index) => {
              const isLast = index === items.length - 1
              return (
                <View
                  key={item.id || index}
                  style={[styles.tableRow, isLast ? styles.tableRowLast : {}]}
                >
                  <Text style={[styles.tableCell, styles.colQty]}>
                    {item.quantity} {item.unit}
                  </Text>
                  <Text style={[styles.tableCell, styles.colModel]}>
                    {item.modelNumber || '-'}
                  </Text>
                  <View style={styles.colDesc}>
                    {(item.description || '').split('\n').map((line, i) => (
                      <Text key={i} style={styles.tableCellBold}>{line}</Text>
                    ))}
                  </View>
                  <Text style={[styles.tableCell, styles.colManufacturer]}>
                    {item.manufacturer || '-'}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Netto</Text>
              <Text style={styles.totalsValue}>{formatCurrency(project.netAmount ?? 0)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>MwSt.</Text>
              <Text style={styles.totalsValue}>{formatCurrency(project.taxAmount ?? 0)}</Text>
            </View>
            <View style={styles.totalsFinal}>
              <Text style={styles.totalsFinalLabel}>Gesamtbetrag (brutto)</Text>
              <Text style={styles.totalsFinalValue}>
                {formatCurrency(project.totalAmount ?? 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Auftrag-Fußtext */}
        {project.orderFooterText?.trim() ? (
          <View style={{ marginBottom: 16 }}>
            {project.orderFooterText
              .trim()
              .split(/\n\n+/)
              .map((paragraph, pIdx) => (
                <View key={pIdx} style={styles.orderFooterParagraph}>
                  {paragraph.split('\n').map((line, lIdx) => (
                    <Text key={lIdx} style={styles.orderFooterText}>
                      {line || ' '}
                    </Text>
                  ))}
                </View>
              ))}
          </View>
        ) : null}

        {/* Signature */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Unterschrift Auftraggeber</Text>
          </View>
        </View>

        {/* Footer */}
        {company ? (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {companyFullName} · {companyAddress}
            </Text>
            {company.uid ? <Text style={styles.footerText}>UID: {company.uid}</Text> : null}
          </View>
        ) : null}
        <Text
          style={styles.pageInfo}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Auftragsnr. ${project.orderNumber} · Seite ${pageNumber} von ${totalPages}`
          }
        />
      </Page>

      {/* AGB als letzte Seite */}
      {appendAgb && company?.agbText?.trim() ? (
        <Page size="A4" style={styles.page}>
          <Text style={styles.agbTitle}>Allgemeine Geschäftsbedingungen (AGB)</Text>
          {company.agbText
            .trim()
            .split(/\n\n+/)
            .map((paragraph, pIdx) => (
              <View key={pIdx} style={styles.agbParagraph}>
                {paragraph.split('\n').map((line, lIdx) => (
                  <Text key={lIdx} style={styles.agbText}>
                    {line || ' '}
                  </Text>
                ))}
              </View>
            ))}
          <Text
            style={styles.pageInfo}
            fixed
            render={({ pageNumber, totalPages }) =>
              `Auftragsnr. ${project.orderNumber} · Seite ${pageNumber} von ${totalPages}`
            }
          />
        </Page>
      ) : null}
    </Document>
  )
}
