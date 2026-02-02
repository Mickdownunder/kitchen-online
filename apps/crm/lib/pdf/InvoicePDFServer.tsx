// Server-seitige PDF-Komponente für Rechnungen (ohne 'use client')
import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { CompanySettings, BankAccount, InvoiceItem } from '@/types'
import { InvoiceData } from '@/components/InvoicePDF'
import { PDF_DESIGN } from '@/lib/pdf/pdfDesignTokens'

const D = PDF_DESIGN
// Kopiere die Styles aus InvoicePDF.tsx
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: D.fontSize.body,
    padding: D.spacing.pagePadding,
    paddingBottom: 160, // Platz für fixen Bank-/Zahlungs-Footer
    backgroundColor: '#ffffff',
    color: D.colors.text,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: D.spacing.sectionGap,
    paddingBottom: D.spacing.headerPaddingBottom,
    borderBottomWidth: 2,
    borderBottomColor: D.accent.invoice,
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
  titleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: D.accent.invoice,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  titleBadgeText: {
    fontSize: D.fontSize.title,
    fontWeight: 700,
    color: D.colors.headerText,
    letterSpacing: -0.5,
  },
  invoiceSubtitle: {
    fontSize: D.fontSize.small,
    color: D.colors.secondary,
    marginTop: 3,
  },
  invoiceNumber: {
    textAlign: 'right',
  },
  invoiceNumberLabel: {
    fontSize: D.fontSize.micro,
    color: D.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  invoiceNumberValue: {
    fontSize: 12,
    fontWeight: 700,
    color: D.colors.text,
    marginTop: 2,
  },
  metaSection: {
    flexDirection: 'row',
    marginBottom: 25,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 4,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: D.fontSize.micro,
    color: D.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  metaValue: {
    fontSize: D.fontSize.body,
    fontWeight: 600,
    color: D.colors.text,
  },
  table: {
    marginBottom: 20,
  },
  tableBox: {
    borderWidth: 1.5,
    borderColor: D.colors.borderDark,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: D.colors.headerBg,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: D.colors.borderDark,
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
  tableCell: {
    fontSize: D.fontSize.small,
    color: D.colors.secondary,
  },
  tableCellBold: {
    fontSize: D.fontSize.small,
    fontWeight: 600,
    color: D.colors.text,
  },
  colQty: { width: '18%', textAlign: 'left' },
  colModel: { width: '18%' },
  colDesc: { width: '46%' },
  colManufacturer: { width: '18%' },
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 25,
  },
  totalsBox: {
    width: 250,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  totalsLabel: {
    fontSize: D.fontSize.small,
    color: D.colors.secondary,
  },
  totalsValue: {
    fontSize: D.fontSize.small,
    fontWeight: 600,
    color: D.colors.text,
  },
  totalsFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#1e293b',
  },
  totalsFinalLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: D.colors.text,
  },
  totalsFinalValue: {
    fontSize: 14,
    fontWeight: 700,
    color: D.accent.invoice,
  },
  paymentsSection: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  paymentsSectionTitle: {
    fontSize: D.fontSize.micro,
    fontWeight: 700,
    color: D.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  paymentText: {
    fontSize: D.fontSize.caption,
    color: D.colors.secondary,
  },
  paymentDate: {
    fontSize: D.fontSize.micro,
    color: '#10b981',
  },
  paymentAmount: {
    fontSize: D.fontSize.caption,
    fontWeight: 600,
    color: D.colors.secondary,
  },
  bankSection: {
    position: 'absolute' as const,
    bottom: 95,
    left: D.spacing.pagePadding,
    right: D.spacing.pagePadding,
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 4,
  },
  bankColumn: {
    flex: 1,
  },
  bankTitle: {
    fontSize: D.fontSize.micro,
    fontWeight: 700,
    color: D.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  bankText: {
    fontSize: D.fontSize.small,
    color: D.colors.secondary,
    marginBottom: 2,
  },
  bankTextBold: {
    fontSize: D.fontSize.small,
    fontWeight: 600,
    color: D.colors.text,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerText: {
    fontSize: D.fontSize.micro,
    color: D.colors.muted,
    marginBottom: 2,
  },
  footerThank: {
    fontSize: D.fontSize.caption,
    color: D.colors.secondary,
    marginTop: 8,
  },
  pageInfo: {
    position: 'absolute' as const,
    bottom: 12,
    right: D.spacing.pagePadding,
    fontSize: D.fontSize.micro,
    color: D.colors.muted,
  },
  paidNote: {
    fontSize: D.fontSize.micro,
    color: D.colors.secondary,
    marginTop: 4,
    textAlign: 'right',
  },
})

const formatCurrency = (amount: number): string => {
  return `${amount.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

const DEFAULT_COMPANY: Partial<CompanySettings> = {
  companyName: 'Designstudio BaLeah',
  legalForm: 'GmbH',
  street: 'Musterstraße',
  houseNumber: '123',
  postalCode: '1010',
  city: 'Wien',
  country: 'Österreich',
  phone: '+43 1 234 5678',
  email: 'office@ihrunternehmen.at',
  website: 'www.ihrunternehmen.at',
  uid: 'ATU12345678',
  companyRegisterNumber: 'FN 123456a',
  court: 'Handelsgericht Wien',
  defaultPaymentTerms: 14,
  invoiceFooterText: 'Vielen Dank für Ihren Auftrag!',
}

const DEFAULT_BANK = {
  bankName: 'Ihre Bank',
  accountHolder: 'Designstudio BaLeah',
  iban: 'AT12 3456 7890 1234 5678',
  bic: 'ABCDEFGH',
}

export const InvoicePDFDocumentServer: React.FC<{ invoice: InvoiceData }> = ({ invoice }) => {
  const isDeposit = invoice.type === 'deposit'
  const items = isDeposit ? [] : invoice.project.items || []
  const paidDateValue =
    invoice.paidDate || (invoice as { paid_date?: string | null }).paid_date || undefined
  const isPaid =
    invoice.isPaid === true ||
    invoice.isPaid === 'true' ||
    invoice.isPaid === 1 ||
    (invoice as { is_paid?: boolean | string | number }).is_paid === true ||
    (invoice as { is_paid?: boolean | string | number }).is_paid === 'true' ||
    (invoice as { is_paid?: boolean | string | number }).is_paid === 1 ||
    Boolean(paidDateValue)

  // Anzahlungen summieren (Brutto) - from priorInvoices (new system)
  const totalPartialPayments = invoice.priorInvoices?.reduce((sum, inv) => sum + inv.amount, 0) || 0

  // MwSt.-Aufschlüsselung für Buchhaltung/Steuerberatung
  // Bei Anzahlung: einfache Berechnung auf Rechnungsbetrag
  // Bei Schlussrechnung: Gesamtleistung minus bereits versteuerte Anzahlungen

  // Gesamtleistung (aus Projekt)
  const projectGrossTotal =
    invoice.project.items?.reduce(
      (sum, item) => sum + (item.grossTotal ?? (item.netTotal ?? 0) + (item.taxAmount ?? 0)),
      0
    ) || invoice.amount + totalPartialPayments
  const projectNetTotal = projectGrossTotal / 1.2
  const projectTaxTotal = projectGrossTotal - projectNetTotal

  // Anzahlungen (bereits versteuert)
  const partialPaymentsNet = totalPartialPayments / 1.2
  const partialPaymentsTax = totalPartialPayments - partialPaymentsNet

  // Restbetrag (noch zu versteuern)
  const restGross = invoice.amount // = projectGrossTotal - totalPartialPayments
  const restNet = projectNetTotal - partialPaymentsNet
  const restTax = projectTaxTotal - partialPaymentsTax

  // Für Anzahlungsrechnung: einfache Berechnung
  const netAmount = isDeposit ? invoice.amount / 1.2 : restNet
  const taxAmount = isDeposit ? invoice.amount - netAmount : restTax

  // Use company data from settings or fallback
  const company: Partial<CompanySettings> = invoice.company || DEFAULT_COMPANY
  const bank: Partial<BankAccount> = invoice.bankAccount || DEFAULT_BANK

  // Stelle sicher, dass "Küchenmanufaktur" zu "Designstudio BaLeah" geändert wird
  const companyName =
    company.companyName === 'Küchenmanufaktur'
      ? 'Designstudio BaLeah'
      : company.companyName || 'Designstudio BaLeah'

  const companyFullName = companyName + (company.legalForm ? ` ${company.legalForm}` : '')
  const companyAddress =
    `${company.street || ''} ${company.houseNumber || ''} · ${company.postalCode || ''} ${company.city || ''} · ${company.country || 'Österreich'}`.trim()

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>{companyFullName}</Text>
            <Text style={styles.companySubtitle}>{companyAddress}</Text>
          </View>
          <View style={styles.companyContact}>
            {company.phone && <Text>Tel: {company.phone}</Text>}
            {company.email && <Text>{company.email}</Text>}
            {company.website && <Text>{company.website}</Text>}
          </View>
        </View>

        {/* Recipient */}
        <View style={styles.recipientSection}>
          <Text style={styles.recipientLabel}>Rechnungsempfänger</Text>
          <Text style={styles.recipientName}>{invoice.project.customerName}</Text>
          {invoice.project.address && (
            <Text style={styles.recipientAddress}>{invoice.project.address}</Text>
          )}
          {invoice.project.phone && (
            <Text style={styles.recipientAddress}>Tel: {invoice.project.phone}</Text>
          )}
          {invoice.project.email && (
            <Text style={styles.recipientAddress}>E-Mail: {invoice.project.email}</Text>
          )}
        </View>

        {/* Invoice Title */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <View>
              <View style={styles.titleBadge}>
                <Text style={styles.titleBadgeText}>
                  {isDeposit ? 'ANZAHLUNGSRECHNUNG' : 'SCHLUSSRECHNUNG'}
                </Text>
              </View>
              {invoice.description && (
                <Text style={styles.invoiceSubtitle}>{invoice.description}</Text>
              )}
            </View>
            <View style={styles.invoiceNumber}>
              <Text style={styles.invoiceNumberLabel}>Rechnungsnummer</Text>
              <Text style={styles.invoiceNumberValue}>{invoice.invoiceNumber}</Text>
            </View>
          </View>
        </View>

        {/* Meta Info */}
        <View style={styles.metaSection}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Rechnungsdatum</Text>
            <Text style={styles.metaValue}>
              {new Date(invoice.date).toLocaleDateString('de-AT')}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Auftragsnummer</Text>
            <Text style={styles.metaValue}>{invoice.project.orderNumber}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Kundennummer</Text>
            <Text style={styles.metaValue}>
              {invoice.project.customerId?.slice(0, 8) ||
                `K-${invoice.project.id?.slice(0, 6) || '000000'}`}
            </Text>
          </View>
        </View>

        {/* Items Table – Kunden-PDF: KEINE Preise bei Positionen, nur Gesamtbetrag am Ende */}
        <View style={styles.table}>
          <View style={styles.tableBox}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>Menge</Text>
              <Text style={[styles.tableHeaderCell, styles.colModel]}>Modell</Text>
              <Text style={[styles.tableHeaderCell, styles.colDesc]}>Bezeichnung</Text>
              <Text style={[styles.tableHeaderCell, styles.colManufacturer]}>Hersteller</Text>
            </View>

            {isDeposit ? (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colQty]}>1</Text>
                <Text style={[styles.tableCell, styles.colModel]}>-</Text>
                <View style={styles.colDesc}>
                  <Text style={styles.tableCellBold}>
                    {invoice.description || `Anzahlung für Auftrag ${invoice.project.orderNumber}`}
                  </Text>
                  <Text style={styles.tableCell}>Gemäß Vereinbarung</Text>
                </View>
                <Text style={[styles.tableCell, styles.colManufacturer]}>-</Text>
              </View>
            ) : (
              items.map((item: InvoiceItem, index: number) => (
                <View key={item.id || index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.colQty]}>
                    {item.quantity} {item.unit}
                  </Text>
                  <Text style={[styles.tableCell, styles.colModel]}>
                    {item.modelNumber || '-'}
                  </Text>
                  <View style={styles.colDesc}>
                    <Text style={styles.tableCellBold}>{item.description}</Text>
                  </View>
                  <Text style={[styles.tableCell, styles.colManufacturer]}>
                    {item.manufacturer || '-'}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            {!isDeposit && totalPartialPayments > 0 ? (
              <>
                {/* GESAMTLEISTUNG - für Steuerberatung */}
                <View style={styles.paymentsSection}>
                  <Text style={styles.paymentsSectionTitle}>Gesamtleistung</Text>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Netto</Text>
                    <Text style={styles.totalsValue}>{formatCurrency(projectNetTotal)}</Text>
                  </View>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>MwSt. (20%)</Text>
                    <Text style={styles.totalsValue}>{formatCurrency(projectTaxTotal)}</Text>
                  </View>
                  <View style={styles.totalsRow}>
                    <Text style={[styles.totalsLabel, { fontWeight: 600 }]}>Brutto</Text>
                    <Text style={[styles.totalsValue, { fontWeight: 600 }]}>
                      {formatCurrency(projectGrossTotal)}
                    </Text>
                  </View>
                </View>

                {/* BEREITS ERHALTENE ANZAHLUNGEN - mit MwSt.-Ausweis (from priorInvoices) */}
                <View style={styles.paymentsSection}>
                  <Text style={styles.paymentsSectionTitle}>
                    Abzüglich bereits erhaltene Anzahlungen
                  </Text>
                  {invoice.priorInvoices?.map((priorInv, idx) => {
                    const paymentNet = priorInv.amount / 1.2
                    const paymentTax = priorInv.amount - paymentNet
                    return (
                      <View key={priorInv.id || idx} style={{ marginBottom: 6 }}>
                        <View style={styles.paymentRow}>
                          <View>
                            <Text style={styles.paymentText}>
                              {priorInv.description || `Anzahlung ${idx + 1}`}
                            </Text>
                            <Text style={styles.paymentDate}>
                              RE-Nr.: {priorInv.invoiceNumber} vom{' '}
                              {new Date(priorInv.date).toLocaleDateString('de-AT')}
                            </Text>
                          </View>
                          <Text style={styles.paymentAmount}>
                            −{formatCurrency(priorInv.amount)}
                          </Text>
                        </View>
                        <View style={{ marginLeft: 10, marginTop: 2 }}>
                          <Text style={[styles.paymentDate, { color: '#64748b' }]}>
                            (darin enth. MwSt. 20%: {formatCurrency(paymentTax)})
                          </Text>
                        </View>
                      </View>
                    )
                  })}
                  <View
                    style={[
                      styles.paymentRow,
                      { marginTop: 5, paddingTop: 5, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
                    ]}
                  >
                    <Text style={[styles.paymentText, { fontWeight: 600 }]}>Summe Anzahlungen</Text>
                    <Text style={styles.paymentAmount}>
                      −{formatCurrency(totalPartialPayments)}
                    </Text>
                  </View>
                  <View style={{ marginLeft: 10 }}>
                    <Text style={[styles.paymentDate, { color: '#64748b' }]}>
                      (darin enth. MwSt. 20%: {formatCurrency(partialPaymentsTax)})
                    </Text>
                  </View>
                </View>

                {/* VERBLEIBENDER RESTBETRAG - mit MwSt.-Ausweis */}
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.paymentsSectionTitle, { marginBottom: 8 }]}>
                    Verbleibender Restbetrag
                  </Text>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Netto</Text>
                    <Text style={styles.totalsValue}>{formatCurrency(restNet)}</Text>
                  </View>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>MwSt. (20%)</Text>
                    <Text style={styles.totalsValue}>{formatCurrency(restTax)}</Text>
                  </View>
                  <View style={styles.totalsFinal}>
                    <Text style={styles.totalsFinalLabel}>
                      {isPaid ? 'Bereits bezahlt (Brutto)' : 'Zu zahlen (Brutto)'}
                    </Text>
                    <Text style={styles.totalsFinalValue}>{formatCurrency(restGross)}</Text>
                  </View>
                  {isPaid && paidDateValue && (
                    <Text style={styles.paidNote}>
                      Bezahlt am: {new Date(paidDateValue).toLocaleDateString('de-AT')}
                    </Text>
                  )}
                </View>
              </>
            ) : (
              <>
                {/* Anzahlungsrechnung oder Schlussrechnung ohne Anzahlungen */}
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Netto</Text>
                  <Text style={styles.totalsValue}>{formatCurrency(netAmount)}</Text>
                </View>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>MwSt. (20%)</Text>
                  <Text style={styles.totalsValue}>{formatCurrency(taxAmount)}</Text>
                </View>
                <View style={styles.totalsFinal}>
                  <Text style={styles.totalsFinalLabel}>
                    {isPaid
                      ? 'Bereits bezahlt (Brutto)'
                      : `${isDeposit ? 'Rechnungsbetrag' : 'Gesamtbetrag'} (Brutto)`}
                  </Text>
                  <Text style={styles.totalsFinalValue}>{formatCurrency(invoice.amount)}</Text>
                </View>
                {isPaid && paidDateValue && (
                  <Text style={styles.paidNote}>
                    Bezahlt am: {new Date(paidDateValue).toLocaleDateString('de-AT')}
                  </Text>
                )}
              </>
            )}
          </View>
        </View>

        {/* Bank Info + Zahlungsbedingungen – fix am Seitenende */}
        <View style={styles.bankSection} fixed>
          <View style={styles.bankColumn}>
            <Text style={styles.bankTitle}>Bankverbindung</Text>
            <Text style={styles.bankText}>{bank.accountHolder || companyFullName}</Text>
            <Text style={styles.bankTextBold}>IBAN: {bank.iban}</Text>
            {bank.bic && <Text style={styles.bankText}>BIC: {bank.bic}</Text>}
            {bank.bankName && <Text style={styles.bankText}>{bank.bankName}</Text>}
          </View>
          <View style={styles.bankColumn}>
            <Text style={styles.bankTitle}>Zahlungsbedingungen</Text>
            <Text style={styles.bankText}>
              Zahlbar innerhalb von {company.defaultPaymentTerms || 14} Tagen
            </Text>
            <Text style={styles.bankText}>ohne Abzug.</Text>
            <Text style={[styles.bankText, { marginTop: 4 }]}>
              Verwendungszweck: <Text style={styles.bankTextBold}>{invoice.invoiceNumber}</Text>
            </Text>
          </View>
        </View>

        {/* Footer – fix am Seitenende */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {companyFullName} · {company.street} {company.houseNumber} · {company.postalCode}{' '}
            {company.city} · {company.country || 'Österreich'}
          </Text>
          <Text style={styles.footerText}>
            {company.uid && `UID: ${company.uid}`}
            {company.companyRegisterNumber && ` · ${company.companyRegisterNumber}`}
            {company.court && ` · ${company.court}`}
          </Text>
          <Text style={styles.footerThank}>
            {company.invoiceFooterText || 'Vielen Dank für Ihren Auftrag!'}
          </Text>
        </View>
        <Text
          style={styles.pageInfo}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Rechnungsnr. ${invoice.invoiceNumber} · Seite ${pageNumber} von ${totalPages}`
          }
        />
      </Page>
    </Document>
  )
}
