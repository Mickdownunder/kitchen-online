// Server-seitige PDF-Komponente für Lieferscheine (ohne 'use client')
import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { CustomerProject, CompanySettings } from '@/types'

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
    borderBottomColor: '#3b82f6',
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
  deliveryNoteTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  deliveryNoteSubtitle: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 3,
  },
  deliveryNoteNumber: {
    textAlign: 'right',
  },
  deliveryNoteNumberLabel: {
    fontSize: 7,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  deliveryNoteNumberValue: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1e293b',
    marginTop: 2,
  },
  metaSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 7,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 10,
    color: '#1e293b',
    fontWeight: 600,
  },
  itemsTable: {
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableCell: {
    fontSize: 9,
    color: '#1e293b',
  },
  colPosition: { width: '8%' },
  colDescription: { width: '52%' },
  colQuantity: { width: '15%', textAlign: 'right' },
  colUnit: { width: '10%', textAlign: 'center' },
  signatureSection: {
    marginTop: 50,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  signatureBox: {
    width: '45%',
    paddingTop: 60,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  signatureLabel: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  signatureImage: {
    width: '100%',
    maxHeight: 60,
    marginBottom: 8,
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    fontSize: 7,
    color: '#94a3b8',
    textAlign: 'center',
  },
})

interface CustomerDeliveryNotePDFProps {
  deliveryNote: {
    deliveryNoteNumber: string
    deliveryDate: string
    deliveryAddress?: string
    customerSignature?: string
    signedBy?: string
    customerSignatureDate?: string
    items?: Array<{
      position: number
      description: string
      quantity: number
      unit: string
    }>
  }
  project: CustomerProject
  company?: CompanySettings | null
}

export const CustomerDeliveryNotePDFDocumentServer: React.FC<CustomerDeliveryNotePDFProps> = ({
  deliveryNote,
  project,
  company,
}) => {
  // Stelle sicher, dass "Küchenmanufaktur" zu "Designstudio BaLeah" geändert wird
  const companyName = company?.companyName === 'Küchenmanufaktur' 
    ? 'Designstudio BaLeah' 
    : company?.companyName || 'Designstudio BaLeah'

  const companyFullName = companyName + (company?.legalForm ? ` ${company.legalForm}` : '')
  const companyAddress =
    `${company?.street || ''} ${company?.houseNumber || ''} · ${company?.postalCode || ''} ${company?.city || ''} · ${company?.country || 'Österreich'}`.trim()

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
            {company?.phone && <Text>Tel: {company.phone}</Text>}
            {company?.email && <Text>{company.email}</Text>}
            {company?.website && <Text>{company.website}</Text>}
          </View>
        </View>

        {/* Recipient */}
        <View style={styles.recipientSection}>
          <Text style={styles.recipientLabel}>Lieferadresse</Text>
          <Text style={styles.recipientName}>{project.customerName}</Text>
          {deliveryNote.deliveryAddress ? (
            <Text style={styles.recipientAddress}>{deliveryNote.deliveryAddress}</Text>
          ) : project.address ? (
            <Text style={styles.recipientAddress}>{project.address}</Text>
          ) : null}
          {project.phone && <Text style={styles.recipientAddress}>Tel: {project.phone}</Text>}
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.deliveryNoteTitle}>LIEFERSCHEIN</Text>
              <Text style={styles.deliveryNoteSubtitle}>
                Lieferdatum: {new Date(deliveryNote.deliveryDate).toLocaleDateString('de-AT')}
              </Text>
            </View>
            <View style={styles.deliveryNoteNumber}>
              <Text style={styles.deliveryNoteNumberLabel}>Lieferschein-Nr.</Text>
              <Text style={styles.deliveryNoteNumberValue}>{deliveryNote.deliveryNoteNumber}</Text>
            </View>
          </View>
        </View>

        {/* Meta Info */}
        <View style={styles.metaSection}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Auftragsnummer</Text>
            <Text style={styles.metaValue}>#{project.orderNumber}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Lieferdatum</Text>
            <Text style={styles.metaValue}>
              {new Date(deliveryNote.deliveryDate).toLocaleDateString('de-AT')}
            </Text>
          </View>
        </View>

        {/* Items Table */}
        {deliveryNote.items && deliveryNote.items.length > 0 && (
          <View style={styles.itemsTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colPosition]}>Pos.</Text>
              <Text style={[styles.tableHeaderText, styles.colDescription]}>Beschreibung</Text>
              <Text style={[styles.tableHeaderText, styles.colQuantity]}>Menge</Text>
              <Text style={[styles.tableHeaderText, styles.colUnit]}>Einheit</Text>
            </View>
            {deliveryNote.items.map((item, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colPosition]}>{item.position}</Text>
                <Text style={[styles.tableCell, styles.colDescription]}>{item.description}</Text>
                <Text style={[styles.tableCell, styles.colQuantity]}>{item.quantity}</Text>
                <Text style={[styles.tableCell, styles.colUnit]}>{item.unit}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBox}>
              {deliveryNote.customerSignature ? (
                <>
                  <Image src={deliveryNote.customerSignature} style={styles.signatureImage} />
                  <Text style={styles.signatureLabel}>
                    {deliveryNote.signedBy || project.customerName}
                  </Text>
                  {deliveryNote.customerSignatureDate && (
                    <Text style={styles.signatureLabel}>
                      {new Date(deliveryNote.customerSignatureDate).toLocaleDateString('de-AT')}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.signatureLabel}>Unterschrift Kunde</Text>
              )}
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Unterschrift Lieferant</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Bitte prüfen Sie die Lieferung auf Vollständigkeit und Unversehrtheit.</Text>
          <Text style={{ marginTop: 4 }}>Bei Beanstandungen bitte sofort melden.</Text>
        </View>
      </Page>
    </Document>
  )
}
