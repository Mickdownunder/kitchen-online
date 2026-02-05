'use client'

import React from 'react'
import { AlertCircle, FileText, Plus, Truck } from 'lucide-react'
import { CustomerProject, CustomerDeliveryNote, Invoice } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface MissingInvoicesListProps {
  projects: CustomerProject[]
  invoices: Invoice[]
  customerDeliveryNotes: CustomerDeliveryNote[]
  onCreateInvoice?: (projectId: string, type: 'partial' | 'final') => void
}

interface MissingInvoiceItem {
  project: CustomerProject
  missingType: 'partial' | 'final'
  deliveryNoteDate?: string
}

export function MissingInvoicesList({
  projects,
  invoices,
  customerDeliveryNotes,
  onCreateInvoice,
}: MissingInvoicesListProps) {
  // Build a map of projectId -> invoices (gleiche Logik wie ProjectRow: nur Rechnungsvorhandenheit)
  const invoicesByProject = React.useMemo(() => {
    const map = new Map<string, Invoice[]>()
    for (const inv of invoices) {
      const existing = map.get(inv.projectId) || []
      existing.push(inv)
      map.set(inv.projectId, existing)
    }
    return map
  }, [invoices])

  const deliveryNotesByProject = React.useMemo(() => {
    const map = new Map<string, CustomerDeliveryNote[]>()
    for (const dn of customerDeliveryNotes) {
      const existing = map.get(dn.projectId) || []
      existing.push(dn)
      map.set(dn.projectId, existing)
    }
    return map
  }, [customerDeliveryNotes])

  // Projekte mit fehlenden Rechnungen – gleiche Logik wie AN/SC in ProjectRow (rot = fehlt)
  const missingInvoices = React.useMemo(() => {
    const result: MissingInvoiceItem[] = []

    for (const project of projects) {
      const projectInvoices = invoicesByProject.get(project.id) || []
      const hasPartialInvoice = projectInvoices.some(inv => inv.type === 'partial')
      const hasFinalInvoice = projectInvoices.some(inv => inv.type === 'final')

      if (!hasPartialInvoice) {
        result.push({ project, missingType: 'partial' })
      }
      if (!hasFinalInvoice) {
        const deliveredNote = (deliveryNotesByProject.get(project.id) || []).find(
          dn => dn.status === 'delivered' || dn.status === 'signed' || dn.status === 'completed'
        )
        result.push({
          project,
          missingType: 'final',
          deliveryNoteDate: deliveredNote?.deliveryDate,
        })
      }
    }

    return result.sort((a, b) => {
      const dateA = a.project.orderDate || a.project.createdAt || ''
      const dateB = b.project.orderDate || b.project.createdAt || ''
      return dateB.localeCompare(dateA)
    })
  }, [projects, invoicesByProject, deliveryNotesByProject])

  const missingPartial = missingInvoices.filter(item => item.missingType === 'partial')
  const missingFinal = missingInvoices.filter(item => item.missingType === 'final')

  const projectsMissingBoth = React.useMemo(() => {
    const partialIds = new Set(missingPartial.map(m => m.project.id))
    return missingFinal.filter(m => partialIds.has(m.project.id))
  }, [missingPartial, missingFinal])

  if (missingPartial.length === 0 && missingFinal.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/90 to-emerald-100/90 p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-emerald-700">
          <FileText className="h-5 w-5" />
          <span className="font-semibold">Alle Rechnungen sind erfasst!</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Missing Partial Invoices (Anzahlungen) */}
      {missingPartial.length > 0 && (
        <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/90 to-amber-100/90 p-6 shadow-lg/30">
          <div className="mb-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-bold text-amber-900">
              Anzahlung fehlt ({missingPartial.length})
            </h3>
          </div>

          <div className="space-y-3">
            {missingPartial.map(item => {
              const isMissingBoth = projectsMissingBoth.some(m => m.project.id === item.project.id)
              return (
                <div
                  key={`partial-${item.project.id}`}
                  className="flex items-center justify-between rounded-xl border border-amber-200/40 bg-white/60 p-4 shadow-sm"
                >
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-amber-600" />
                      <span className="font-semibold text-slate-900">{item.project.customerName}</span>
                      <span className="text-sm text-slate-500">({item.project.orderNumber})</span>
                      {isMissingBoth && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          + Schlussrechnung fehlt
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                      <span>Betrag: <strong>{formatCurrency(item.project.totalAmount)} €</strong></span>
                      {item.project.orderDate && (
                        <span>Auftrag: {new Date(item.project.orderDate).toLocaleDateString('de-DE')}</span>
                      )}
                    </div>
                  </div>
                  {onCreateInvoice && (
                    <button
                      onClick={() => onCreateInvoice(item.project.id, 'partial')}
                      className="ml-4 flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-amber-600"
                    >
                      <Plus className="h-4 w-4" />
                      Erstellen
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Missing Final Invoices (Schlussrechnungen) */}
      {missingFinal.length > 0 && (
        <div className="rounded-2xl border border-red-200/60 bg-gradient-to-br from-red-50/90 to-red-100/90 p-6 shadow-lg/30">
          <div className="mb-4 flex items-center gap-3">
            <Truck className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-bold text-red-900">
              Schlussrechnung fehlt ({missingFinal.length})
            </h3>
          </div>

          <div className="space-y-3">
            {missingFinal.map(item => (
              <div
                key={`final-${item.project.id}`}
                className="flex items-center justify-between rounded-xl border border-red-200/40 bg-white/60 p-4 shadow-sm"
              >
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-red-600" />
                    <span className="font-semibold text-slate-900">{item.project.customerName}</span>
                    <span className="text-sm text-slate-500">({item.project.orderNumber})</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                    <span>Betrag: <strong>{formatCurrency(item.project.totalAmount)} €</strong></span>
                    {item.deliveryNoteDate && (
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        Geliefert: {new Date(item.deliveryNoteDate).toLocaleDateString('de-DE')}
                      </span>
                    )}
                  </div>
                </div>
                {onCreateInvoice && (
                  <button
                    onClick={() => onCreateInvoice(item.project.id, 'final')}
                    className="ml-4 flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-600"
                  >
                    <Plus className="h-4 w-4" />
                    Erstellen
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
