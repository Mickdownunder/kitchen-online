'use client'

import { Check, Loader2, Pencil, Plus, Package, Trash2, X } from 'lucide-react'
import { CompanySettings, Supplier } from '@/types'

export function SuppliersTab({
  companySettings,
  suppliers,
  editingSupplier,
  setEditingSupplier,
  saving,
  onSaveSupplier,
  onDeleteSupplier,
}: {
  companySettings: Partial<CompanySettings>
  suppliers: Supplier[]
  editingSupplier: Partial<Supplier> | null
  setEditingSupplier: React.Dispatch<React.SetStateAction<Partial<Supplier> | null>>
  saving: boolean
  onSaveSupplier: () => void
  onDeleteSupplier: (id: string) => void
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
          <Package className="h-5 w-5 text-amber-500" />
          Lieferanten
        </h3>
        <button
          onClick={() =>
            setEditingSupplier({
              name: '',
              email: '',
              orderEmail: '',
              phone: '',
              contactPerson: '',
              address: '',
              notes: '',
            })
          }
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-amber-600"
        >
          <Plus className="h-4 w-4" />
          Neuer Lieferant
        </button>
      </div>

      {editingSupplier && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h4 className="font-bold text-slate-900">
            {editingSupplier.id ? 'Lieferant bearbeiten' : 'Neuer Lieferant'}
          </h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Name *
              </label>
              <input
                type="text"
                value={editingSupplier.name || ''}
                onChange={e =>
                  setEditingSupplier(prev => (prev ? { ...prev, name: e.target.value } : null))
                }
                className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
                placeholder="z.B. Schüller Küchen GmbH"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                E-Mail
              </label>
              <input
                type="email"
                value={editingSupplier.email || ''}
                onChange={e =>
                  setEditingSupplier(prev => (prev ? { ...prev, email: e.target.value } : null))
                }
                className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
                placeholder="info@lieferant.at"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Bestell-E-Mail
              </label>
              <input
                type="email"
                value={editingSupplier.orderEmail || ''}
                onChange={e =>
                  setEditingSupplier(prev => (prev ? { ...prev, orderEmail: e.target.value } : null))
                }
                className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
                placeholder="bestellung@lieferant.at"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Telefon
              </label>
              <input
                type="text"
                value={editingSupplier.phone || ''}
                onChange={e =>
                  setEditingSupplier(prev => (prev ? { ...prev, phone: e.target.value } : null))
                }
                className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
                placeholder="+43 123 456789"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Ansprechpartner
              </label>
              <input
                type="text"
                value={editingSupplier.contactPerson || ''}
                onChange={e =>
                  setEditingSupplier(prev =>
                    prev ? { ...prev, contactPerson: e.target.value } : null
                  )
                }
                className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
                placeholder="Max Mustermann"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Adresse
              </label>
              <textarea
                value={editingSupplier.address || ''}
                onChange={e =>
                  setEditingSupplier(prev => (prev ? { ...prev, address: e.target.value } : null))
                }
                rows={2}
                className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
                placeholder="Straße 1, 1234 Ort"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Notizen
              </label>
              <textarea
                value={editingSupplier.notes || ''}
                onChange={e =>
                  setEditingSupplier(prev => (prev ? { ...prev, notes: e.target.value } : null))
                }
                rows={2}
                className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
                placeholder="z.B. Bestellung per E-Mail, Lieferzeit 2–3 Wochen"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setEditingSupplier(null)}
              className="flex items-center gap-2 rounded-xl bg-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition-all hover:bg-slate-300"
            >
              <X className="h-4 w-4" />
              Abbrechen
            </button>
            <button
              onClick={onSaveSupplier}
              disabled={saving || !(editingSupplier.name?.trim())}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-emerald-600 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Speichern
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {suppliers.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Package className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p>Keine Lieferanten angelegt</p>
            <p className="mt-1 text-sm">
              Legen Sie Lieferanten an, damit die KI Artikel bestellen kann.
            </p>
          </div>
        ) : (
          suppliers.map(supplier => (
            <div
              key={supplier.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div>
                <p className="font-bold text-slate-900">{supplier.name}</p>
                {(supplier.orderEmail || supplier.email) && (
                  <p className="text-sm text-slate-600">
                    {supplier.orderEmail || supplier.email}
                  </p>
                )}
                {supplier.contactPerson && (
                  <p className="text-xs text-slate-400">Ansprechpartner: {supplier.contactPerson}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingSupplier(supplier)}
                  className="rounded-lg bg-blue-100 p-2 transition-all hover:bg-blue-200"
                >
                  <Pencil className="h-4 w-4 text-blue-600" />
                </button>
                <button
                  onClick={() => onDeleteSupplier(supplier.id)}
                  className="rounded-lg bg-red-100 p-2 transition-all hover:bg-red-200"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
