// Server-seitige PDF-Komponente für Lieferscheine (ohne 'use client')
import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { CustomerProject, CompanySettings } from '@/types'
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
    borderBottomColor: D.accent.delivery,
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
    backgroundColor: D.accent.delivery,
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
  deliveryNoteSubtitle: {
    fontSize: D.fontSize.small,
    color: D.colors.secondary,
    marginTop: 3,
  },
  deliveryNoteNumber: {
    textAlign: 'right',
  },
  deliveryNoteNumberLabel: {
    fontSize: D.fontSize.micro,
    color: D.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  deliveryNoteNumberValue: {
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
    color: D.colors.text,
    fontWeight: 600,
  },
  itemsTable: {
    marginBottom: 30,
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
  tableHeaderText: {
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
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    fontSize: D.fontSize.small,
    color: D.colors.secondary,
  },
  colPosition: { width: '8%' },
  colDescription: { width: '56%' },
  colQuantity: { width: '18%', textAlign: 'center' },
  colUnit: { width: '18%', textAlign: 'center' },
  signatureSection: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: D.colors.border,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  signatureColumn: {
    width: '45%',
  },
  signatureBox: {
    width: '100%',
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
  receiptSection: {
    marginBottom: 142,
  },
  receiptLabel: {
    fontSize: D.fontSize.micro,
    color: D.colors.muted,
    marginBottom: 4,
  },
  receiptLine: {
    borderBottomWidth: 1,
    borderBottomColor: D.colors.borderDark,
    height: 12,
  },
  receiptHint: {
    fontSize: D.fontSize.micro,
    color: D.colors.muted,
    marginTop: 4,
    marginBottom: 2,
  },
  receiptPlaceholder: {
    opacity: 0,
  },
  signatureImage: {
    width: '100%',
    maxHeight: 60,
    marginBottom: 8,
  },
  footer: {
    marginTop: 30,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: D.colors.border,
    fontSize: D.fontSize.micro,
    color: D.colors.muted,
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
              <View style={styles.titleBadge}>
                <Text style={styles.titleBadgeText}>LIEFERSCHEIN</Text>
              </View>
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
            <View style={styles.tableBox}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.colPosition]}>Pos.</Text>
                <Text style={[styles.tableHeaderText, styles.colDescription]}>Beschreibung</Text>
                <Text style={[styles.tableHeaderText, styles.colQuantity]}>Menge</Text>
                <Text style={[styles.tableHeaderText, styles.colUnit]}>Einheit</Text>
              </View>
              {deliveryNote.items.map((item, idx) => (
                <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, styles.colPosition]}>{item.position}</Text>
                  <Text style={[styles.tableCell, styles.colDescription]}>{item.description}</Text>
                  <Text style={[styles.tableCell, styles.colQuantity]}>{item.quantity}</Text>
                  <Text style={[styles.tableCell, styles.colUnit]}>{item.unit}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Signature Section */}
        <View style={styles.signatureSection} wrap={false}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureColumn}>
              <View style={styles.receiptSection}>
                <Text style={styles.receiptLabel}>Ware erhalten am</Text>
                <View style={styles.receiptLine} />
                <Text style={styles.receiptHint}>Ort, Datum</Text>
              </View>
              <View style={styles.signatureBox}>
                {deliveryNote.customerSignature ? (
                  <>
                    <Image
                      src={deliveryNote.customerSignature}
                      style={styles.signatureImage}
                    />
                    <Text style={styles.signatureLabel}>
                      {deliveryNote.signedBy || project.customerName}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.signatureLabel}>Unterschrift Kunde</Text>
                )}
              </View>
            </View>
            <View style={styles.signatureColumn}>
              <View style={[styles.receiptSection, styles.receiptPlaceholder]}>
                <Text style={styles.receiptLabel}>Ware erhalten am</Text>
                <View style={styles.receiptLine} />
                <Text style={styles.receiptHint}>Ort, Datum</Text>
              </View>
              <View style={styles.signatureBox}>
                <Text style={styles.signatureLabel}>Unterschrift Lieferant</Text>
              </View>
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
