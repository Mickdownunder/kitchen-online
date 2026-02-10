import React from 'react'
import { Building2, Euro, FileText, Save, X } from 'lucide-react'
import type { CreateSupplierInvoiceInput } from '@/lib/supabase/services/supplierInvoices'
import type { CustomerProject, SupplierInvoice } from '@/types'
import type { ScanStatus } from '@/hooks/useSupplierInvoiceForm'
import type { SupplierInvoiceAmounts } from '@/lib/utils/accountingAmounts'
import { calculatePayableAmount, calculateSkontoAmount } from '@/lib/utils/accountingAmounts'
import {
  formatSupplierInvoiceCurrency,
  SUPPLIER_INVOICE_CATEGORY_LABELS,
} from '@/components/accounting/supplierInvoices.constants'
import { SupplierInvoiceScanSection } from '@/components/accounting/SupplierInvoiceScanSection'
interface SupplierInvoiceFormModalProps {
  isOpen: boolean
  editingInvoice: SupplierInvoice | null
  formData: CreateSupplierInvoiceInput
  setFormData: React.Dispatch<React.SetStateAction<CreateSupplierInvoiceInput>>
  saving: boolean
  scanStatus: ScanStatus
  scanError: string | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  calculatedAmounts: SupplierInvoiceAmounts
  customCategories: { id: string; name: string }[]
  projects: CustomerProject[]
  onClose: () => void
  onSubmit: (event: React.FormEvent) => void
  onAddCustomCategory: () => void
  onDrop: (event: React.DragEvent) => void
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void
}
export function SupplierInvoiceFormModal({
  isOpen,
  editingInvoice,
  formData,
  setFormData,
  saving,
  scanStatus,
  scanError,
  fileInputRef,
  calculatedAmounts,
  customCategories,
  projects,
  onClose,
  onSubmit,
  onAddCustomCategory,
  onDrop,
  onFileSelect,
}: SupplierInvoiceFormModalProps) {
  if (!isOpen) {
    return null
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-2xl font-black text-slate-900">
            {editingInvoice ? 'Rechnung bearbeiten' : 'Neue Eingangsrechnung'}
          </h3>
          <button onClick={onClose} className="rounded-lg p-2 transition-colors hover:bg-slate-100">
            <X className="h-6 w-6 text-slate-400" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-6">
          <SupplierInvoiceScanSection
            formData={formData}
            editingInvoice={editingInvoice}
            scanStatus={scanStatus}
            scanError={scanError}
            fileInputRef={fileInputRef}
            onDrop={onDrop}
            onDragOver={event => event.preventDefault()}
            onFileSelect={onFileSelect}
          />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h4 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
              <Building2 className="h-5 w-5 text-amber-500" />
              Lieferant
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.supplierName}
                  onChange={event =>
                    setFormData({ ...formData, supplierName: event.target.value })
                  }
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
                  placeholder="Lieferantenname"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">UID-Nummer</label>
                <input
                  type="text"
                  value={formData.supplierUid || ''}
                  onChange={event => setFormData({ ...formData, supplierUid: event.target.value })}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
                  placeholder="ATU12345678"
                />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h4 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
              <FileText className="h-5 w-5 text-amber-500" />
              Rechnungsdetails
            </h4>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Rechnungsnummer *</label>
                <input
                  type="text"
                  required
                  value={formData.invoiceNumber}
                  onChange={event => setFormData({ ...formData, invoiceNumber: event.target.value })}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
                  placeholder="R-2026-001"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Rechnungsdatum *</label>
                <input
                  type="date"
                  required
                  value={formData.invoiceDate}
                  onChange={event => setFormData({ ...formData, invoiceDate: event.target.value })}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Fälligkeitsdatum</label>
                <input
                  type="date"
                  value={formData.dueDate || ''}
                  onChange={event => setFormData({ ...formData, dueDate: event.target.value })}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h4 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
              <Euro className="h-5 w-5 text-amber-500" />
              Beträge
            </h4>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Netto-Betrag *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.netAmount || ''}
                  onChange={event =>
                    setFormData({ ...formData, netAmount: parseFloat(event.target.value) || 0 })
                  }
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">MwSt-Satz</label>
                <select
                  value={formData.taxRate}
                  onChange={event =>
                    setFormData({ ...formData, taxRate: parseInt(event.target.value, 10) })
                  }
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
                >
                  <option value={20}>20%</option>
                  <option value={13}>13%</option>
                  <option value={10}>10%</option>
                  <option value={0}>0%</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Vorsteuer</label>
                <div className="rounded-xl border-2 border-slate-200 bg-slate-100 px-4 py-3 font-bold text-emerald-600">
                  {formatSupplierInvoiceCurrency(calculatedAmounts.taxAmount)} €
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Brutto</label>
                <div className="rounded-xl border-2 border-amber-500 bg-amber-50 px-4 py-3 font-black text-slate-900">
                  {formatSupplierInvoiceCurrency(calculatedAmounts.grossAmount)} €
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">Kategorie</label>
            <div className="flex gap-2">
              <select
                value={formData.category}
                onChange={event => setFormData({ ...formData, category: event.target.value })}
                className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
              >
                {Object.entries(SUPPLIER_INVOICE_CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
                {customCategories.map(category => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onAddCustomCategory}
                className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 transition-colors hover:bg-amber-100"
              >
                + Kategorie
              </button>
            </div>
          </div>
          {projects.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">Auftrag zuordnen</label>
              <select
                value={formData.projectId ?? ''}
                onChange={event =>
                  setFormData({
                    ...formData,
                    projectId: event.target.value || undefined,
                  })
                }
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
              >
                <option value="">Kein Auftrag</option>
                {projects
                  .slice()
                  .sort((projectA, projectB) =>
                    (projectB.orderDate || projectB.createdAt || '').localeCompare(
                      projectA.orderDate || projectA.createdAt || '',
                    ),
                  )
                  .map(project => (
                    <option key={project.id} value={project.id}>
                      {project.orderNumber} – {project.customerName}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Verknüpfung ermöglicht automatische Marge-Berechnung aus Wareneinsatz
              </p>
            </div>
          )}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h4 className="mb-2 font-bold text-slate-900">Skonto (optional)</h4>
            <p className="mb-4 text-xs text-slate-500">
              Wird beim Steuerberater separat angegeben – Vorsteuer bezieht sich auf den tatsächlich
              gezahlten Betrag.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Skonto %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.skontoPercent ?? ''}
                  onChange={event => {
                    const skontoPercent = event.target.value ? parseFloat(event.target.value) : undefined
                    const grossAmount = calculatedAmounts.grossAmount
                    const skontoAmount =
                      skontoPercent != null && grossAmount > 0
                        ? calculateSkontoAmount(grossAmount, skontoPercent)
                        : undefined
                    setFormData({ ...formData, skontoPercent, skontoAmount })
                  }}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
                  placeholder="z. B. 6"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Skontobetrag €</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.skontoAmount ?? ''}
                  onChange={event =>
                    setFormData({
                      ...formData,
                      skontoAmount: event.target.value ? parseFloat(event.target.value) : undefined,
                    })
                  }
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Zahlungsbetrag</label>
                <div className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-medium text-slate-700">
                  {formatSupplierInvoiceCurrency(
                    calculatePayableAmount(calculatedAmounts.grossAmount, formData.skontoAmount ?? 0),
                  )}{' '}
                  €
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">Notizen</label>
            <textarea
              value={formData.notes || ''}
              onChange={event => setFormData({ ...formData, notes: event.target.value })}
              rows={3}
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
              placeholder="Optionale Notizen..."
            />
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border-2 border-slate-200 px-6 py-3 font-bold text-slate-600 transition-all hover:bg-slate-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-white shadow-lg transition-all hover:bg-amber-600 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Speichern...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Speichern
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
