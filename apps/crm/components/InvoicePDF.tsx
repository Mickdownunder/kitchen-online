'use client'

import React from 'react'
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import { CompanySettings, BankAccount, InvoiceItem, Invoice } from '@/types'
import { PDF_DESIGN } from '@/lib/pdf/pdfDesignTokens'

const D = PDF_DESIGN
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: D.fontSize.body,
    padding: D.spacing.pagePadding,
    paddingBottom: 50, // Platz für Seiteninfo
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
    fontSize: 7,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 10,
    fontWeight: 600,
    color: '#1e293b',
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
    fontSize: 9,
    color: '#475569',
  },
  tableCellBold: {
    fontSize: 9,
    fontWeight: 600,
    color: '#1e293b',
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
    fontSize: 9,
    color: '#64748b',
  },
  totalsValue: {
    fontSize: 9,
    fontWeight: 600,
    color: '#1e293b',
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
    color: '#1e293b',
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
    fontSize: 7,
    fontWeight: 700,
    color: '#64748b',
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
    fontSize: 8,
    color: '#475569',
  },
  paymentDate: {
    fontSize: 7,
    color: '#10b981',
  },
  paymentAmount: {
    fontSize: 8,
    fontWeight: 600,
    color: '#475569',
  },
  bankSection: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 4,
    marginTop: 30,
    marginBottom: 20,
  },
  bankColumn: {
    flex: 1,
  },
  bankTitle: {
    fontSize: 7,
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  bankText: {
    fontSize: 9,
    color: '#475569',
    marginBottom: 2,
  },
  bankTextBold: {
    fontSize: 9,
    fontWeight: 600,
    color: '#1e293b',
  },
  footer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
    marginBottom: 2,
  },
  footerThank: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 8,
  },
  paidNote: {
    fontSize: D.fontSize.micro,
    color: D.colors.secondary,
    marginTop: 4,
    textAlign: 'right',
  },
  pageInfo: {
    position: 'absolute' as const,
    bottom: 12,
    right: D.spacing.pagePadding,
    fontSize: D.fontSize.micro,
    color: D.colors.muted,
  },
})

const formatCurrency = (amount: number): string => {
  return `${amount.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

// Prior invoice data for displaying on final invoices
interface PriorInvoiceInfo {
  id: string
  invoiceNumber: string
  amount: number
  date: string
  description?: string
}

export interface InvoiceData {
  type: 'deposit' | 'final' | 'credit'
  invoiceNumber: string
  amount: number
  date: string
  description?: string
  isPaid?: boolean | string | number
  paidDate?: string
  // Für Stornorechnungen: Referenz zur Originalrechnung
  originalInvoiceNumber?: string
  project: {
    customerName: string
    address?: string
    phone?: string
    email?: string
    orderNumber: string
    customerId?: string
    id?: string
    items?: InvoiceItem[]
  }
  // Prior partial invoices for final invoice display (from invoices table)
  priorInvoices?: PriorInvoiceInfo[]
  // Company data from settings
  company?: CompanySettings | null
  bankAccount?: BankAccount | null
}

// Fallback company data
const DEFAULT_COMPANY: Partial<CompanySettings> = {
  companyName: 'Ihr Unternehmen',
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
  accountHolder: 'Ihr Unternehmen',
  iban: 'AT12 3456 7890 1234 5678',
  bic: 'ABCDEFGH',
}

const InvoicePDFDocument: React.FC<{ invoice: InvoiceData }> = ({ invoice }) => {
  const isDeposit = invoice.type === 'deposit'
  const isCredit = invoice.type === 'credit'
  const items = (isDeposit || isCredit) ? [] : invoice.project.items || []
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

  // Debug logging
  console.log('[InvoicePDF] isPaid check:', {
    'invoice.isPaid': invoice.isPaid,
    'invoice.is_paid': (invoice as { is_paid?: boolean | string | number }).is_paid,
    paidDateValue,
    isPaidResult: isPaid,
    invoiceNumber: invoice.invoiceNumber,
  })

  // Anzahlungen summieren (Brutto) - from priorInvoices (new system)
  const totalPartialPayments = invoice.priorInvoices?.reduce((sum, inv) => sum + inv.amount, 0) || 0

  // MwSt.-Aufschlüsselung für Buchhaltung/Steuerberatung
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
  const restGross = invoice.amount
  const restNet = projectNetTotal - partialPaymentsNet
  const restTax = projectTaxTotal - partialPaymentsTax

  // Für Stornorechnung: Beträge sind bereits negativ, direkte Berechnung
  // Für Anzahlungsrechnung: einfache Berechnung
  // Für Schlussrechnung: Restbetrag
  const netAmount = isCredit 
    ? invoice.amount / 1.2 
    : isDeposit 
      ? invoice.amount / 1.2 
      : restNet
  const taxAmount = isCredit 
    ? invoice.amount - netAmount 
    : isDeposit 
      ? invoice.amount - netAmount 
      : restTax

  // Use company data from settings or fallback
  const company: Partial<CompanySettings> = invoice.company || DEFAULT_COMPANY
  const bank: Partial<BankAccount> = invoice.bankAccount || DEFAULT_BANK

  const companyFullName =
    (company.companyName || 'Ihr Unternehmen') + (company.legalForm ? ` ${company.legalForm}` : '')
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
              <View style={[styles.titleBadge, isCredit && { backgroundColor: '#dc2626' }]}>
                <Text style={styles.titleBadgeText}>
                  {isCredit ? 'STORNORECHNUNG' : isDeposit ? 'ANZAHLUNGSRECHNUNG' : 'SCHLUSSRECHNUNG'}
                </Text>
              </View>
              {isCredit && invoice.originalInvoiceNumber && (
                <Text style={[styles.invoiceSubtitle, { color: '#dc2626', fontWeight: 600 }]}>
                  Korrektur zu Rechnung {invoice.originalInvoiceNumber}
                </Text>
              )}
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

            {isCredit ? (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colQty]}>1</Text>
                <Text style={[styles.tableCell, styles.colModel]}>-</Text>
                <View style={styles.colDesc}>
                  <Text style={[styles.tableCellBold, { color: '#dc2626' }]}>
                    {invoice.description || `Stornierung der Rechnung ${invoice.originalInvoiceNumber || ''}`}
                  </Text>
                  <Text style={styles.tableCell}>
                    Korrekturrechnung gemäß § 11 UStG
                  </Text>
                </View>
                <Text style={[styles.tableCell, styles.colManufacturer]}>-</Text>
              </View>
            ) : isDeposit ? (
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
                    {(item.description || '').split('\n').map((line, i) => (
                      <Text key={i} style={styles.tableCellBold}>{line}</Text>
                    ))}
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

                {/* BEREITS ERHALTENE ANZAHLUNGEN - mit MwSt.-Ausweis (from invoices table) */}
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
            ) : isCredit ? (
              <>
                {/* Stornorechnung - negative Beträge */}
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Netto</Text>
                  <Text style={[styles.totalsValue, { color: '#dc2626' }]}>{formatCurrency(netAmount)}</Text>
                </View>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>MwSt. (20%)</Text>
                  <Text style={[styles.totalsValue, { color: '#dc2626' }]}>{formatCurrency(taxAmount)}</Text>
                </View>
                <View style={[styles.totalsFinal, { backgroundColor: '#fef2f2' }]}>
                  <Text style={styles.totalsFinalLabel}>Stornobetrag (Brutto)</Text>
                  <Text style={[styles.totalsFinalValue, { color: '#dc2626' }]}>{formatCurrency(invoice.amount)}</Text>
                </View>
                {invoice.originalInvoiceNumber && (
                  <Text style={[styles.paidNote, { color: '#64748b', marginTop: 8 }]}>
                    Dieser Betrag wird mit Rechnung {invoice.originalInvoiceNumber} verrechnet.
                  </Text>
                )}
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

        {/* Bank Info + Zahlungsbedingungen – nicht bei Stornorechnungen */}
        {!isCredit && (
          <View style={styles.bankSection} wrap={false}>
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
        )}

        {/* Footer – am Ende nach Bank/Zahlungsbedingungen */}
        <View style={styles.footer} wrap={false}>
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
            {isCredit 
              ? 'Diese Stornorechnung wurde maschinell erstellt.' 
              : (company.invoiceFooterText || 'Vielen Dank für Ihren Auftrag!')}
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

export const downloadInvoicePDF = async (invoice: InvoiceData): Promise<void> => {
  const blob = await pdf(<InvoicePDFDocument invoice={invoice} />).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Rechnung_${invoice.invoiceNumber.replace(/\//g, '-')}_${invoice.project.customerName.replace(/\s/g, '_')}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Quickview: Rechnungs-PDF in neuem Tab öffnen (ohne Download). */
export const openInvoicePDFInNewTab = async (invoice: InvoiceData): Promise<void> => {
  const blob = await pdf(<InvoicePDFDocument invoice={invoice} />).toBlob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

// Helper to convert Invoice from DB to PriorInvoiceInfo
export function invoiceToPriorInfo(inv: Invoice): {
  id: string
  invoiceNumber: string
  amount: number
  date: string
  description?: string
} {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    amount: inv.amount,
    date: inv.invoiceDate,
    description: inv.description,
  }
}

export default InvoicePDFDocument
