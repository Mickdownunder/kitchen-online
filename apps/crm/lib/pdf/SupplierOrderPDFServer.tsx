import React from 'react'
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { SupplierOrderTemplateInput } from '@/lib/orders/supplierOrderTemplate'

const styles = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingHorizontal: 28,
    paddingBottom: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#0f172a',
  },
  titleBlock: {
    marginBottom: 14,
  },
  titleLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#64748b',
    marginBottom: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 5,
  },
  metaLabel: {
    width: 120,
    color: '#475569',
  },
  metaValue: {
    flex: 1,
  },
  section: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontWeight: 700,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  colPos: {
    width: 34,
  },
  colDescription: {
    flex: 1,
    paddingRight: 8,
  },
  colQty: {
    width: 70,
    textAlign: 'right',
  },
  colUnit: {
    width: 52,
  },
  colDate: {
    width: 78,
  },
  secondary: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 1,
  },
  notesBox: {
    marginTop: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  footer: {
    marginTop: 18,
    fontSize: 9,
    color: '#334155',
    lineHeight: 1.4,
  },
})

function formatDate(value?: string): string {
  if (!value) {
    return 'offen'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString('de-DE')
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}

interface SupplierOrderPDFDocumentServerProps {
  templateInput: SupplierOrderTemplateInput
}

export function SupplierOrderPDFDocumentServer({
  templateInput,
}: SupplierOrderPDFDocumentServerProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.titleBlock}>
          <Text style={styles.titleLabel}>Lieferanten-Bestellung</Text>
          <Text style={styles.title}>{templateInput.orderNumber}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Lieferant</Text>
          <Text style={styles.metaValue}>{templateInput.supplierName}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Auftrag</Text>
          <Text style={styles.metaValue}>
            {templateInput.projectOrderNumber} ({templateInput.projectCustomerName})
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Lieferwoche</Text>
          <Text style={styles.metaValue}>{templateInput.deliveryCalendarWeek || 'offen'}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Montagebezug</Text>
          <Text style={styles.metaValue}>{formatDate(templateInput.installationReferenceDate)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Positionen</Text>

          <View style={styles.tableHeader}>
            <Text style={styles.colPos}>Pos.</Text>
            <Text style={styles.colDescription}>Artikel</Text>
            <Text style={styles.colQty}>Menge</Text>
            <Text style={styles.colUnit}>Einheit</Text>
            <Text style={styles.colDate}>Termin</Text>
          </View>

          {templateInput.items.map((item) => {
            const details = [item.modelNumber, item.manufacturer].filter(Boolean).join(' · ')
            return (
              <View key={`${item.positionNumber}-${item.description}`} style={styles.row}>
                <Text style={styles.colPos}>{item.positionNumber}</Text>
                <View style={styles.colDescription}>
                  <Text>{item.description}</Text>
                  {details ? <Text style={styles.secondary}>{details}</Text> : null}
                </View>
                <Text style={styles.colQty}>{formatQuantity(item.quantity)}</Text>
                <Text style={styles.colUnit}>{item.unit}</Text>
                <Text style={styles.colDate}>{formatDate(item.expectedDeliveryDate)}</Text>
              </View>
            )
          })}
        </View>

        {templateInput.notes ? (
          <View style={styles.notesBox}>
            <Text>
              <Text style={{ fontWeight: 700 }}>Hinweis: </Text>
              {templateInput.notes}
            </Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          Bitte senden Sie uns Ihre AB mit bestätigtem Liefertermin zurück.
          {'\n'}
          {templateInput.companyName}
        </Text>
      </Page>
    </Document>
  )
}
