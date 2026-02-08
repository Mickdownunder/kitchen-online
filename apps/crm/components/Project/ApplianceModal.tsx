'use client'

import { useState, useEffect } from 'react'
import { X, Package, Shield, Phone, Mail, ExternalLink, Calendar, Trash2, AlertTriangle } from 'lucide-react'
import { InvoiceItem } from '@/types'
import { logger } from '@/lib/utils/logger'

interface ApplianceModalProps {
  item: InvoiceItem
  isOpen: boolean
  onClose: () => void
  onSave: (updates: Partial<InvoiceItem>) => void
  projectId?: string // For direct database save
}

const APPLIANCE_CATEGORIES = [
  'Backofen',
  'Kochfeld',
  'Geschirrspüler',
  'Kühlschrank',
  'Gefrierschrank',
  'Kühl-Gefrier-Kombi',
  'Dunstabzug',
  'Mikrowelle',
  'Kaffeevollautomat',
  'Wärmeschublade',
  'Weinkühlschrank',
  'Waschmaschine',
  'Trockner',
  'Spüle',
  'Armatur',
  'Sonstiges',
]

export function ApplianceModal({ item, isOpen, onClose, onSave }: ApplianceModalProps) {
  // Calculate warranty years from warrantyUntil and installationDate
  const getWarrantyYears = (): string => {
    if (!item.warrantyUntil || !item.installationDate) return ''
    try {
      const start = new Date(item.installationDate)
      const end = new Date(item.warrantyUntil)
      const years = Math.round((end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      if (years >= 1 && years <= 5) return years.toString()
      return ''
    } catch {
      return ''
    }
  }

  const [formData, setFormData] = useState({
    showInPortal: item.showInPortal || false,
    manufacturer: item.manufacturer || '',
    modelNumber: item.modelNumber || '',
    serialNumber: item.serialNumber || '',
    installationDate: item.installationDate || '',
    warrantyYears: getWarrantyYears(),
    applianceCategory: item.applianceCategory || '',
    manufacturerSupportPhone: item.manufacturerSupportPhone || '',
    manufacturerSupportEmail: item.manufacturerSupportEmail || '',
    manufacturerSupportUrl: item.manufacturerSupportUrl || '',
  })
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Reset form when item changes
  useEffect(() => {
    setFormData({
      showInPortal: item.showInPortal || false,
      manufacturer: item.manufacturer || '',
      modelNumber: item.modelNumber || '',
      serialNumber: item.serialNumber || '',
      installationDate: item.installationDate || '',
      warrantyYears: getWarrantyYears(),
      applianceCategory: item.applianceCategory || '',
      manufacturerSupportPhone: item.manufacturerSupportPhone || '',
      manufacturerSupportEmail: item.manufacturerSupportEmail || '',
      manufacturerSupportUrl: item.manufacturerSupportUrl || '',
    })
    setShowDeleteConfirm(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item])

  // Remove from portal - clears all appliance data
  const handleRemoveFromPortal = async () => {
    const updates = {
      showInPortal: false,
      serialNumber: undefined,
      installationDate: undefined,
      warrantyUntil: undefined,
      applianceCategory: undefined,
      manufacturerSupportPhone: undefined,
      manufacturerSupportEmail: undefined,
      manufacturerSupportUrl: undefined,
    }

    // Save directly to database if we have the item ID
    if (item.id && !item.id.startsWith('new-')) {
      setSaving(true)
      try {
        const response = await fetch(`/api/invoice-items/${item.id}/appliance`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
        
        if (!response.ok) {
          throw new Error('Löschen fehlgeschlagen')
        }
      } catch (error) {
        logger.error('Error removing appliance data', { component: 'ApplianceModal' }, error instanceof Error ? error : new Error(String(error)))
        alert('Fehler beim Entfernen. Bitte versuchen Sie es erneut.')
        setSaving(false)
        return
      }
      setSaving(false)
    }

    onSave(updates)
    onClose()
  }

  const handleSave = async () => {
    // Calculate warrantyUntil from installationDate + warrantyYears
    let warrantyUntil: string | undefined = undefined
    if (formData.installationDate && formData.warrantyYears) {
      const startDate = new Date(formData.installationDate)
      startDate.setFullYear(startDate.getFullYear() + parseInt(formData.warrantyYears))
      warrantyUntil = startDate.toISOString().split('T')[0]
    }

    const updates = {
      showInPortal: formData.showInPortal,
      manufacturer: formData.manufacturer || undefined,
      modelNumber: formData.modelNumber || undefined,
      serialNumber: formData.serialNumber || undefined,
      installationDate: formData.installationDate || undefined,
      warrantyUntil,
      applianceCategory: formData.applianceCategory || undefined,
      manufacturerSupportPhone: formData.manufacturerSupportPhone || undefined,
      manufacturerSupportEmail: formData.manufacturerSupportEmail || undefined,
      manufacturerSupportUrl: formData.manufacturerSupportUrl || undefined,
    }

    // Save directly to database if we have the item ID
    if (item.id && !item.id.startsWith('new-')) {
      setSaving(true)
      try {
        const response = await fetch(`/api/invoice-items/${item.id}/appliance`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
        
        if (!response.ok) {
          throw new Error('Speichern fehlgeschlagen')
        }
      } catch (error) {
        logger.error('Error saving appliance data', { component: 'ApplianceModal' }, error instanceof Error ? error : new Error(String(error)))
        alert('Fehler beim Speichern. Bitte versuchen Sie es erneut.')
        setSaving(false)
        return
      }
      setSaving(false)
    }

    // Also update local state
    onSave(updates)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <Package className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Geräte-Einstellungen</h3>
              <p className="text-sm text-slate-500 whitespace-pre-line">{item.description || item.modelNumber || 'Position'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Show in Portal Toggle */}
        <div className="mb-6 rounded-xl bg-amber-50 p-4">
          <label className={`flex items-center gap-3 ${!formData.showInPortal ? 'cursor-pointer' : ''}`}>
            <input
              type="checkbox"
              checked={formData.showInPortal}
              onChange={(e) => {
                // Only allow checking, not unchecking - use red button to remove
                if (e.target.checked) {
                  setFormData({ ...formData, showInPortal: true })
                }
              }}
              disabled={formData.showInPortal}
              className={`h-5 w-5 rounded border-amber-300 text-amber-500 focus:ring-amber-500 ${formData.showInPortal ? 'cursor-not-allowed opacity-60' : ''}`}
            />
            <div>
              <span className="font-semibold text-slate-900">Im Kundenportal anzeigen</span>
              <p className="text-sm text-slate-500">
                {formData.showInPortal 
                  ? 'Zum Entfernen den roten Button unten verwenden' 
                  : 'Dieses Gerät erscheint in der Geräteliste des Kunden'}
              </p>
            </div>
          </label>
        </div>

        {/* Form Fields - only shown if showInPortal is true */}
        {formData.showInPortal && (
          <div className="space-y-4">
            {/* Manufacturer & Model */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Hersteller *
                </label>
                <input
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="z.B. Bosch, Siemens, Miele"
                  className="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Modell *
                </label>
                <input
                  type="text"
                  value={formData.modelNumber}
                  onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                  placeholder="z.B. Serie 8 HBG675BS1"
                  className="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Gerätekategorie *
              </label>
              <select
                value={formData.applianceCategory}
                onChange={(e) => setFormData({ ...formData, applianceCategory: e.target.value })}
                className="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-slate-900 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="">Kategorie wählen...</option>
                {APPLIANCE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Serial Number & Installation Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <span>E-Nummer / Seriennummer</span>
                </label>
                <input
                  type="text"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  placeholder="z.B. 12345678"
                  className="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 font-mono text-slate-900 placeholder:text-slate-400 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>Garantiebeginn</span>
                </label>
                <input
                  type="date"
                  value={formData.installationDate}
                  onChange={(e) => setFormData({ ...formData, installationDate: e.target.value })}
                  className="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-slate-900 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
                <p className="mt-1 text-xs text-slate-400">Datum der Schlussrechnung / Installation</p>
              </div>
            </div>

            {/* Warranty Duration */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Shield className="h-4 w-4 text-slate-400" />
                <span>Garantiedauer</span>
              </label>
              <select
                value={formData.warrantyYears}
                onChange={(e) => setFormData({ ...formData, warrantyYears: e.target.value })}
                className="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-slate-900 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="">Keine Garantie</option>
                <option value="1">1 Jahr</option>
                <option value="2">2 Jahre</option>
                <option value="3">3 Jahre</option>
                <option value="4">4 Jahre</option>
                <option value="5">5 Jahre</option>
              </select>
              {formData.installationDate && formData.warrantyYears && (
                <p className="mt-2 text-xs text-slate-500">
                  Garantie bis: {(() => {
                    const date = new Date(formData.installationDate)
                    date.setFullYear(date.getFullYear() + parseInt(formData.warrantyYears))
                    return date.toLocaleDateString('de-DE')
                  })()}
                </p>
              )}
            </div>

            {/* Manufacturer Support */}
            <div className="border-t border-slate-200 pt-4">
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Hersteller-Support (optional)</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    value={formData.manufacturerSupportPhone}
                    onChange={(e) => setFormData({ ...formData, manufacturerSupportPhone: e.target.value })}
                    placeholder="Support-Telefon"
                    className="flex-1 rounded-xl border-0 bg-slate-100 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={formData.manufacturerSupportEmail}
                    onChange={(e) => setFormData({ ...formData, manufacturerSupportEmail: e.target.value })}
                    placeholder="Support-E-Mail"
                    className="flex-1 rounded-xl border-0 bg-slate-100 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <ExternalLink className="h-4 w-4 text-slate-400" />
                  <input
                    type="url"
                    value={formData.manufacturerSupportUrl}
                    onChange={(e) => setFormData({ ...formData, manufacturerSupportUrl: e.target.value })}
                    placeholder="Support-Website"
                    className="flex-1 rounded-xl border-0 bg-slate-100 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-red-900">Gerät aus Portal entfernen?</h4>
                <p className="mt-1 text-sm text-red-700">
                  Alle Garantie- und Gerätedaten werden gelöscht. Der Kunde sieht dieses Gerät nicht mehr im Portal.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleRemoveFromPortal}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                  >
                    Ja, entfernen
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-between">
          {/* Remove button - show if checkbox is checked (current or saved) */}
          {formData.showInPortal && !showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Aus Portal entfernen
            </button>
          ) : (
            <div />
          )}
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-600 hover:shadow-xl hover:shadow-amber-500/30 disabled:opacity-50"
            >
              {saving ? 'Speichert...' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
