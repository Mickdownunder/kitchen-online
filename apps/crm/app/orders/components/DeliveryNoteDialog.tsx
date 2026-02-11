'use client'

import React, { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createDeliveryNote, linkSupplierDeliveryNoteToOrder } from '@/lib/supabase/services'
import { normalizeConfidence, shouldAutoApplyField } from '@/lib/orders/documentAnalysisConfidence'
import { analyzeSupplierOrderDocument, uploadSupplierOrderDocument } from '../orderDocumentApi'
import { confidenceClass, formatConfidence } from '../orderUtils'
import type { OrderWorkflowRow } from '../types'
import { ModalShell } from './ModalShell'

interface DeliveryNoteDialogProps {
  open: boolean
  row: OrderWorkflowRow | null
  onClose: () => void
  onSaved: () => Promise<void>
}

export function DeliveryNoteDialog({ open, row, onClose, onSaved }: DeliveryNoteDialogProps) {
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState('')
  const [deliveryNoteDate, setDeliveryNoteDate] = useState('')
  const [deliveryNoteNotes, setDeliveryNoteNotes] = useState('')
  const [deliveryNoteFile, setDeliveryNoteFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aiInfo, setAiInfo] = useState<string | null>(null)
  const [aiConfidence, setAiConfidence] = useState<number>(0)
  const [aiWarnings, setAiWarnings] = useState<string[]>([])
  const [busyState, setBusyState] = useState<'analyze' | 'submit' | null>(null)

  useEffect(() => {
    if (!open || !row) {
      return
    }

    setDeliveryNoteNumber('')
    setDeliveryNoteDate(new Date().toISOString().slice(0, 10))
    setDeliveryNoteNotes('')
    setDeliveryNoteFile(null)
    setError(null)
    setAiInfo(null)
    setAiConfidence(0)
    setAiWarnings([])
    setBusyState(null)
  }, [open, row])

  if (!open || !row || row.kind !== 'supplier' || !row.orderId) {
    return null
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Lieferanten-Lieferschein erfassen"
      description={`${row.supplierName} · Auftrag #${row.projectOrderNumber}`}
      maxWidthClassName="max-w-xl"
    >
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs font-black uppercase tracking-widest text-slate-500">
          Lieferscheinnummer
          <input
            value={deliveryNoteNumber}
            onChange={(event) => setDeliveryNoteNumber(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-400"
          />
        </label>
        <label className="text-xs font-black uppercase tracking-widest text-slate-500">
          Lieferscheindatum
          <input
            type="date"
            value={deliveryNoteDate}
            onChange={(event) => setDeliveryNoteDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-400"
          />
        </label>
      </div>

      <label className="mt-3 block text-xs font-black uppercase tracking-widest text-slate-500">
        Notiz
        <textarea
          value={deliveryNoteNotes}
          onChange={(event) => setDeliveryNoteNotes(event.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-400"
        />
      </label>

      <label className="mt-3 block text-xs font-black uppercase tracking-widest text-slate-500">
        Lieferschein-Dokument (optional)
        <input
          type="file"
          onChange={(event) => {
            setDeliveryNoteFile(event.target.files?.[0] || null)
            setAiInfo(null)
            setAiConfidence(0)
            setAiWarnings([])
          }}
          className="mt-1 block w-full text-sm text-slate-700"
        />
      </label>

      <div className="mt-2">
        <button
          type="button"
          onClick={async () => {
            if (!deliveryNoteFile) {
              return
            }

            setBusyState('analyze')
            setError(null)
            setAiInfo(null)
            setAiConfidence(0)
            setAiWarnings([])

            try {
              const analysis = await analyzeSupplierOrderDocument(row.orderId!, 'supplier_delivery_note', deliveryNoteFile)
              if (analysis.kind !== 'supplier_delivery_note') {
                throw new Error('Falsche Analyse-Antwort für Lieferschein-Dokument.')
              }

              const reviewHints: string[] = []
              let appliedCount = 0

              if (analysis.deliveryNoteNumber) {
                if (
                  shouldAutoApplyField(analysis.deliveryNoteNumberConfidence ?? 0, 0.55) ||
                  deliveryNoteNumber.trim().length === 0
                ) {
                  setDeliveryNoteNumber(analysis.deliveryNoteNumber)
                  appliedCount += 1
                } else {
                  reviewHints.push('Lieferscheinnummer: niedrige Sicherheit')
                }
              }

              if (analysis.deliveryDate) {
                if (
                  shouldAutoApplyField(analysis.deliveryDateConfidence ?? 0, 0.55) ||
                  deliveryNoteDate.trim().length === 0
                ) {
                  setDeliveryNoteDate(analysis.deliveryDate)
                  appliedCount += 1
                } else {
                  reviewHints.push('Lieferscheindatum: niedrige Sicherheit')
                }
              }

              if (analysis.notes) {
                if (shouldAutoApplyField(analysis.notesConfidence ?? 0, 0.45) || deliveryNoteNotes.trim().length === 0) {
                  setDeliveryNoteNotes(analysis.notes)
                  appliedCount += 1
                }
              }

              setAiWarnings([...(analysis.warnings || []), ...reviewHints])
              setAiConfidence(normalizeConfidence(analysis.overallConfidence))
              setAiInfo(
                `KI-Analyse ${formatConfidence(analysis.overallConfidence)} · ${appliedCount} Feld(er) automatisch übernommen.`,
              )
            } catch (analysisError) {
              const message =
                analysisError instanceof Error
                  ? analysisError.message
                  : 'Lieferschein-Dokument konnte nicht analysiert werden.'
              setError(message)
            } finally {
              setBusyState(null)
            }
          }}
          disabled={!deliveryNoteFile || busyState !== null}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busyState === 'analyze' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Mit KI aus Dokument auslesen
        </button>
      </div>

      {aiInfo && <p className={`mt-2 text-xs font-semibold ${confidenceClass(aiConfidence)}`}>{aiInfo}</p>}
      {aiWarnings.length > 0 && (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
          <p className="text-[11px] font-black uppercase tracking-wider text-amber-800">KI-Prüfhinweise</p>
          <ul className="mt-1 space-y-1 text-xs text-amber-900">
            {aiWarnings.map((warning, index) => (
              <li key={`${warning}-${index}`}>- {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={busyState !== null}
          className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={async () => {
            if (!deliveryNoteNumber.trim()) {
              setError('Lieferscheinnummer ist erforderlich.')
              return
            }

            if (!deliveryNoteDate) {
              setError('Lieferscheindatum ist erforderlich.')
              return
            }

            setBusyState('submit')
            setError(null)

            try {
              let documentUrl: string | undefined
              if (deliveryNoteFile) {
                const uploadResult = await uploadSupplierOrderDocument(row.orderId!, 'supplier_delivery_note', deliveryNoteFile)
                documentUrl = uploadResult.storagePath
              }

              const noteResult = await createDeliveryNote({
                supplierName: row.supplierName,
                supplierDeliveryNoteNumber: deliveryNoteNumber.trim(),
                deliveryDate: deliveryNoteDate,
                receivedDate: new Date().toISOString(),
                status: 'matched',
                aiMatched: false,
                matchedProjectId: row.projectId,
                supplierOrderId: row.orderId,
                documentUrl,
                notes: deliveryNoteNotes.trim() || undefined,
              })

              if (!noteResult.ok) {
                throw new Error(noteResult.message || 'Lieferschein konnte nicht erfasst werden.')
              }

              const linkResult = await linkSupplierDeliveryNoteToOrder(row.orderId!, noteResult.data.id)
              if (!linkResult.ok) {
                throw new Error(linkResult.message || 'Lieferschein konnte nicht mit Bestellung verknüpft werden.')
              }

              await onSaved()
              onClose()
            } catch (submitError) {
              const message =
                submitError instanceof Error ? submitError.message : 'Lieferschein konnte nicht erfasst werden.'
              setError(message)
            } finally {
              setBusyState(null)
            }
          }}
          disabled={busyState !== null}
          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busyState === 'submit' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Speichern
        </button>
      </div>
    </ModalShell>
  )
}
