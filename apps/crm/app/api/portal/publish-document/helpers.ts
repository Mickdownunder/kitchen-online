import type { InvoiceItem } from '@/types'
import type { DocumentType, PublishRequest } from './schema'

export function getPermissionCode(documentType: DocumentType): 'create_invoices' | 'edit_projects' {
  return documentType === 'invoice' ? 'create_invoices' : 'edit_projects'
}

export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9-_.]/g, '_')
}

export function normalizeDocumentNameForDedup(fileName: string): string {
  const sanitized = sanitizeFileName(fileName.trim())
  const withoutPdfExtension = sanitized.replace(/\.pdf$/i, '')
  const withoutLegacyTimestampSuffix = withoutPdfExtension.replace(/_[0-9]{10,}$/, '')
  return withoutLegacyTimestampSuffix.toLowerCase()
}

export function mapInvoiceItemsForInvoicePdf(project: PublishRequest['project']): InvoiceItem[] {
  return (project.items || []).map((item, index) => {
    const netTotal = item.netTotal || (item.pricePerUnit || 0) * item.quantity
    const taxRate = (item.taxRate as InvoiceItem['taxRate']) || 20

    return {
      id: `item-${index}`,
      position: index + 1,
      description: item.description,
      quantity: item.quantity,
      unit: (item.unit as InvoiceItem['unit']) || 'Stk',
      pricePerUnit: item.pricePerUnit || 0,
      taxRate,
      netTotal,
      taxAmount: netTotal * (taxRate / 100),
      grossTotal: netTotal * (1 + taxRate / 100),
    }
  })
}

export function mapInvoiceItemsForOrderPdf(project: PublishRequest['project']): InvoiceItem[] {
  return (project.items || []).map((item, index) => ({
    id: `item-${index}`,
    position: index + 1,
    description: item.description,
    quantity: item.quantity || 1,
    unit: (item.unit as InvoiceItem['unit']) || 'Stk',
    pricePerUnit: item.pricePerUnit || 0,
    netTotal: item.netTotal || 0,
    taxRate: ((item.taxRate as InvoiceItem['taxRate']) || 20) as InvoiceItem['taxRate'],
    taxAmount: 0,
    grossTotal: 0,
  }))
}
