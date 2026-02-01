'use client'

import React from 'react'
import { X, Download, ExternalLink, Truck, Trash2 } from 'lucide-react'
import { CustomerDeliveryNote, CustomerProject, CompanySettings, ProjectStatus } from '@/types'
import { getCompanySettings } from '@/lib/supabase/services'
// PDF function is dynamically imported when needed to reduce initial bundle size
import { useRouter } from 'next/navigation'

interface CustomerDeliveryNoteViewModalProps {
  note: CustomerDeliveryNote
  project?: CustomerProject | null
  projectId?: string
  onClose: () => void
  onUpdate?: () => void
}

export default function CustomerDeliveryNoteViewModal({
  note,
  project,
  projectId,
  onClose,
  onUpdate,
}: CustomerDeliveryNoteViewModalProps) {
  const router = useRouter()
  const [companySettings, setCompanySettings] = React.useState<CompanySettings | null>(null)
  const [loadingPdf, setLoadingPdf] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  React.useEffect(() => {
    ;(async () => {
      try {
        const settings = await getCompanySettings()
        setCompanySettings(settings)
      } catch (e) {
        console.error('Error loading company settings:', e)
      }
    })()
  }, [])

  const handleDelete = async () => {
    if (
      !confirm(
        'Möchten Sie diesen Kunden-Lieferschein wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.'
      )
    ) {
      return
    }

    try {
      setDeleting(true)
      const response = await fetch(`/api/delivery-notes/delete?id=${note.id}&type=customer`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Fehler beim Löschen')
      }

      alert('Kunden-Lieferschein erfolgreich gelöscht')
      onClose()
      // Update the list via callback if provided, otherwise refresh page
      if (onUpdate) {
        onUpdate()
      } else {
        router.refresh()
      }
    } catch (error: unknown) {
      console.error('Error deleting customer delivery note:', error)
      alert(`Fehler beim Löschen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    } finally {
      setDeleting(false)
    }
  }

  const handleOpenProject = () => {
    const pid = projectId || note.projectId
    if (!pid) return
    router.push(`/projects?projectId=${pid}`)
  }

  const displayCustomerName = project?.customerName || 'Kunde'
  const displayOrderNumber = project?.orderNumber || ''
  const displayItems =
    note.items && note.items.length > 0
      ? note.items
      : (project?.items || []).map(it => ({
          position: it.position,
          description: it.description,
          quantity: it.quantity || 1,
          unit: it.unit || 'Stk',
        }))

  const handleDownloadPdf = async () => {
    setLoadingPdf(true)
    try {
      const pseudoProject: CustomerProject =
        project ||
        ({
          id: projectId || note.projectId || '',
          customerName: displayCustomerName,
          orderNumber: displayOrderNumber,
          items: [],
          totalAmount: 0,
          netAmount: 0,
          taxAmount: 0,
          depositAmount: 0,
          isDepositPaid: false,
          isFinalPaid: false,
          status: ProjectStatus.PLANNING,
          isMeasured: false,
          isOrdered: false,
          isInstallationAssigned: false,
          documents: [],
          complaints: [],
          notes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as CustomerProject)

      // ensure items are present for PDF
      const noteForPdf: CustomerDeliveryNote = {
        ...note,
        items: displayItems,
      }

      // Dynamic import to reduce initial bundle size
      const { downloadCustomerDeliveryNotePDF } = await import('./CustomerDeliveryNotePDF')
      await downloadCustomerDeliveryNotePDF(noteForPdf, pseudoProject, companySettings)
    } catch (e) {
      console.error('Error generating customer delivery note PDF:', e)
      alert('Fehler beim Generieren des PDFs')
    } finally {
      setLoadingPdf(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-blue-200 bg-blue-100 p-2 text-blue-700">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Kunden-Lieferschein</h2>
              <p className="mt-1 text-sm text-slate-600">
                {displayCustomerName}
                {displayOrderNumber ? ` · Auftrag ${displayOrderNumber}` : ''} ·{' '}
                {note.deliveryNoteNumber} ·{' '}
                {new Date(note.deliveryDate).toLocaleDateString('de-DE')} · Status: {note.status}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Lösche...' : 'Löschen'}
            </button>
            <button onClick={onClose} className="rounded-xl p-2 transition-all hover:bg-slate-100">
              <X className="h-5 w-5 text-slate-600" />
            </button>
          </div>
        </div>

        <div className="space-y-6 p-8">
          {note.deliveryAddress && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                Lieferadresse
              </div>
              <div className="mt-2 whitespace-pre-line text-sm font-bold text-slate-900">
                {note.deliveryAddress}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-xs font-black uppercase tracking-widest text-slate-500">
              Positionen
            </div>
            {displayItems && displayItems.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
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
                    {displayItems.map((it, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-2 text-slate-700">{it.position}</td>
                        <td className="py-2 text-slate-700">{it.description}</td>
                        <td className="py-2 text-right text-slate-700">{it.quantity}</td>
                        <td className="py-2 text-center text-slate-700">{it.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-2 text-sm text-slate-500">
                Keine Positionen gespeichert (Hinweis: bei älteren Lieferscheinen ohne `items` wird
                das nach dem nächsten Speichern automatisch gefüllt).
              </div>
            )}
          </div>

          <div className="flex flex-col justify-end gap-3 pt-2 sm:flex-row">
            <button
              onClick={handleOpenProject}
              className="flex items-center gap-2 rounded-xl bg-slate-100 px-5 py-2 text-xs font-black uppercase tracking-widest text-slate-900 transition-all hover:bg-slate-200"
            >
              <ExternalLink className="h-4 w-4" />
              Auftrag öffnen
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={loadingPdf}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-blue-700 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {loadingPdf ? 'Erstelle PDF…' : 'PDF Download'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
