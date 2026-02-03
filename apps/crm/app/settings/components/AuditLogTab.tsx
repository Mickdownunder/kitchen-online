'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, User, FileText, PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 50

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId: string | null
  createdAt: string
  userName: string | null
  changes: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    before?: Record<string, any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    after?: Record<string, any>
  } | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any> | null
}

/** Häufige KI-Funktionsnamen auf Deutsch */
const AI_FUNCTION_LABELS: Record<string, string> = {
  createCustomer: 'Kunde angelegt',
  updateCustomer: 'Kunde aktualisiert',
  getProject: 'Auftrag abgerufen',
  createProject: 'Auftrag angelegt',
  updateProject: 'Auftrag bearbeitet',
  getInvoice: 'Rechnung abgerufen',
  markInvoicePaid: 'Rechnung als bezahlt markiert',
  searchArticles: 'Artikel gesucht',
  getCompanySettings: 'Firmendaten abgerufen',
  listCustomers: 'Kundenliste abgerufen',
}

/** Technische Aktionen/Entitäten in lesbare deutsche Beschreibungen übersetzen */
function getReadableLabel(log: AuditLog): { title: string; detail: string | null } {
  const { action, entityType, metadata } = log
  const functionName = metadata?.functionName as string | undefined

  // KI-Assistent
  if (action === 'ai.assistant.function_called' || entityType === 'ai_action') {
    const label = functionName ? (AI_FUNCTION_LABELS[functionName] || functionName) : 'Aktion ausgeführt'
    return { title: `KI-Assistent: ${label}`, detail: null }
  }

  // Projekt / Auftrag
  if (action === 'project.created') return { title: 'Auftrag angelegt', detail: null }
  if (action === 'project.updated') return { title: 'Auftrag bearbeitet', detail: null }
  if (action === 'project.deleted') return { title: 'Auftrag gelöscht', detail: null }
  if (entityType === 'project') return { title: action || 'Auftrag', detail: null }

  // Rechnung
  if (action === 'invoice.created') return { title: 'Rechnung erstellt', detail: null }
  if (action === 'invoice.paid') return { title: 'Rechnung als bezahlt markiert', detail: null }
  if (action === 'invoice.unpaid') return { title: 'Rechnung als unbezahlt markiert', detail: null }
  if (entityType === 'invoice') return { title: action || 'Rechnung', detail: null }

  // Firma / Einstellungen
  if (action === 'company.settings_updated') return { title: 'Firmendaten geändert', detail: null }
  if (action === 'user.role_changed') return { title: 'Mitarbeiter-Rolle geändert', detail: null }
  if (action === 'user.invited') return { title: 'Benutzer eingeladen', detail: null }
  if (entityType === 'user') return { title: action || 'Benutzer', detail: null }

  // Lieferschein
  if (entityType === 'delivery_note' || action?.includes('delivery')) {
    if (action?.includes('deleted')) return { title: 'Lieferschein gelöscht', detail: null }
    return { title: 'Lieferschein', detail: null }
  }

  // Test
  if (action === 'test.manual' || entityType === 'test') return { title: 'Test-Eintrag', detail: null }

  // Fallback: action lesbar machen (z. B. "project.created" -> "Project created")
  const fallback = action?.replace(/\./g, ' ') || entityType || 'Eintrag'
  return { title: fallback, detail: null }
}

export default function AuditLogTab() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [testCreating, setTestCreating] = useState(false)
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const [filter, setFilter] = useState({
    action: '',
    entityType: '',
  })
  const [page, setPage] = useState(1)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const offset = (page - 1) * PAGE_SIZE
      const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
        offset: offset.toString(),
        ...(filter.action && { action: filter.action }),
        ...(filter.entityType && { entityType: filter.entityType }),
      })

      const res = await fetch(`/api/audit-logs?${params}`, { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message =
          data?.error ||
          (res.status === 403 ? 'Keine Berechtigung für Audit-Logs (nur Geschäftsführer/Administration).' : 'Fehler beim Laden der Audit-Logs.')
        setLoadError(message)
        setLogs([])
        return
      }
      setLogs(data.logs || [])
    } catch (error) {
      console.error('Error loading audit logs:', error)
      setLoadError('Audit-Logs konnten nicht geladen werden.')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [filter.action, filter.entityType, page])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getActionColor = (action: string) => {
    if (action.includes('.created')) return 'text-green-600 bg-green-50'
    if (action.includes('.updated')) return 'text-blue-600 bg-blue-50'
    if (action.includes('.deleted')) return 'text-red-600 bg-red-50'
    return 'text-slate-600 bg-slate-50'
  }

  const createTestEntry = async () => {
    setTestCreating(true)
    setTestMessage(null)
    try {
      const res = await fetch('/api/audit-logs', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test.manual',
          entityType: 'test',
          changes: { after: { source: 'Test-Button im Audit-Log' } },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setTestMessage(data?.error || `Fehler: ${res.status}`)
        return
      }
      setTestMessage('Test-Eintrag erstellt. Liste wird aktualisiert.')
      await loadLogs()
    } catch (e) {
      setTestMessage('Request fehlgeschlagen: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setTestCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="mb-2 text-2xl font-bold text-slate-900">Audit-Log</h2>
          <p className="text-slate-600">Nachvollziehbarkeit aller wichtigen Aktionen im System</p>
        </div>
        <button
          type="button"
          onClick={createTestEntry}
          disabled={loading || testCreating}
          className="flex items-center gap-2 rounded-xl border border-amber-500 bg-white px-4 py-2 text-sm font-bold text-amber-600 transition-colors hover:bg-amber-50 disabled:opacity-50"
        >
          <PlusCircle className="h-4 w-4" />
          {testCreating ? 'Erstelle…' : 'Test-Eintrag erstellen'}
        </button>
      </div>
      {testMessage && (
        <p className={`rounded-lg px-4 py-2 text-sm ${testMessage.startsWith('Fehler') || testMessage.startsWith('Request') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {testMessage}
        </p>
      )}

      {/* Filter */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-sm font-medium text-slate-700">Aktion</label>
            <input
              type="text"
              value={filter.action}
              onChange={e => { setFilter({ ...filter, action: e.target.value }); setPage(1) }}
              placeholder="z.B. project.created"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-sm font-medium text-slate-700">Entität</label>
            <input
              type="text"
              value={filter.entityType}
              onChange={e => { setFilter({ ...filter, entityType: e.target.value }); setPage(1) }}
              placeholder="z.B. project, user"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <p className="text-sm text-slate-500">50 Einträge pro Seite</p>
        </div>
      </div>

      {/* Logs List */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-2">Lade Audit-Logs...</p>
          </div>
        ) : loadError ? (
          <div className="p-8 text-center">
            <FileText className="mx-auto mb-2 h-12 w-12 text-amber-500" />
            <p className="font-medium text-slate-700">{loadError}</p>
            <p className="mt-1 text-sm text-slate-500">
              {loadError.includes('Firma zugeordnet')
                ? 'Bitte Firmenstammdaten anlegen und deinen Benutzer der Firma als Geschäftsführer/Administration zuordnen.'
                : 'Nur Geschäftsführer und Administration können das Audit-Log einsehen.'}
            </p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <FileText className="mx-auto mb-2 h-12 w-12 text-slate-400" />
            <p className="font-medium text-slate-700">Noch keine Audit-Einträge</p>
            <p className="mt-1 text-sm">
              Aktionen wie Auftrag anlegen, Rechnung buchen, Benutzer einladen oder Lieferschein löschen erscheinen hier.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-widest text-slate-500">
                    <th className="px-4 py-3">Datum / Uhrzeit</th>
                    <th className="px-4 py-3">Aktion</th>
                    <th className="px-4 py-3">Benutzer</th>
                    <th className="w-10 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map(log => {
                    const { title } = getReadableLabel(log)
                    return (
                      <tr key={log.id} className="transition-colors hover:bg-slate-50/80">
                        <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${getActionColor(log.action)}`}
                          >
                            {title}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {log.userName || '–'}
                        </td>
                        <td className="px-4 py-2.5">
                          {log.changes && (
                            <details className="group">
                              <summary className="cursor-pointer text-amber-600 hover:underline">
                                Details
                              </summary>
                              <div className="mt-1 rounded bg-slate-50 p-2">
                                <pre className="max-h-40 overflow-auto font-mono text-xs text-slate-700">
                                  {JSON.stringify(log.changes, null, 2)}
                                </pre>
                              </div>
                            </details>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* Paginierung */}
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
              <p className="text-sm text-slate-500">
                Seite {page}
                {logs.length === PAGE_SIZE && ' – weitere Einträge auf nächster Seite'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <ChevronLeft className="h-4 w-4" /> Zurück
                </button>
                <button
                  type="button"
                  onClick={() => setPage(p => p + 1)}
                  disabled={loading || logs.length < PAGE_SIZE}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
                >
                  Weiter <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
