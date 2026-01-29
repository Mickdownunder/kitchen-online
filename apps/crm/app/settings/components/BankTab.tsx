'use client'

import { Check, CreditCard, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { BankAccount, CompanySettings } from '@/types'

export function BankTab({
  companySettings,
  bankAccounts,
  editingBank,
  setEditingBank,
  saving,
  onSaveBank,
  onDeleteBank,
}: {
  companySettings: Partial<CompanySettings>
  bankAccounts: BankAccount[]
  editingBank: Partial<BankAccount> | null
  setEditingBank: React.Dispatch<React.SetStateAction<Partial<BankAccount> | null>>
  saving: boolean
  onSaveBank: () => void
  onDeleteBank: (id: string) => void
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
          <CreditCard className="h-5 w-5 text-amber-500" />
          Bankverbindungen
        </h3>
        <button
          onClick={() =>
            setEditingBank({
              bankName: '',
              accountHolder: companySettings.companyName || '',
              iban: '',
              bic: '',
              isDefault: bankAccounts.length === 0,
            })
          }
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-amber-600"
        >
          <Plus className="h-4 w-4" />
          Neue Bankverbindung
        </button>
      </div>

      {editingBank && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h4 className="font-bold text-slate-900">
            {editingBank.id ? 'Bankverbindung bearbeiten' : 'Neue Bankverbindung'}
          </h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Bankname *
              </label>
              <input
                type="text"
                value={editingBank.bankName || ''}
                onChange={e =>
                  setEditingBank(prev => (prev ? { ...prev, bankName: e.target.value } : null))
                }
                className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
                placeholder="Erste Bank"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Kontoinhaber *
              </label>
              <input
                type="text"
                value={editingBank.accountHolder || ''}
                onChange={e =>
                  setEditingBank(prev => (prev ? { ...prev, accountHolder: e.target.value } : null))
                }
                className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                IBAN *
              </label>
              <input
                type="text"
                value={editingBank.iban || ''}
                onChange={e =>
                  setEditingBank(prev => (prev ? { ...prev, iban: e.target.value } : null))
                }
                className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
                placeholder="AT12 3456 7890 1234 5678"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                BIC
              </label>
              <input
                type="text"
                value={editingBank.bic || ''}
                onChange={e =>
                  setEditingBank(prev => (prev ? { ...prev, bic: e.target.value } : null))
                }
                className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
                placeholder="GIBAATWWXXX"
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={editingBank.isDefault || false}
              onChange={e =>
                setEditingBank(prev => (prev ? { ...prev, isDefault: e.target.checked } : null))
              }
              className="h-4 w-4 rounded text-amber-500 focus:ring-amber-500"
            />
            <span className="text-sm text-slate-700">
              Als Standard-Bankverbindung für Rechnungen verwenden
            </span>
          </label>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setEditingBank(null)}
              className="flex items-center gap-2 rounded-xl bg-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition-all hover:bg-slate-300"
            >
              <X className="h-4 w-4" />
              Abbrechen
            </button>
            <button
              onClick={onSaveBank}
              disabled={saving || !editingBank.bankName || !editingBank.iban}
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
        {bankAccounts.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <CreditCard className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p>Keine Bankverbindungen vorhanden</p>
          </div>
        ) : (
          bankAccounts.map(bank => (
            <div
              key={bank.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900">{bank.bankName}</p>
                  {bank.isDefault && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                      Standard
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600">{bank.iban}</p>
                <p className="text-xs text-slate-400">BIC: {bank.bic || '-'}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingBank(bank)}
                  className="rounded-lg bg-blue-100 p-2 transition-all hover:bg-blue-200"
                >
                  <Pencil className="h-4 w-4 text-blue-600" />
                </button>
                <button
                  onClick={() => onDeleteBank(bank.id)}
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
