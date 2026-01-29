'use client'

import { FileText, Plus, Trash2 } from 'lucide-react'
import type { CompanySettings } from '@/types'
import { DEFAULT_ORDER_FOOTER_TEMPLATES } from '@/lib/constants/orderFooterTemplates'

export function AuftragTab({
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
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-lg font-black text-slate-900">
          <FileText className="h-5 w-5 text-teal-600" />
          Auftrag-Vorlagen (Hinweise für Auftrag-PDF)
        </h3>
        <p className="mb-4 max-w-2xl text-sm text-slate-500">
          Diese Textbausteine erscheinen im ersten Tab eines Auftrags (Stammdaten & Verlauf) unter
          „Hinweise für Auftrag (PDF)“ als „Vorlage einfügen“. Hier können Sie sie bearbeiten und
          mit „Speichern“ dauerhaft übernehmen – z. B. andere Formulierungen oder eigene Vorlagen.
        </p>
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setCompanySettings(prev => ({
                ...prev,
                orderFooterTemplates: [...DEFAULT_ORDER_FOOTER_TEMPLATES],
              }))
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Standard-Vorlagen laden (7 Beispiele)
          </button>
          <span className="text-xs text-slate-400">
            Zahlungsmodalitäten, Reklamationen, Unterschrift Kunde, Schlusstext, Eigentumsvorbehalt,
            Montage- und Lieferhinweise – anschließend bearbeiten und speichern.
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {(companySettings.orderFooterTemplates ?? []).map((t, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={t.name}
                onChange={e =>
                  setCompanySettings(prev => ({
                    ...prev,
                    orderFooterTemplates: (prev.orderFooterTemplates ?? []).map((x, i) =>
                      i === idx ? { ...x, name: e.target.value } : x
                    ),
                  }))
                }
                placeholder="Name (z. B. Zahlungsmodalitäten)"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={() =>
                  setCompanySettings(prev => ({
                    ...prev,
                    orderFooterTemplates: (prev.orderFooterTemplates ?? []).filter(
                      (_, i) => i !== idx
                    ),
                  }))
                }
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                title="Vorlage löschen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={t.body}
              onChange={e =>
                setCompanySettings(prev => ({
                  ...prev,
                  orderFooterTemplates: (prev.orderFooterTemplates ?? []).map((x, i) =>
                    i === idx ? { ...x, body: e.target.value } : x
                  ),
                }))
              }
              rows={4}
              placeholder="Text der Vorlage (z. B. Zahlungsmodalitäten, Reklamationen-Hinweis, Unterschrift Kunde, Schlusstext)"
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-teal-500"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setCompanySettings(prev => ({
              ...prev,
              orderFooterTemplates: [
                ...(prev.orderFooterTemplates ?? []),
                { name: 'Neue Vorlage', body: '' },
              ],
            }))
          }
          className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" />
          Vorlage hinzufügen
        </button>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-xl bg-teal-600 px-6 py-3 font-bold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? 'Speichern …' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}
