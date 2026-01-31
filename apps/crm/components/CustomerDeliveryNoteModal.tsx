'use client'

import React, { useState } from 'react'
import { X, Download } from 'lucide-react'
import { CustomerProject, CustomerDeliveryNote, CompanySettings } from '@/types'
import {
  createCustomerDeliveryNote,
  updateCustomerDeliveryNote,
  getCompanySettings,
} from '@/lib/supabase/services'
import { downloadCustomerDeliveryNotePDF } from './CustomerDeliveryNotePDF'

interface CustomerDeliveryNoteModalProps {
  project: CustomerProject
  onClose: () => void
  onSuccess?: () => void
  existingDeliveryNote?: CustomerDeliveryNote
}

export default function CustomerDeliveryNoteModal({
  project,
  onClose,
  onSuccess,
  existingDeliveryNote,
}: CustomerDeliveryNoteModalProps) {
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState(
    existingDeliveryNote?.deliveryNoteNumber ||
      `LS-${new Date().getFullYear()}-${project.orderNumber}`
  )
  const [deliveryDate, setDeliveryDate] = useState(
    existingDeliveryNote?.deliveryDate || new Date().toISOString().split('T')[0]
  )
  const [deliveryAddress, setDeliveryAddress] = useState(
    existingDeliveryNote?.deliveryAddress || project.address || ''
  )
  const [saving, setSaving] = useState(false)
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)

  React.useEffect(() => {
    loadCompanySettings()
  }, [])

  const loadCompanySettings = async () => {
    try {
      const settings = await getCompanySettings()
      setCompanySettings(settings)
    } catch (error) {
      console.error('Error loading company settings:', error)
    }
  }

  const handleSave = async () => {
    if (!deliveryNoteNumber || !deliveryDate) {
      alert('Bitte füllen Sie alle Pflichtfelder aus.')
      return
    }

    setSaving(true)
    try {
      const items = (project.items || []).map(item => ({
        position: item.position,
        description: item.description,
        quantity: item.quantity || 1,
        unit: item.unit || 'Stk',
      }))

      if (existingDeliveryNote) {
        await updateCustomerDeliveryNote(existingDeliveryNote.id, {
          deliveryNoteNumber,
          deliveryDate,
          deliveryAddress: deliveryAddress || undefined,
          items,
          status: 'draft', // Bleibt draft bis Lieferdatum erreicht ist
        })
      } else {
        await createCustomerDeliveryNote({
          projectId: project.id,
          deliveryNoteNumber,
          deliveryDate,
          deliveryAddress: deliveryAddress || undefined,
          items,
          status: 'draft', // Bleibt draft bis Lieferdatum erreicht ist
        })
      }

      if (onSuccess) onSuccess()
      onClose()
    } catch (error: unknown) {
      console.error('Error saving delivery note:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
      alert(`Fehler beim Speichern des Lieferscheins: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = async () => {
    if (!existingDeliveryNote) {
      alert('Bitte erstellen Sie zuerst den Lieferschein.')
      return
    }

    try {
      await downloadCustomerDeliveryNotePDF(
        {
          deliveryNoteNumber: existingDeliveryNote.deliveryNoteNumber,
          deliveryDate: existingDeliveryNote.deliveryDate,
          deliveryAddress: existingDeliveryNote.deliveryAddress,
          customerSignature: existingDeliveryNote.customerSignature,
          signedBy: existingDeliveryNote.signedBy,
          customerSignatureDate: existingDeliveryNote.customerSignatureDate,
          items: existingDeliveryNote.items,
        },
        project,
        companySettings
      )
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Fehler beim Generieren des PDFs')
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md">
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-8 py-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Kunden-Lieferschein</h2>
            <p className="mt-1 text-sm text-slate-600">
              Auftrag: {project.orderNumber} • {project.customerName}
            </p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 transition-all hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 p-8">
          <>
            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-600">
                  Lieferschein-Nummer *
                </label>
                <input
                  type="text"
                  value={deliveryNoteNumber}
                  onChange={e => setDeliveryNoteNumber(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500"
                  placeholder="LS-2026-001"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-600">
                  Lieferdatum *
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={e => setDeliveryDate(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-600">
                Lieferadresse
              </label>
              <textarea
                value={deliveryAddress}
                onChange={e => setDeliveryAddress(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500"
                rows={3}
                placeholder={project.address || 'Lieferadresse eingeben...'}
              />
            </div>

            {/* Items Preview */}
            {project.items && project.items.length > 0 && (
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-600">
                  Artikel ({project.items.length})
                </label>
                <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="py-2 text-left text-xs font-black text-slate-600">Pos.</th>
                        <th className="py-2 text-left text-xs font-black text-slate-600">
                          Beschreibung
                        </th>
                        <th className="py-2 text-right text-xs font-black text-slate-600">Menge</th>
                        <th className="py-2 text-center text-xs font-black text-slate-600">
                          Einheit
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="py-2 text-slate-700">{item.position}</td>
                          <td className="py-2 text-slate-700">{item.description}</td>
                          <td className="py-2 text-right text-slate-700">{item.quantity || 1}</td>
                          <td className="py-2 text-center text-slate-700">{item.unit || 'Stk'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>💡 Hinweis:</strong> Lieferscheine können bereits im Voraus erfasst werden
                (z.B. für die Disposition). Der Status wird automatisch auf
                &quot;geliefert&quot; gesetzt, sobald das Lieferdatum erreicht ist. Die
                Unterschrift wird von einer Fremdfirma erfasst.
              </p>
            </div>

            {/* Status Info */}
            {existingDeliveryNote && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Status: {existingDeliveryNote.status}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Lieferdatum:{' '}
                      {new Date(existingDeliveryNote.deliveryDate).toLocaleDateString('de-DE')}
                      {new Date(existingDeliveryNote.deliveryDate) <= new Date() &&
                        existingDeliveryNote.status === 'draft' && (
                          <span className="ml-2 font-bold text-amber-600">
                            (Status wird automatisch auf &apos;geliefert&apos; gesetzt)
                          </span>
                        )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePrint}
                      className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-blue-600"
                    >
                      <Download className="h-4 w-4" />
                      PDF
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                onClick={onClose}
                className="rounded-xl bg-slate-300 px-5 py-2 text-xs font-black uppercase tracking-widest text-slate-900 transition-all hover:bg-slate-400"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-blue-500 px-5 py-2 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-blue-600 disabled:opacity-50"
              >
                {saving ? 'Speichere...' : existingDeliveryNote ? 'Aktualisieren' : 'Erstellen'}
              </button>
            </div>
          </>
        </div>
      </div>
    </div>
  )
}
