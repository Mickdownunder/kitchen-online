import type { SupplierInvoiceCategory } from '@/types'

export const SUPPLIER_INVOICE_CATEGORY_LABELS: Record<SupplierInvoiceCategory, string> = {
  material: 'Wareneinkauf',
  subcontractor: 'Subunternehmer',
  tools: 'Werkzeuge/Maschinen',
  rent: 'Miete',
  insurance: 'Versicherungen',
  vehicle: 'Fahrzeugkosten',
  office: 'Bürobedarf',
  marketing: 'Marketing/Werbung',
  other: 'Sonstiges',
}

const SUPPLIER_INVOICE_CATEGORY_COLORS: Record<SupplierInvoiceCategory, string> = {
  material: 'bg-blue-100 text-blue-700',
  subcontractor: 'bg-purple-100 text-purple-700',
  tools: 'bg-orange-100 text-orange-700',
  rent: 'bg-green-100 text-green-700',
  insurance: 'bg-cyan-100 text-cyan-700',
  vehicle: 'bg-yellow-100 text-yellow-700',
  office: 'bg-pink-100 text-pink-700',
  marketing: 'bg-indigo-100 text-indigo-700',
  other: 'bg-slate-100 text-slate-700',
}

export function getSupplierInvoiceCategoryLabel(category: string): string {
  return (SUPPLIER_INVOICE_CATEGORY_LABELS as Record<string, string>)[category] ?? category
}

export function getSupplierInvoiceCategoryColor(category: string): string {
  return (
    (SUPPLIER_INVOICE_CATEGORY_COLORS as Record<string, string>)[category] ??
    'bg-slate-100 text-slate-700'
  )
}

export function formatSupplierInvoiceCurrency(value: number): string {
  return value.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
