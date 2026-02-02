'use client'

import { FileText, Plus, Save, X } from 'lucide-react'
import { CompanySettings } from '@/types'

export function InvoiceTab({
  companySettings,
  setCompanySettings,
  saving,
  onSave,
}: {
  companySettings: Partial<CompanySettings>
  setCompanySettings: React.Dispatch<React.SetStateAction<Partial<CompanySettings>>>
  saving: boolean
  onSave: () => void
}) {
  return (
    <div className="space-y-8">
      <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
        <FileText className="h-5 w-5 text-amber-500" />
        Rechnungseinstellungen
      </h3>

      {/* Fortlaufende Nummern (Rechnung, Auftrag, Lieferschein) */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h4 className="mb-4 text-sm font-bold text-slate-700">Fortlaufende Nummern</h4>
        <p className="mb-4 text-xs text-slate-500">
          Präfix und nächste Nummer für Rechnungen, Aufträge und Lieferscheine. Format: Präfix-Jahr-Nummer (z.B. R-2026-0001).
        </p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-6">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Rechnung Präfix
            </label>
            <input
              type="text"
              value={companySettings.invoicePrefix || ''}
              onChange={e => setCompanySettings(prev => ({ ...prev, invoicePrefix: e.target.value }))}
              className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
              placeholder="R-"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Nächste Rechnungsnr.
            </label>
            <input
              type="number"
              min="1"
              value={companySettings.nextInvoiceNumber ?? 1}
              onChange={e =>
                setCompanySettings(prev => ({
                  ...prev,
                  nextInvoiceNumber: parseInt(e.target.value) || 1,
                }))
              }
              className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Auftrag Präfix
            </label>
            <input
              type="text"
              value={companySettings.orderPrefix ?? ''}
              onChange={e => setCompanySettings(prev => ({ ...prev, orderPrefix: e.target.value }))}
              className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
              placeholder="K-"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Nächste Auftragsnr.
            </label>
            <input
              type="number"
              min="1"
              value={companySettings.nextOrderNumber ?? 1}
              onChange={e =>
                setCompanySettings(prev => ({
                  ...prev,
                  nextOrderNumber: parseInt(e.target.value) || 1,
                }))
              }
              className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Lieferschein Präfix
            </label>
            <input
              type="text"
              value={companySettings.deliveryNotePrefix ?? ''}
              onChange={e =>
                setCompanySettings(prev => ({ ...prev, deliveryNotePrefix: e.target.value }))
              }
              className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
              placeholder="LS-"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Nächste Lieferscheinnr.
            </label>
            <input
              type="number"
              min="1"
              value={companySettings.nextDeliveryNoteNumber ?? 1}
              onChange={e =>
                setCompanySettings(prev => ({
                  ...prev,
                  nextDeliveryNoteNumber: parseInt(e.target.value) || 1,
                }))
              }
              className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
            Angebotsnummer-Präfix
          </label>
          <input
            type="text"
            value={companySettings.offerPrefix || ''}
            onChange={e => setCompanySettings(prev => ({ ...prev, offerPrefix: e.target.value }))}
            className="w-full rounded-xl bg-slate-50 px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
            placeholder="A-"
          />
          <p className="mt-1 text-xs text-slate-400">z.B. A-2025-001</p>
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
            Standard-Zahlungsziel (Tage)
          </label>
          <select
            value={companySettings.defaultPaymentTerms || 14}
            onChange={e =>
              setCompanySettings(prev => ({
                ...prev,
                defaultPaymentTerms: parseInt(e.target.value),
              }))
            }
            className="w-full rounded-xl bg-slate-50 px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
          >
            {(companySettings.paymentTermsOptions || [0, 7, 14, 30, 60]).map((days: number) => (
              <option key={days} value={days}>
                {days === 0 ? 'Sofort fällig' : `${days} Tage`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
            Standard-MwSt. (%)
          </label>
          <select
            value={companySettings.defaultTaxRate || 20}
            onChange={e =>
              setCompanySettings(prev => ({ ...prev, defaultTaxRate: parseInt(e.target.value) }))
            }
            className="w-full rounded-xl bg-slate-50 px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
          >
            <option value={20}>20%</option>
            <option value={13}>13%</option>
            <option value={10}>10%</option>
            <option value={0}>0%</option>
          </select>
        </div>
      </div>

      {/* Payment Terms Options Management */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h4 className="mb-4 text-sm font-bold text-slate-700">Verfügbare Zahlungsziele (Tage)</h4>
        <div className="mb-4 flex flex-wrap gap-2">
          {(companySettings.paymentTermsOptions || [0, 7, 14, 30, 60]).map(
            (days: number, idx: number) => (
              <span
                key={idx}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
              >
                {days === 0 ? 'Sofort' : `${days} Tage`}
                <button
                  type="button"
                  onClick={() => {
                    const current = companySettings.paymentTermsOptions || [0, 7, 14, 30, 60]
                    setCompanySettings(prev => ({
                      ...prev,
                      paymentTermsOptions: current.filter((_: number, i: number) => i !== idx),
                    }))
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            placeholder="Tage"
            id="newPaymentTerm"
            className="w-24 rounded-lg bg-white px-3 py-2 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="button"
            onClick={() => {
              const input = document.getElementById('newPaymentTerm') as HTMLInputElement
              const days = parseInt(input.value)
              if (!isNaN(days) && days >= 0) {
                const current = companySettings.paymentTermsOptions || [0, 7, 14, 30, 60]
                if (!current.includes(days)) {
                  setCompanySettings(prev => ({
                    ...prev,
                    paymentTermsOptions: [...current, days].sort((a: number, b: number) => a - b),
                  }))
                  input.value = ''
                }
              }
            }}
            className="flex items-center gap-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-amber-600"
          >
            <Plus className="h-4 w-4" />
            Hinzufügen
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">0 = Sofort fällig, ansonsten Anzahl der Tage</p>
      </div>

      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
          Rechnungs-Fußzeile (optional)
        </label>
        <textarea
          value={companySettings.invoiceFooterText || ''}
          onChange={e =>
            setCompanySettings(prev => ({ ...prev, invoiceFooterText: e.target.value }))
          }
          className="min-h-[100px] w-full rounded-xl bg-slate-50 px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
          placeholder="z.B. Vielen Dank für Ihren Auftrag! Bei Fragen stehen wir Ihnen gerne zur Verfügung."
        />
      </div>

      {/* Mahnungs-Einstellungen */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-6">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
          <FileText className="h-4 w-4 text-amber-600" />
          Mahnungs-Einstellungen
        </h4>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Tage bis 1. Mahnung
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={companySettings.reminderDaysBetweenFirst || 7}
              onChange={e =>
                setCompanySettings(prev => ({
                  ...prev,
                  reminderDaysBetweenFirst: parseInt(e.target.value) || 7,
                }))
              }
              className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
            />
            <p className="mt-1 text-xs text-slate-400">Standard: 7 Tage</p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Tage bis 2. Mahnung
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={companySettings.reminderDaysBetweenSecond || 7}
              onChange={e =>
                setCompanySettings(prev => ({
                  ...prev,
                  reminderDaysBetweenSecond: parseInt(e.target.value) || 7,
                }))
              }
              className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
            />
            <p className="mt-1 text-xs text-slate-400">Standard: 7 Tage</p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Tage bis letzte Mahnung
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={companySettings.reminderDaysBetweenFinal || 7}
              onChange={e =>
                setCompanySettings(prev => ({
                  ...prev,
                  reminderDaysBetweenFinal: parseInt(e.target.value) || 7,
                }))
              }
              className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
            />
            <p className="mt-1 text-xs text-slate-400">Standard: 7 Tage</p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Verzugszinsen pro Jahr (%)
            </label>
            <input
              type="number"
              min="0"
              max="20"
              step="0.1"
              value={companySettings.reminderLatePaymentInterest || 9.2}
              onChange={e =>
                setCompanySettings(prev => ({
                  ...prev,
                  reminderLatePaymentInterest: parseFloat(e.target.value) || 9.2,
                }))
              }
              className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
            />
            <p className="mt-1 text-xs text-slate-400">Österreichischer Standard: 9.2%</p>
          </div>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
            Mahnungs-E-Mail-Vorlage (optional)
          </label>
          <textarea
            value={companySettings.reminderEmailTemplate || ''}
            onChange={e =>
              setCompanySettings(prev => ({ ...prev, reminderEmailTemplate: e.target.value }))
            }
            className="min-h-[120px] w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
            placeholder="Anpassbare Vorlage für Mahnungs-E-Mails. Variablen: {customerName}, {invoiceNumber}, {amount}, {dueDate}, {overdueDays}, {reminderType}"
          />
          <p className="mt-2 text-xs text-slate-400">
            Falls leer, wird die Standard-Vorlage verwendet. Variablen werden automatisch ersetzt.
          </p>
        </div>
      </div>

      <div className="flex justify-end border-t border-slate-200 pt-6">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-4 font-bold text-white shadow-lg transition-all hover:from-amber-600 hover:to-amber-700 disabled:opacity-50"
        >
          <Save className="h-5 w-5" />
          Einstellungen speichern
        </button>
      </div>
    </div>
  )
}
