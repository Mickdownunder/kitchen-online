'use client'

import { Check, Loader2, Pencil, Plus, Package, Trash2, X, MapPin } from 'lucide-react'
import { CompanySettings, Supplier } from '@/types'

export function SuppliersTab({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- prop kept for API, may be used later
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
              contactPersonInternal: '',
              contactPersonInternalPhone: '',
              contactPersonInternalEmail: '',
              contactPersonExternal: '',
              contactPersonExternalPhone: '',
              contactPersonExternalEmail: '',
              street: '',
              houseNumber: '',
              postalCode: '',
              city: '',
              country: '',
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
            <div className="md:col-span-2 text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">Ansprechpartner Innendienst</div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Name
              </label>
              <input
                type="text"
                value={editingSupplier.contactPersonInternal || ''}
                onChange={e =>
                  setEditingSupplier(prev =>
                    prev ? { ...prev, contactPersonInternal: e.target.value } : null
                  )
                }
                className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
                placeholder="z.B. Frau Müller"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Telefon
              </label>
              <input
                type="text"
                value={editingSupplier.contactPersonInternalPhone || ''}
                onChange={e =>
                  setEditingSupplier(prev =>
                    prev ? { ...prev, contactPersonInternalPhone: e.target.value } : null
                  )
                }
                className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
                placeholder="+43 123 456789"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                E-Mail
              </label>
              <input
                type="email"
                value={editingSupplier.contactPersonInternalEmail || ''}
                onChange={e =>
                  setEditingSupplier(prev =>
                    prev ? { ...prev, contactPersonInternalEmail: e.target.value } : null
                  )
                }
                className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
                placeholder="innen@lieferant.at"
              />
            </div>
            <div className="md:col-span-2 text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">Ansprechpartner Außendienst</div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Name
              </label>
              <input
                type="text"
                value={editingSupplier.contactPersonExternal || ''}
                onChange={e =>
                  setEditingSupplier(prev =>
                    prev ? { ...prev, contactPersonExternal: e.target.value } : null
                  )
                }
                className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
                placeholder="z.B. Herr Schmidt"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Telefon
              </label>
              <input
                type="text"
                value={editingSupplier.contactPersonExternalPhone || ''}
                onChange={e =>
                  setEditingSupplier(prev =>
                    prev ? { ...prev, contactPersonExternalPhone: e.target.value } : null
                  )
                }
                className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
                placeholder="+43 123 456789"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                E-Mail
              </label>
              <input
                type="email"
                value={editingSupplier.contactPersonExternalEmail || ''}
                onChange={e =>
                  setEditingSupplier(prev =>
                    prev ? { ...prev, contactPersonExternalEmail: e.target.value } : null
                  )
                }
                className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
                placeholder="aussen@lieferant.at"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mt-4">
              <MapPin className="h-3 w-3" /> Adresse
            </div>
            <div className="col-span-2 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Straße
                </label>
                <input
                  type="text"
                  value={editingSupplier.street || ''}
                  onChange={e =>
                    setEditingSupplier(prev => (prev ? { ...prev, street: e.target.value } : null))
                  }
                  className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
                  placeholder="Musterstraße"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Hausnr.
                </label>
                <input
                  type="text"
                  value={editingSupplier.houseNumber || ''}
                  onChange={e =>
                    setEditingSupplier(prev =>
                      prev ? { ...prev, houseNumber: e.target.value } : null
                    )
                  }
                  className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
                  placeholder="123"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  PLZ
                </label>
                <input
                  type="text"
                  value={editingSupplier.postalCode || ''}
                  onChange={e =>
                    setEditingSupplier(prev =>
                      prev ? { ...prev, postalCode: e.target.value } : null
                    )
                  }
                  className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
                  placeholder="1010"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Stadt
                </label>
                <input
                  type="text"
                  value={editingSupplier.city || ''}
                  onChange={e =>
                    setEditingSupplier(prev => (prev ? { ...prev, city: e.target.value } : null))
                  }
                  className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
                  placeholder="Wien"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Land
                </label>
                <input
                  type="text"
                  value={editingSupplier.country || ''}
                  onChange={e =>
                    setEditingSupplier(prev =>
                      prev ? { ...prev, country: e.target.value } : null
                    )
                  }
                  className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
                  placeholder="Österreich"
                />
              </div>
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
                {(supplier.contactPersonInternal || supplier.contactPersonExternal) && (
                  <p className="text-xs text-slate-400">
                    {[
                      supplier.contactPersonInternal &&
                        `Innen: ${supplier.contactPersonInternal}${supplier.contactPersonInternalPhone ? ` · ${supplier.contactPersonInternalPhone}` : ''}${supplier.contactPersonInternalEmail ? ` · ${supplier.contactPersonInternalEmail}` : ''}`,
                      supplier.contactPersonExternal &&
                        `Außen: ${supplier.contactPersonExternal}${supplier.contactPersonExternalPhone ? ` · ${supplier.contactPersonExternalPhone}` : ''}${supplier.contactPersonExternalEmail ? ` · ${supplier.contactPersonExternalEmail}` : ''}`,
                    ]
                      .filter(Boolean)
                      .join(' | ')}
                  </p>
                )}
                {(supplier.street || supplier.postalCode || supplier.city || supplier.country) && (
                  <p className="text-xs text-slate-400">
                    {[[supplier.street, supplier.houseNumber].filter(Boolean).join(' '), [supplier.postalCode, supplier.city].filter(Boolean).join(' '), supplier.country].filter(Boolean).join(', ')}
                  </p>
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
