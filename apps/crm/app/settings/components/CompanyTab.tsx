'use client'

import { Building2, Globe, Hash, Loader2, Mail, MapPin, Phone, Save } from 'lucide-react'
import { CompanySettings } from '@/types'

export function CompanyTab({
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
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
            <Building2 className="h-5 w-5 text-yellow-500" />
            Unternehmensdaten
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Firmenname *
              </label>
              <input
                type="text"
                value={companySettings.companyName || ''}
                onChange={e =>
                  setCompanySettings(prev => ({ ...prev, companyName: e.target.value }))
                }
                className="w-full rounded-xl bg-slate-50 px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-500"
                placeholder="Ihr Unternehmen"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Rechtsform
              </label>
              <select
                value={companySettings.legalForm || ''}
                onChange={e => setCompanySettings(prev => ({ ...prev, legalForm: e.target.value }))}
                className="w-full rounded-xl bg-slate-50 px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-500"
              >
                <option value="GmbH">GmbH</option>
                <option value="AG">AG</option>
                <option value="e.U.">e.U.</option>
                <option value="OG">OG</option>
                <option value="KG">KG</option>
                <option value="">Sonstige</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Anzeigename (für Menü oben links)
            </label>
            <input
              type="text"
              value={companySettings.displayName || ''}
              onChange={e =>
                setCompanySettings(prev => ({ ...prev, displayName: e.target.value }))
              }
                className="w-full rounded-xl bg-slate-50 px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-500"
              placeholder="z.B. Designstudio BaLeah"
            />
            <p className="mt-1 text-xs text-slate-400">
              Dieser Name wird oben links im Menü angezeigt. Falls leer, wird der Firmenname verwendet.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Logo-URL (für Menü oben links)
            </label>
            <input
              type="url"
              value={companySettings.logoUrl || ''}
              onChange={e =>
                setCompanySettings(prev => ({ ...prev, logoUrl: e.target.value || undefined }))
              }
              className="w-full rounded-xl bg-slate-50 px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-500"
              placeholder="https://... (leer = Küchenonline-Logo)"
            />
            <p className="mt-1 text-xs text-slate-400">
              Logo für dunklen Hintergrund (weiß/hell). Für Baleah z.B. eigenes Logo hochladen und URL hier eintragen.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                <MapPin className="mr-1 inline h-3 w-3" />
                Straße
              </label>
              <input
                type="text"
                value={companySettings.street || ''}
                onChange={e => setCompanySettings(prev => ({ ...prev, street: e.target.value }))}
                className="w-full rounded-xl bg-slate-50 px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-500"
                placeholder="Musterstraße"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Hausnr.
              </label>
              <input
                type="text"
                value={companySettings.houseNumber || ''}
                onChange={e =>
                  setCompanySettings(prev => ({ ...prev, houseNumber: e.target.value }))
                }
                className="w-full rounded-xl bg-slate-50 px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-500"
                placeholder="123"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                PLZ
              </label>
              <input
                type="text"
                value={companySettings.postalCode || ''}
                onChange={e =>
                  setCompanySettings(prev => ({ ...prev, postalCode: e.target.value }))
                }
                className="w-full rounded-xl bg-slate-50 px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-500"
                placeholder="1010"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Stadt
              </label>
              <input
                type="text"
                value={companySettings.city || ''}
                onChange={e => setCompanySettings(prev => ({ ...prev, city: e.target.value }))}
                className="w-full rounded-xl bg-slate-50 px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-500"
                placeholder="Wien"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Land
              </label>
              <input
                type="text"
                value={companySettings.country || ''}
                onChange={e => setCompanySettings(prev => ({ ...prev, country: e.target.value }))}
                className="w-full rounded-xl bg-slate-50 px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-500"
                placeholder="Österreich"
              />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
            <Phone className="h-5 w-5 text-yellow-500" />
            Kontaktdaten
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                <Phone className="mr-1 inline h-3 w-3" />
                Telefon
              </label>
              <input
                type="tel"
                value={companySettings.phone || ''}
                onChange={e => setCompanySettings(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full rounded-xl bg-slate-50 px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-500"
                placeholder="+43 1 234 5678"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Fax
              </label>
              <input
                type="tel"
                value={companySettings.fax || ''}
                onChange={e => setCompanySettings(prev => ({ ...prev, fax: e.target.value }))}
                className="w-full rounded-xl bg-slate-50 px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-500"
                placeholder="+43 1 234 5679"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              <Mail className="mr-1 inline h-3 w-3" />
              E-Mail
            </label>
            <input
              type="email"
              value={companySettings.email || ''}
              onChange={e => setCompanySettings(prev => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-xl bg-slate-50 px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-500"
              placeholder="office@ihrunternehmen.at"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                AB-Eingangsadresse
              </label>
              <input
                type="email"
                value={companySettings.inboundEmailAb || ''}
                onChange={e =>
                  setCompanySettings(prev => ({ ...prev, inboundEmailAb: e.target.value }))
                }
                className="w-full rounded-xl bg-slate-50 px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-500"
                placeholder="ab@baleah.at"
              />
              <p className="mt-1 text-xs text-slate-400">
                Lieferanten senden Auftragsbestätigungen an diese Adresse.
              </p>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Rechnungs-Eingangsadresse
              </label>
              <input
                type="email"
                value={companySettings.inboundEmailInvoices || ''}
                onChange={e =>
                  setCompanySettings(prev => ({ ...prev, inboundEmailInvoices: e.target.value }))
                }
                className="w-full rounded-xl bg-slate-50 px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-500"
                placeholder="rechnungen@baleah.at"
              />
              <p className="mt-1 text-xs text-slate-400">
                Lieferanten senden Eingangsrechnungen an diese Adresse.
              </p>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              <Globe className="mr-1 inline h-3 w-3" />
              Website
            </label>
            <input
              type="url"
              value={companySettings.website || ''}
              onChange={e => setCompanySettings(prev => ({ ...prev, website: e.target.value }))}
                className="w-full rounded-xl bg-slate-50 px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-500"
              placeholder="www.ihrunternehmen.at"
            />
          </div>

          <h3 className="flex items-center gap-2 pt-4 text-lg font-black text-slate-900">
            <Hash className="h-5 w-5 text-yellow-500" />
            Rechtliche Daten
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                UID-Nummer *
              </label>
              <input
                type="text"
                value={companySettings.uid || ''}
                onChange={e => setCompanySettings(prev => ({ ...prev, uid: e.target.value }))}
                className="w-full rounded-xl bg-slate-50 px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-500"
                placeholder="ATU12345678"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Firmenbuchnummer
              </label>
              <input
                type="text"
                value={companySettings.companyRegisterNumber || ''}
                onChange={e =>
                  setCompanySettings(prev => ({ ...prev, companyRegisterNumber: e.target.value }))
                }
                className="w-full rounded-xl bg-slate-50 px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-500"
                placeholder="FN 123456a"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Handelsgericht
            </label>
            <input
              type="text"
              value={companySettings.court || ''}
              onChange={e => setCompanySettings(prev => ({ ...prev, court: e.target.value }))}
                className="w-full rounded-xl bg-slate-50 px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-500"
              placeholder="Handelsgericht Wien"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t border-slate-200 pt-6">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-yellow-500 to-yellow-600 px-8 py-4 font-bold text-blue-900 shadow-lg transition-all hover:from-yellow-600 hover:to-yellow-700 disabled:opacity-50"
          >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Firmendaten speichern
        </button>
      </div>
    </div>
  )
}
