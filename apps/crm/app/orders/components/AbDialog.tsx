'use client'

import React, { useEffect, useState } from 'react'
import { FileText, Loader2, Sparkles } from 'lucide-react'
import { captureSupplierOrderAB } from '@/lib/supabase/services'
import { normalizeConfidence, shouldAutoApplyField } from '@/lib/orders/documentAnalysisConfidence'
import { useToast } from '@/components/providers/ToastProvider'
import { analyzeSupplierOrderDocument, uploadSupplierOrderDocument } from '../orderDocumentApi'
import { confidenceClass, formatConfidence } from '../orderUtils'
import type { OrderWorkflowRow } from '../types'
import { ModalShell } from './ModalShell'

interface AbDialogProps {
  open: boolean
  row: OrderWorkflowRow | null
  onClose: () => void
  onSaved: () => Promise<void>
}

function normalizeDateInput(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  const dotDate = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(trimmed)
  if (dotDate) {
    const day = dotDate[1].padStart(2, '0')
    const month = dotDate[2].padStart(2, '0')
    const year = dotDate[3]
    return `${year}-${month}-${day}`
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString().slice(0, 10)
}

export function AbDialog({ open, row, onClose, onSaved }: AbDialogProps) {
  const { success: showSuccess, warning: showWarning } = useToast()

  const [abNumber, setAbNumber] = useState('')
  const [abConfirmedDate, setAbConfirmedDate] = useState('')
  const [abDeviation, setAbDeviation] = useState('')
  const [abNotes, setAbNotes] = useState('')
  const [abFile, setAbFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aiInfo, setAiInfo] = useState<string | null>(null)
  const [aiConfidence, setAiConfidence] = useState<number>(0)
  const [aiWarnings, setAiWarnings] = useState<string[]>([])
  const [busyState, setBusyState] = useState<'analyze' | 'submit' | null>(null)

  useEffect(() => {
    if (!open || !row) {
      return
    }

    setAbNumber(row.abNumber || '')
    setAbConfirmedDate(row.abConfirmedDeliveryDate || '')
    setAbDeviation('')
    setAbNotes('')
    setAbFile(null)
    setError(null)
    setAiInfo(null)
    setAiConfidence(0)
    setAiWarnings([])
    setBusyState(null)
  }, [open, row])

  if (!open || !row || !row.orderId) {
    return null
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="AB erfassen"
      description={`${row.supplierName} · Auftrag #${row.projectOrderNumber}`}
      maxWidthClassName="max-w-5xl"
    >
      <div className="mt-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">AB-Daten</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                AB-Nummer
                <input
                  value={abNumber}
                  onChange={(event) => setAbNumber(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-semibold text-slate-900 outline-none transition-colors focus:border-slate-400"
                />
              </label>
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                bestätigter Liefertermin
                <input
                  type="date"
                  value={abConfirmedDate}
                  onChange={(event) => setAbConfirmedDate(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-semibold text-slate-900 outline-none transition-colors focus:border-slate-400"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500">
              <FileText className="h-3.5 w-3.5" /> AB-Dokument (optional)
            </p>
            <label className="mt-3 block">
              <input
                type="file"
                onChange={(event) => {
                  setAbFile(event.target.files?.[0] || null)
                  setAiInfo(null)
                  setAiConfidence(0)
                  setAiWarnings([])
                  setError(null)
                }}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              />
            </label>
            <button
              type="button"
              onClick={async () => {
                if (!abFile) {
                  return
                }

                setBusyState('analyze')
                setError(null)
                setAiInfo(null)
                setAiConfidence(0)
                setAiWarnings([])

                try {
                  const analysis = await analyzeSupplierOrderDocument(row.orderId!, 'ab', abFile)
                  if (analysis.kind !== 'ab') {
                    throw new Error('Falsche Analyse-Antwort für AB-Dokument.')
                  }

                  const reviewHints: string[] = []
                  let appliedCount = 0

                  if (analysis.abNumber) {
                    if (shouldAutoApplyField(analysis.abNumberConfidence ?? 0, 0.55) || abNumber.trim().length === 0) {
                      setAbNumber(analysis.abNumber)
                      appliedCount += 1
                    } else {
                      reviewHints.push('AB-Nummer: niedrige Sicherheit')
                    }
                  }

                  if (analysis.confirmedDeliveryDate) {
                    if (
                      shouldAutoApplyField(analysis.confirmedDeliveryDateConfidence ?? 0, 0.55) ||
                      abConfirmedDate.trim().length === 0
                    ) {
                      setAbConfirmedDate(analysis.confirmedDeliveryDate)
                      appliedCount += 1
                    } else {
                      reviewHints.push('Liefertermin: niedrige Sicherheit')
                    }
                  }

                  if (analysis.deviationSummary) {
                    if (
                      shouldAutoApplyField(analysis.deviationSummaryConfidence ?? 0, 0.5) ||
                      abDeviation.trim().length === 0
                    ) {
                      setAbDeviation(analysis.deviationSummary)
                      appliedCount += 1
                    } else {
                      reviewHints.push('Abweichungen: niedrige Sicherheit')
                    }
                  }

                  if (analysis.notes) {
                    if (shouldAutoApplyField(analysis.notesConfidence ?? 0, 0.45) || abNotes.trim().length === 0) {
                      setAbNotes(analysis.notes)
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
                    analysisError instanceof Error ? analysisError.message : 'AB-Dokument konnte nicht analysiert werden.'
                  setError(message)
                } finally {
                  setBusyState(null)
                }
              }}
              disabled={!abFile || busyState !== null}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyState === 'analyze' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Mit KI aus Dokument auslesen
            </button>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="block rounded-2xl border border-slate-200 bg-white p-4 text-xs font-black uppercase tracking-widest text-slate-500">
            Abweichungen
            <textarea
              value={abDeviation}
              onChange={(event) => setAbDeviation(event.target.value)}
              rows={6}
              placeholder="z. B. Mengenabweichung Position 4"
              className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-base font-medium normal-case tracking-normal text-slate-900 outline-none focus:border-slate-400"
            />
          </label>

          <label className="block rounded-2xl border border-slate-200 bg-white p-4 text-xs font-black uppercase tracking-widest text-slate-500">
            Notiz
            <textarea
              value={abNotes}
              onChange={(event) => setAbNotes(event.target.value)}
              rows={6}
              className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-base font-medium normal-case tracking-normal text-slate-900 outline-none focus:border-slate-400"
            />
          </label>
        </div>

        {aiInfo && (
          <p className={`rounded-xl border px-3 py-2 text-sm font-semibold ${confidenceClass(aiConfidence)} border-current/20 bg-white`}>
            {aiInfo}
          </p>
        )}

        {aiWarnings.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-amber-900">KI-Prüfhinweise</p>
            <ul className="mt-2 space-y-1 text-sm text-amber-900">
              {aiWarnings.map((warning, index) => (
                <li key={`${warning}-${index}`}>- {warning}</li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={busyState !== null}
          className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={async () => {
            if (!abNumber.trim()) {
              setError('AB-Nummer ist erforderlich.')
              return
            }

            const normalizedDate = normalizeDateInput(abConfirmedDate)
            if (abConfirmedDate.trim().length > 0 && !normalizedDate) {
              setError('Bitte einen gültigen bestätigten Liefertermin im Format TT.MM.JJJJ oder JJJJ-MM-TT eingeben.')
              return
            }

            setBusyState('submit')
            setError(null)

            try {
              const deviations = abDeviation.trim() ? [{ field: 'general', note: abDeviation.trim() }] : []

              const captureResult = await captureSupplierOrderAB(row.orderId!, {
                abNumber: abNumber.trim(),
                confirmedDeliveryDate: normalizedDate || undefined,
                deviations,
                notes: abNotes.trim() || undefined,
              })

              if (!captureResult.ok) {
                throw new Error(captureResult.message || 'AB konnte nicht gespeichert werden.')
              }

              let uploadWarning: string | null = null
              if (abFile) {
                try {
                  await uploadSupplierOrderDocument(row.orderId!, 'ab', abFile)
                } catch (uploadError) {
                  const message =
                    uploadError instanceof Error
                      ? uploadError.message
                      : 'Dokument konnte nicht hochgeladen werden.'
                  uploadWarning =
                    `AB wurde gespeichert, aber das Dokument konnte nicht hochgeladen werden: ${message}`
                }
              }

              await onSaved()
              onClose()

              if (uploadWarning) {
                showWarning(uploadWarning, 9000)
              } else {
                showSuccess('AB wurde gespeichert.')
              }
            } catch (submitError) {
              const message = submitError instanceof Error ? submitError.message : 'AB konnte nicht gespeichert werden.'
              setError(message)
            } finally {
              setBusyState(null)
            }
          }}
          disabled={busyState !== null}
          className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-orange-700 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busyState === 'submit' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Speichern
        </button>
      </div>
    </ModalShell>
  )
}
