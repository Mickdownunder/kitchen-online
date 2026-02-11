'use client'

import React, { useState } from 'react'
import { DeliveryNote, CustomerProject } from '@/types'
import { matchDeliveryNoteToProject, createGoodsReceipt } from '@/lib/supabase/services'
import { logger } from '@/lib/utils/logger'
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Package,
  Calendar,
  FileText,
  Sparkles,
  Trash2,
} from 'lucide-react'

interface DeliveryNoteDetailProps {
  deliveryNote: DeliveryNote
  projects: CustomerProject[]
  onBack: () => void
  onUpdate: () => void
}

export default function DeliveryNoteDetail({
  deliveryNote,
  projects,
  onBack,
  onUpdate,
}: DeliveryNoteDetailProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    deliveryNote.matchedProjectId || ''
  )
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const matchedProject = deliveryNote.matchedProjectId
    ? projects.find(p => p.id === deliveryNote.matchedProjectId)
    : null

  const handleDelete = async () => {
    if (
      !confirm(
        'Möchten Sie diesen Lieferschein wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.'
      )
    ) {
      return
    }

    try {
      setDeleting(true)
      const response = await fetch(
        `/api/delivery-notes/delete?id=${deliveryNote.id}&type=supplier`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Fehler beim Löschen')
      }

      alert('Lieferschein erfolgreich gelöscht')
      onUpdate()
      onBack()
    } catch (error: unknown) {
      logger.error('Error deleting delivery note', { component: 'DeliveryNoteDetail' }, error instanceof Error ? error : new Error(String(error)))
      alert(`Fehler beim Löschen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    } finally {
      setDeleting(false)
    }
  }

  const handleMatchProject = async () => {
    if (!selectedProjectId) return

    try {
      setLoading(true)
      const matchResult = await matchDeliveryNoteToProject(deliveryNote.id, selectedProjectId)
      if (!matchResult.ok) {
        throw new Error(matchResult.message)
      }
      onUpdate()
      onBack()
    } catch (error) {
      logger.error('Error matching project', { component: 'DeliveryNoteDetail' }, error instanceof Error ? error : new Error(String(error)))
      alert('Fehler beim Zuordnen des Projekts')
    } finally {
      setLoading(false)
    }
  }

  const handleBookGoodsReceipt = async () => {
    if (!deliveryNote.matchedProjectId || !deliveryNote.items) return

    try {
      setLoading(true)

      const goodsReceiptItems = deliveryNote.items
        .filter(item => item.matchedProjectItemId)
        .map(item => ({
          projectItemId: item.matchedProjectItemId!,
          deliveryNoteItemId: item.id,
          quantityReceived: item.quantityReceived,
          quantityExpected: item.quantityOrdered,
          status: 'received' as const,
        }))

      const receiptResult = await createGoodsReceipt({
        projectId: deliveryNote.matchedProjectId,
        deliveryNoteId: deliveryNote.id,
        receiptDate: new Date().toISOString(),
        receiptType:
          goodsReceiptItems.length === deliveryNote.items.length ? 'complete' : 'partial',
        status: 'booked',
        items: goodsReceiptItems,
      })
      if (!receiptResult.ok) {
        throw new Error(receiptResult.message)
      }

      alert('Wareneingang erfolgreich gebucht!')
      onUpdate()
      onBack()
    } catch (error) {
      logger.error('Error booking goods receipt', { component: 'DeliveryNoteDetail' }, error instanceof Error ? error : new Error(String(error)))
      alert('Fehler beim Buchen des Wareneingangs')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="rounded-lg p-2 transition-colors hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-black text-slate-900">Lieferschein Details</h1>
          <p className="mt-1 text-sm text-slate-500">{deliveryNote.supplierName}</p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-red-600 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {deleting ? 'Lösche...' : 'Löschen'}
        </button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-2 flex items-center gap-3">
            <FileText className="h-5 w-5 text-slate-400" />
            <span className="text-sm font-bold uppercase text-slate-500">Lieferschein-Nr.</span>
          </div>
          <p className="text-xl font-black text-slate-900">
            {deliveryNote.supplierDeliveryNoteNumber}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-2 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-slate-400" />
            <span className="text-sm font-bold uppercase text-slate-500">Lieferdatum</span>
          </div>
          <p className="text-xl font-black text-slate-900">
            {new Date(deliveryNote.deliveryDate).toLocaleDateString('de-DE')}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-2 flex items-center gap-3">
            {deliveryNote.aiMatched ? (
              <Sparkles className="h-5 w-5 text-purple-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-slate-400" />
            )}
            <span className="text-sm font-bold uppercase text-slate-500">KI-Match</span>
          </div>
          <p className="text-xl font-black text-slate-900">
            {deliveryNote.aiMatched
              ? `${Math.round((deliveryNote.aiConfidence || 0) * 100)}%`
              : 'Nicht zugeordnet'}
          </p>
        </div>
      </div>

      {/* Project Assignment */}
      {!matchedProject && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-black text-slate-900">Auftrag zuordnen</h2>
          <div className="flex gap-4">
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Auftrag auswählen...</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.orderNumber} - {project.customerName}
                </option>
              ))}
            </select>
            <button
              onClick={handleMatchProject}
              disabled={!selectedProjectId || loading}
              className="rounded-xl bg-amber-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-900 transition-all hover:bg-amber-600 disabled:opacity-50"
            >
              Zuordnen
            </button>
          </div>
        </div>
      )}

      {/* Matched Project Info */}
      {matchedProject && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
          <div className="mb-3 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-black text-slate-900">Zugeordneter Auftrag</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-bold text-slate-600">Auftrag:</span>{' '}
              {matchedProject.orderNumber}
            </div>
            <div>
              <span className="font-bold text-slate-600">Kunde:</span> {matchedProject.customerName}
            </div>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-black text-slate-900">Positionen</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {deliveryNote.items && deliveryNote.items.length > 0 ? (
            deliveryNote.items.map((item, index) => {
              const projectItem =
                item.matchedProjectItemId && matchedProject
                  ? matchedProject.items.find(i => i.id === item.matchedProjectItemId)
                  : null

              return (
                <div key={item.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                          Pos. {item.positionNumber || index + 1}
                        </span>
                        {item.aiMatched && (
                          <span className="rounded bg-purple-100 px-2 py-1 text-xs font-bold text-purple-700">
                            KI: {Math.round((item.aiConfidence || 0) * 100)}%
                          </span>
                        )}
                        {projectItem && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      </div>
                      <h3 className="mb-1 font-black text-slate-900 whitespace-pre-line">{item.description}</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 md:grid-cols-4">
                        {item.modelNumber && (
                          <div>
                            <span className="font-bold">Modell:</span> {item.modelNumber}
                          </div>
                        )}
                        {item.manufacturer && (
                          <div>
                            <span className="font-bold">Hersteller:</span> {item.manufacturer}
                          </div>
                        )}
                        <div>
                          <span className="font-bold">Bestellt:</span> {item.quantityOrdered}{' '}
                          {item.unit}
                        </div>
                        <div>
                          <span className="font-bold">Geliefert:</span> {item.quantityReceived}{' '}
                          {item.unit}
                        </div>
                      </div>
                      {projectItem && (
                        <div className="mt-2 text-sm text-blue-600">
                          ✓ Zugeordnet zu: {projectItem.description} (Auftrag:{' '}
                          {matchedProject?.orderNumber})
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="p-12 text-center text-slate-500">Keine Positionen gefunden</div>
          )}
        </div>
      </div>

      {/* Actions */}
      {matchedProject &&
        deliveryNote.items &&
        deliveryNote.items.some(item => item.matchedProjectItemId) && (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-black text-slate-900">Wareneingang buchen</h2>
            <p className="mb-4 text-sm text-slate-600">
              Alle zugeordneten Positionen werden als Wareneingang gebucht und der Auftrag-Status
              wird aktualisiert.
            </p>
            <button
              onClick={handleBookGoodsReceipt}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-green-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-green-600 disabled:opacity-50"
            >
              <Package className="h-4 w-4" />
              Wareneingang buchen
            </button>
          </div>
        )}
    </div>
  )
}
