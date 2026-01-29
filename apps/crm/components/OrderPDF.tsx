'use client'

import React from 'react'
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
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
    borderBottomWidth: 2,
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
    alignItems: 'flex-end',
  },
  orderTitle: {
    fontSize: D.fontSize.title,
    fontWeight: 700,
    color: D.colors.text,
    letterSpacing: -0.5,
  },
  orderSubtitle: {
    fontSize: D.fontSize.small,
    color: D.colors.secondary,
    marginTop: 3,
  },
  orderNumber: {
    textAlign: 'right',
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
  table: { marginBottom: 20 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: D.colors.headerBg,
    padding: 10,
    borderRadius: 4,
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
    borderBottomColor: '#f1f5f9',
    padding: 10,
    alignItems: 'flex-start',
  },
  tableCell: { fontSize: D.fontSize.small, color: D.colors.secondary },
  tableCellBold: { fontSize: D.fontSize.small, fontWeight: 600, color: D.colors.text },
  colPos: { width: '10%' },
  colDesc: { width: '60%' },
  colQty: { width: '15%', textAlign: 'center' },
  colUnit: { width: '15%', textAlign: 'center' },
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
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  signatureBox: {
    width: '45%',
    paddingTop: 50,
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
})

const formatCurrency = (amount: number): string =>
  `${amount.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

export interface OrderPDFProps {
  project: CustomerProject
  company: CompanySettings | null
  /** Einzelpreise in der Positionstabelle anzeigen (Standard: false = kundengerecht ohne Preise) */
  showUnitPrices?: boolean
  /** AGB als letzte Seite anhängen (nur wenn company.agbText vorhanden) */
  appendAgb?: boolean
}

export const OrderPDFDocument: React.FC<OrderPDFProps> = ({
  project,
  company,
  showUnitPrices = false,
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

        {/* Title: Auftrag – links Titel, rechts Datum + Auftragsnummer + ggf. Montagetermin */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.orderTitle}>AUFTRAG</Text>
            </View>
            <View style={styles.titleRight}>
              <Text style={styles.orderNumberLabel}>Datum</Text>
              <Text style={styles.orderNumberValue}>
                {new Date(orderDate).toLocaleDateString('de-AT')}
              </Text>
              <View style={styles.montageRow}>
                <Text style={styles.orderNumberLabel}>Auftragsnummer</Text>
                <Text style={styles.orderNumberValue}>{project.orderNumber}</Text>
              </View>
              {project.installationDate ? (
                <View style={styles.montageRow}>
                  <Text style={styles.montageLabel}>Montagetermin</Text>
                  <Text style={styles.montageValue}>
                    {new Date(project.installationDate).toLocaleDateString('de-AT')}
                    {project.installationTime ? `, ${project.installationTime}` : ''}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Items Table – Kunden-PDF: KEINE Preise bei Positionen, nur Gesamtbetrag am Ende */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colPos]}>Pos</Text>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>Beschreibung</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Menge</Text>
            <Text style={[styles.tableHeaderCell, styles.colUnit]}>Einheit</Text>
          </View>
          {items.map((item, index) => {
            return (
              <View key={item.id || index} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colPos]}>{item.position ?? index + 1}</Text>
                <View style={styles.colDesc}>
                  <Text style={styles.tableCellBold}>{item.description}</Text>
                  {item.modelNumber ? (
                    <Text style={styles.tableCell}>Art.-Nr.: {item.modelNumber}</Text>
                  ) : null}
                </View>
                <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
                <Text style={[styles.tableCell, styles.colUnit]}>{item.unit}</Text>
              </View>
            )
          })}
        </View>

        {/* Totals – immer anzeigen (Netto, MwSt., Gesamtbetrag) */}
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

        {/* Auftrag-Fußtext (Hinweise für Auftrag, oberhalb Unterschrift) */}
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
          <View style={styles.signatureRow}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Ort, Datum</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Unterschrift Auftraggeber</Text>
            </View>
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
      </Page>

      {/* AGB als letzte Seite (nur wenn appendAgb und company.agbText) */}
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
        </Page>
      ) : null}
    </Document>
  )
}

const OrderPDFDocumentWithProps = OrderPDFDocument as React.FC<OrderPDFProps>

export interface DownloadOrderPDFOptions {
  /** Einzelpreise in der Positionstabelle anzeigen (Standard: false) */
  showUnitPrices?: boolean
  /** AGB als letzte Seite anhängen (Standard: false) */
  appendAgb?: boolean
}

export const downloadOrderPDF = async (
  project: CustomerProject,
  company: CompanySettings | null,
  options?: DownloadOrderPDFOptions
): Promise<void> => {
  const showUnitPrices = options?.showUnitPrices ?? false
  const appendAgb = options?.appendAgb ?? false
  const blob = await pdf(
    <OrderPDFDocumentWithProps
      project={project}
      company={company}
      showUnitPrices={showUnitPrices}
      appendAgb={appendAgb}
    />
  ).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const safeOrder = (project.orderNumber || 'Auftrag').replace(/\//g, '-')
  const safeName = (project.customerName || 'Kunde').replace(/\s/g, '_')
  link.download = `Auftrag_${safeOrder}_${safeName}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Quickview: PDF in neuem Tab öffnen (ohne Download). Kunden-PDF: showUnitPrices immer false. */
export const openOrderPDFInNewTab = async (
  project: CustomerProject,
  company: CompanySettings | null,
  options?: { appendAgb?: boolean }
): Promise<void> => {
  const appendAgb = options?.appendAgb ?? false
  const blob = await pdf(
    <OrderPDFDocumentWithProps
      project={project}
      company={company}
      showUnitPrices={false}
      appendAgb={appendAgb}
    />
  ).toBlob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
