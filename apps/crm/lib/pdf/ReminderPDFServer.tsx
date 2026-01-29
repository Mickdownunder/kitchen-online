// Server-seitige PDF-Komponente für Mahnungen (ohne 'use client')
import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PartialPayment, CompanySettings, BankAccount, CustomerProject } from '@/types'

// Styles (ähnlich wie InvoicePDFServer, aber mit Mahnungs-Farben)
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
    borderBottomWidth: 3,
    borderBottomColor: '#dc2626', // Rot für Mahnungen
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
  reminderTitleSection: {
    marginBottom: 25,
    padding: 15,
    backgroundColor: '#fef2f2', // Roter Hintergrund
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  reminderTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#dc2626',
    letterSpacing: -0.5,
    marginBottom: 5,
  },
  reminderSubtitle: {
    fontSize: 10,
    color: '#991b1b',
    fontWeight: 600,
  },
  invoiceInfoSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  invoiceInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  invoiceInfoLabel: {
    fontSize: 8,
    color: '#64748b',
    fontWeight: 600,
  },
  invoiceInfoValue: {
    fontSize: 9,
    color: '#1e293b',
    fontWeight: 600,
  },
  urgencySection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fff7ed', // Orange/Gelb für Dringlichkeit
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  urgencyTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#92400e',
    marginBottom: 8,
  },
  urgencyText: {
    fontSize: 10,
    color: '#78350f',
    lineHeight: 1.6,
    marginBottom: 5,
  },
  overdueSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 4,
  },
  overdueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overdueLabel: {
    fontSize: 9,
    color: '#991b1b',
    fontWeight: 600,
  },
  overdueValue: {
    fontSize: 14,
    fontWeight: 700,
    color: '#dc2626',
  },
  paymentDeadlineSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f0f9ff',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#0284c7',
  },
  paymentDeadlineTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#0c4a6e',
    marginBottom: 5,
  },
  paymentDeadlineText: {
    fontSize: 10,
    color: '#075985',
    lineHeight: 1.6,
  },
  legalNoteSection: {
    marginTop: 20,
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  legalNoteText: {
    fontSize: 9,
    color: '#991b1b',
    fontWeight: 600,
    lineHeight: 1.6,
  },
  bankSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  bankColumn: {
    flex: 1,
    marginRight: 20,
  },
  bankTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bankText: {
    fontSize: 9,
    color: '#475569',
    marginBottom: 3,
  },
  bankTextBold: {
    fontSize: 9,
    fontWeight: 600,
    color: '#1e293b',
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 3,
  },
  footerThank: {
    fontSize: 9,
    color: '#475569',
    marginTop: 8,
    fontStyle: 'italic',
  },
})

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
}

const DEFAULT_BANK = {
  bankName: 'Ihre Bank',
  accountHolder: 'Designstudio BaLeah',
  iban: 'AT12 3456 7890 1234 5678',
  bic: 'ABCDEFGH',
}

export interface ReminderData {
  project: CustomerProject
  invoice:
    | PartialPayment
    | { invoiceNumber: string; amount: number; date: string; dueDate?: string }
  reminderType: 'first' | 'second' | 'final'
  overdueDays: number
  company?: Partial<CompanySettings>
  bankAccount?: Partial<BankAccount>
}

export const ReminderPDFDocumentServer: React.FC<{ reminder: ReminderData }> = ({ reminder }) => {
  const {
    project,
    invoice,
    reminderType,
    overdueDays,
    company: companyProp,
    bankAccount,
  } = reminder

  // Use company data from settings or fallback
  const company: Partial<CompanySettings> = companyProp || DEFAULT_COMPANY
  const bank: Partial<BankAccount> = bankAccount || DEFAULT_BANK

  const companyName =
    company.companyName === 'Küchenmanufaktur'
      ? 'Designstudio BaLeah'
      : company.companyName || 'Designstudio BaLeah'

  const companyFullName = companyName + (company.legalForm ? ` ${company.legalForm}` : '')
  const companyAddress =
    `${company.street || ''} ${company.houseNumber || ''} · ${company.postalCode || ''} ${company.city || ''} · ${company.country || 'Österreich'}`.trim()

  const dueDate = invoice.dueDate || invoice.date
  const overdueDaysText =
    overdueDays > 0 ? `${overdueDays} Tag${overdueDays !== 1 ? 'e' : ''}` : 'heute'

  // Unterschiedliche Titel und Texte je nach Mahnungsstufe
  let reminderTitle = ''
  let reminderSubtitle = ''
  let urgencyText = ''
  let paymentDeadlineText = ''
  let legalNote = ''

  if (reminderType === 'first') {
    reminderTitle = 'ERSTE MAHNUNG'
    reminderSubtitle = 'Freundliche Zahlungserinnerung'
    urgencyText = `Wir möchten Sie freundlich daran erinnern, dass die Rechnung ${invoice.invoiceNumber} über ${invoice.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € noch nicht bei uns eingegangen ist.`
    paymentDeadlineText =
      'Bitte überweisen Sie den Betrag innerhalb der nächsten 7 Tage auf unser Konto.'
  } else if (reminderType === 'second') {
    reminderTitle = 'ZWEITE MAHNUNG'
    reminderSubtitle = 'Dringende Zahlungsaufforderung'
    urgencyText = `Wir müssen Sie erneut auf die ausstehende Zahlung der Rechnung ${invoice.invoiceNumber} über ${invoice.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € hinweisen. Bisher haben wir trotz unserer ersten Mahnung keine Zahlung erhalten.`
    paymentDeadlineText =
      'Wir fordern Sie hiermit dringend auf, den Betrag innerhalb der nächsten 5 Tage zu begleichen.'
    legalNote =
      'Sollte die Zahlung nicht innerhalb dieser Frist eingehen, behalten wir uns rechtliche Schritte vor.'
  } else {
    // final
    reminderTitle = 'LETZTE MAHNUNG'
    reminderSubtitle = 'Letzte Aufforderung vor rechtlichen Schritten'
    urgencyText = `Wir müssen Sie letztmalig auf die ausstehende Zahlung der Rechnung ${invoice.invoiceNumber} über ${invoice.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € hinweisen. Trotz mehrfacher Mahnungen haben wir bisher keine Zahlung erhalten.`
    paymentDeadlineText =
      'Dies ist unsere letzte Aufforderung. Bitte überweisen Sie den Betrag innerhalb der nächsten 3 Tage.'
    legalNote =
      'Sollte die Zahlung nicht innerhalb dieser Frist eingehen, werden wir die Forderung an ein Inkassobüro übergeben und rechtliche Schritte einleiten. Dies führt zu zusätzlichen Kosten, die Ihnen in Rechnung gestellt werden.'
  }

  const formatCurrency = (amount: number): string => {
    return `${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
  }

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
          <Text style={styles.recipientName}>{project.customerName}</Text>
          {project.address && <Text style={styles.recipientAddress}>{project.address}</Text>}
          {project.phone && <Text style={styles.recipientAddress}>Tel: {project.phone}</Text>}
          {project.email && <Text style={styles.recipientAddress}>E-Mail: {project.email}</Text>}
        </View>

        {/* Reminder Title */}
        <View style={styles.reminderTitleSection}>
          <Text style={styles.reminderTitle}>{reminderTitle}</Text>
          <Text style={styles.reminderSubtitle}>{reminderSubtitle}</Text>
        </View>

        {/* Invoice Info */}
        <View style={styles.invoiceInfoSection}>
          <View style={styles.invoiceInfoRow}>
            <Text style={styles.invoiceInfoLabel}>Rechnungsnummer:</Text>
            <Text style={styles.invoiceInfoValue}>{invoice.invoiceNumber}</Text>
          </View>
          <View style={styles.invoiceInfoRow}>
            <Text style={styles.invoiceInfoLabel}>Rechnungsdatum:</Text>
            <Text style={styles.invoiceInfoValue}>
              {new Date(invoice.date).toLocaleDateString('de-DE')}
            </Text>
          </View>
          <View style={styles.invoiceInfoRow}>
            <Text style={styles.invoiceInfoLabel}>Fälligkeitsdatum:</Text>
            <Text style={styles.invoiceInfoValue}>
              {new Date(dueDate).toLocaleDateString('de-DE')}
            </Text>
          </View>
          <View style={styles.invoiceInfoRow}>
            <Text style={styles.invoiceInfoLabel}>Auftragsnummer:</Text>
            <Text style={styles.invoiceInfoValue}>{project.orderNumber}</Text>
          </View>
        </View>

        {/* Overdue Info */}
        {overdueDays > 0 && (
          <View style={styles.overdueSection}>
            <View style={styles.overdueRow}>
              <Text style={styles.overdueLabel}>Überfällig seit:</Text>
              <Text style={styles.overdueValue}>{overdueDaysText}</Text>
            </View>
            <View style={styles.overdueRow}>
              <Text style={styles.overdueLabel}>Offener Betrag:</Text>
              <Text style={styles.overdueValue}>{formatCurrency(invoice.amount)}</Text>
            </View>
          </View>
        )}

        {/* Urgency Text */}
        <View style={styles.urgencySection}>
          <Text style={styles.urgencyTitle}>WICHTIG</Text>
          <Text style={styles.urgencyText}>{urgencyText}</Text>
        </View>

        {/* Payment Deadline */}
        <View style={styles.paymentDeadlineSection}>
          <Text style={styles.paymentDeadlineTitle}>Zahlungsfrist</Text>
          <Text style={styles.paymentDeadlineText}>{paymentDeadlineText}</Text>
        </View>

        {/* Legal Note */}
        {legalNote && (
          <View style={styles.legalNoteSection}>
            <Text style={styles.legalNoteText}>{legalNote}</Text>
          </View>
        )}

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
            <Text style={styles.bankTitle}>Verwendungszweck</Text>
            <Text style={styles.bankText}>Bitte geben Sie bei der Überweisung folgendes an:</Text>
            <Text style={styles.bankTextBold}>{invoice.invoiceNumber}</Text>
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
          <Text style={styles.footerThank}>Wir danken für Ihre umgehende Zahlung.</Text>
        </View>
      </Page>
    </Document>
  )
}
