// Server-seitige PDF-Komponente für Rechnungen (ohne 'use client')
import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { CompanySettings, BankAccount, InvoiceItem } from '@/types'
import { InvoiceData } from '@/components/InvoicePDF'

// Kopiere die Styles aus InvoicePDF.tsx
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    backgroundColor: '#ffffff',
    color: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#f59e0b',
  },
  logo: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  companySubtitle: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 4,
  },
  companyContact: {
    textAlign: 'right',
    fontSize: 8,
    color: '#64748b',
  },
  recipientSection: {
    marginBottom: 30,
  },
  recipientLabel: {
    fontSize: 7,
    color: '#94a3b8',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  recipientName: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: 2,
  },
  recipientAddress: {
    fontSize: 10,
    color: '#475569',
  },
  titleSection: {
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  invoiceSubtitle: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 3,
  },
  invoiceNumber: {
    textAlign: 'right',
  },
  invoiceNumberLabel: {
    fontSize: 7,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  invoiceNumberValue: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1e293b',
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
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    padding: 10,
    borderRadius: 4,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontWeight: 700,
    color: '#ffffff',
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
  tableCell: {
    fontSize: 9,
    color: '#475569',
  },
  tableCellBold: {
    fontSize: 9,
    fontWeight: 600,
    color: '#1e293b',
  },
  colPos: { width: '10%' },
  colDesc: { width: '70%' },
  colQty: { width: '20%', textAlign: 'center' },
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
    color: '#f59e0b',
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
    fontSize: 7,
    color: '#94a3b8',
    marginBottom: 2,
  },
  footerThank: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 8,
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
              <Text style={styles.invoiceTitle}>
                {isDeposit ? 'ANZAHLUNGSRECHNUNG' : 'SCHLUSSRECHNUNG'}
              </Text>
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
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colPos]}>Pos</Text>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>Beschreibung</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Menge</Text>
          </View>

          {isDeposit ? (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.colPos]}>1</Text>
              <View style={styles.colDesc}>
                <Text style={styles.tableCellBold}>
                  {invoice.description || `Anzahlung für Auftrag ${invoice.project.orderNumber}`}
                </Text>
                <Text style={styles.tableCell}>Gemäß Vereinbarung</Text>
              </View>
              <Text style={[styles.tableCell, styles.colQty]}>1</Text>
            </View>
          ) : (
            items.map((item: InvoiceItem, index: number) => (
              <View key={item.id || index} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colPos]}>{item.position || index + 1}</Text>
                <View style={styles.colDesc}>
                  <Text style={styles.tableCellBold}>{item.description}</Text>
                  {item.modelNumber && (
                    <Text style={styles.tableCell}>Art.-Nr.: {item.modelNumber}</Text>
                  )}
                </View>
                <Text style={[styles.tableCell, styles.colQty]}>
                  {item.quantity} {item.unit}
                </Text>
              </View>
            ))
          )}
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
                    <Text style={styles.totalsFinalLabel}>Zu zahlen (Brutto)</Text>
                    <Text style={styles.totalsFinalValue}>{formatCurrency(restGross)}</Text>
                  </View>
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
                    {isDeposit ? 'Rechnungsbetrag' : 'Gesamtbetrag'} (Brutto)
                  </Text>
                  <Text style={styles.totalsFinalValue}>{formatCurrency(invoice.amount)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Bank Info */}
        <View style={styles.bankSection}>
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

        {/* Footer */}
        <View style={styles.footer}>
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
      </Page>
    </Document>
  )
}
