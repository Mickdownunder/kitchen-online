'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, RotateCcw, Send, Trash2 } from 'lucide-react'
import { useToast } from '@/components/providers/ToastProvider'
import type { VoiceInboxEntry, VoiceInboxStatus } from '@/types'

type StatusFilter = 'captured' | 'needs_confirmation' | 'executed' | 'failed' | 'all'

interface ApiEnvelope<T> {
  success?: boolean
  data?: T
  error?: string
  execution?: {
    message?: string
  }
}

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'captured', label: 'Captured' },
  { id: 'needs_confirmation', label: 'Needs Confirmation' },
  { id: 'executed', label: 'Executed' },
  { id: 'failed', label: 'Failed' },
  { id: 'all', label: 'Alle' },
]

function statusChip(status: VoiceInboxStatus): string {
  if (status === 'executed') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'needs_confirmation') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (status === 'failed') return 'border-rose-200 bg-rose-50 text-rose-700'
  if (status === 'discarded') return 'border-slate-200 bg-slate-100 text-slate-600'
  if (status === 'parsed') return 'border-blue-200 bg-blue-50 text-blue-700'
  return 'border-slate-200 bg-slate-50 text-slate-700'
}

function formatDateTime(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('de-DE')
}

function safeString(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
}

export default function VoiceInboxView() {
  const { success, error } = useToast()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('needs_confirmation')
  const [entries, setEntries] = useState<VoiceInboxEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editedText, setEditedText] = useState('')
  const [discardReason, setDiscardReason] = useState('')

  const loadEntries = useCallback(async (filter: StatusFilter) => {
    setLoading(true)

    try {
      const statuses = filter === 'all' ? '' : filter
      const url = statuses.length > 0
        ? `/api/voice/inbox?statuses=${encodeURIComponent(statuses)}&limit=150`
        : '/api/voice/inbox?limit=150'

      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      })

      const body = (await response.json().catch(() => ({}))) as ApiEnvelope<VoiceInboxEntry[]>
      if (!response.ok || body.success === false) {
        throw new Error(body.error || 'Voice Inbox konnte nicht geladen werden.')
      }

      const nextEntries = Array.isArray(body.data) ? body.data : []
      setEntries(nextEntries)
      setSelectedId((current) => {
        if (current && nextEntries.some((entry) => entry.id === current)) {
          return current
        }
        return nextEntries[0]?.id || null
      })
    } catch (loadError) {
      error(loadError instanceof Error ? loadError.message : 'Voice Inbox konnte nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [error])

  useEffect(() => {
    void loadEntries(statusFilter)
  }, [loadEntries, statusFilter])

  const selectedEntry = useMemo(() => {
    return entries.find((entry) => entry.id === selectedId) || null
  }, [entries, selectedId])

  useEffect(() => {
    setEditedText(selectedEntry?.inputText || '')
    setDiscardReason(selectedEntry?.needsConfirmationReason || '')
  }, [selectedEntry])

  const counts = useMemo(() => {
    return entries.reduce(
      (accumulator, entry) => {
        accumulator.total += 1
        if (entry.status === 'captured') accumulator.captured += 1
        if (entry.status === 'needs_confirmation') accumulator.needsConfirmation += 1
        if (entry.status === 'executed') accumulator.executed += 1
        if (entry.status === 'failed') accumulator.failed += 1
        return accumulator
      },
      { total: 0, captured: 0, needsConfirmation: 0, executed: 0, failed: 0 },
    )
  }, [entries])

  async function runAction(
    action: 'confirm' | 'retry' | 'discard',
    payload: Record<string, unknown>,
    successMessage: string,
  ) {
    if (!selectedEntry) return

    setActionId(selectedEntry.id)

    try {
      const response = await fetch(`/api/voice/inbox/${selectedEntry.id}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const body = (await response.json().catch(() => ({}))) as ApiEnvelope<VoiceInboxEntry>
      if (!response.ok || body.success === false) {
        throw new Error(body.error || `Voice-Aktion ${action} ist fehlgeschlagen.`)
      }

      success(body.execution?.message || successMessage)
      await loadEntries(statusFilter)
    } catch (actionError) {
      error(actionError instanceof Error ? actionError.message : 'Voice-Aktion fehlgeschlagen.')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Voice Inbox</h1>
          <p className="mt-1 text-sm text-slate-600">
            Persistente Siri/Voice-Eingänge mit Review- und Ausführungsstatus.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void loadEntries(statusFilter)
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Neu laden
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Gesamt</p>
          <p className="text-2xl font-black text-slate-900">{counts.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-600">Captured</p>
          <p className="text-2xl font-black text-slate-800">{counts.captured}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-amber-700">Needs Confirmation</p>
          <p className="text-2xl font-black text-amber-800">{counts.needsConfirmation}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Executed</p>
          <p className="text-2xl font-black text-emerald-800">{counts.executed}</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-rose-700">Failed</p>
          <p className="text-2xl font-black text-rose-800">{counts.failed}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(340px,1fr)_minmax(0,1.3fr)]">
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatusFilter(filter.id)}
                className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest ${
                  statusFilter === filter.id
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Lade Voice Inbox...
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500">
              Keine Einträge für den gewählten Filter.
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedId(entry.id)}
                  className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                    selectedId === entry.id
                      ? 'border-slate-900 bg-slate-100'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-semibold text-slate-900">{entry.inputText}</p>
                    <span className={`rounded-lg border px-2 py-1 text-xs font-bold ${statusChip(entry.status)}`}>
                      {entry.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {formatDateTime(entry.createdAt)} · confidence {entry.confidence?.toFixed(2) || '-'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          {!selectedEntry ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm font-semibold text-slate-500">
              Eintrag auswählen.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-black text-slate-900">Eintrag-Details</h2>
                <span className={`rounded-lg border px-2 py-1 text-xs font-bold ${statusChip(selectedEntry.status)}`}>
                  {selectedEntry.status}
                </span>
              </div>

              <div className="grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                <div>
                  <p className="font-bold uppercase tracking-wider text-slate-500">ID</p>
                  <p className="break-all">{selectedEntry.id}</p>
                </div>
                <div>
                  <p className="font-bold uppercase tracking-wider text-slate-500">Erfasst</p>
                  <p>{formatDateTime(selectedEntry.createdAt)}</p>
                </div>
                <div>
                  <p className="font-bold uppercase tracking-wider text-slate-500">Quelle</p>
                  <p>{selectedEntry.source}</p>
                </div>
                <div>
                  <p className="font-bold uppercase tracking-wider text-slate-500">Confidence</p>
                  <p>{selectedEntry.confidence?.toFixed(2) || '-'}</p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Text (bearbeitbar)
                </label>
                <textarea
                  value={editedText}
                  onChange={(event) => setEditedText(event.target.value)}
                  rows={5}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Verwerfungsgrund
                </label>
                <input
                  type="text"
                  value={discardReason}
                  onChange={(event) => setDiscardReason(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="optional"
                />
              </div>

              {selectedEntry.errorMessage && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <p className="mb-1 font-bold">Fehler</p>
                  <p>{selectedEntry.errorMessage}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={actionId === selectedEntry.id}
                  onClick={() => {
                    void runAction(
                      'confirm',
                      { editedText: editedText.trim() || undefined },
                      'Eintrag bestätigt und ausgeführt.',
                    )
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold uppercase tracking-wider text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionId === selectedEntry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Bestätigen
                </button>

                <button
                  type="button"
                  disabled={actionId === selectedEntry.id}
                  onClick={() => {
                    void runAction(
                      'confirm',
                      { editedText: editedText.trim() || undefined },
                      'Eintrag bearbeitet und ausgeführt.',
                    )
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold uppercase tracking-wider text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-4 w-4" /> Edit + Execute
                </button>

                <button
                  type="button"
                  disabled={actionId === selectedEntry.id}
                  onClick={() => {
                    void runAction(
                      'retry',
                      { editedText: editedText.trim() || undefined },
                      'Retry ausgeführt.',
                    )
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold uppercase tracking-wider text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RotateCcw className="h-4 w-4" /> Retry
                </button>

                <button
                  type="button"
                  disabled={actionId === selectedEntry.id}
                  onClick={() => {
                    void runAction(
                      'discard',
                      { reason: discardReason.trim() || undefined },
                      'Eintrag verworfen.',
                    )
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold uppercase tracking-wider text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" /> Verwerfen
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <p className="mb-1 font-bold uppercase tracking-wider text-slate-500">Intent Payload</p>
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all text-xs">
                  {safeString(JSON.stringify(selectedEntry.intentPayload || {}, null, 2))}
                </pre>
              </div>

              {(selectedEntry.executedTaskId || selectedEntry.executedAppointmentId) && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                  <p className="mb-1 font-bold uppercase tracking-wider">Ausführung</p>
                  {selectedEntry.executedTaskId && <p>Task: {selectedEntry.executedTaskId}</p>}
                  {selectedEntry.executedAppointmentId && <p>Termin: {selectedEntry.executedAppointmentId}</p>}
                </div>
              )}

              {selectedEntry.status === 'failed' && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <p className="mb-1 flex items-center gap-1 font-bold uppercase tracking-wider">
                    <AlertTriangle className="h-3.5 w-3.5" /> Fehlgeschlagen
                  </p>
                  <p>Nutze Retry oder Edit + Execute, um den Eintrag erneut auszuführen.</p>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
