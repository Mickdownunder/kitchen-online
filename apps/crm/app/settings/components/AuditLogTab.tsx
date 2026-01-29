'use client'

import { useState, useEffect } from 'react'
import { Clock, User, FileText } from 'lucide-react'

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
}

export default function AuditLogTab() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    action: '',
    entityType: '',
    limit: 100,
  })

  useEffect(() => {
    loadLogs()
  }, [filter])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: filter.limit.toString(),
        ...(filter.action && { action: filter.action }),
        ...(filter.entityType && { entityType: filter.entityType }),
      })

      const res = await fetch(`/api/audit-logs?${params}`)
      if (!res.ok) {
        throw new Error('Failed to load audit logs')
      }
      const data = await res.json()
      setLogs(data.logs || [])
    } catch (error) {
      console.error('Error loading audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-slate-900">Audit-Log</h2>
        <p className="text-slate-600">Nachvollziehbarkeit aller wichtigen Aktionen im System</p>
      </div>

      {/* Filter */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">Aktion</label>
            <input
              type="text"
              value={filter.action}
              onChange={e => setFilter({ ...filter, action: e.target.value })}
              placeholder="z.B. project.created"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">Entität</label>
            <input
              type="text"
              value={filter.entityType}
              onChange={e => setFilter({ ...filter, entityType: e.target.value })}
              placeholder="z.B. project, user"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-32">
            <label className="mb-1 block text-sm font-medium text-slate-700">Limit</label>
            <select
              value={filter.limit}
              onChange={e => setFilter({ ...filter, limit: parseInt(e.target.value) })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-2">Lade Audit-Logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <FileText className="mx-auto mb-2 h-12 w-12 text-slate-400" />
            <p>Keine Audit-Logs gefunden</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {logs.map(log => (
              <div key={log.id} className="p-4 transition-colors hover:bg-slate-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${getActionColor(log.action)}`}
                      >
                        {log.action}
                      </span>
                      <span className="text-sm text-slate-500">{log.entityType}</span>
                      {log.entityId && (
                        <span className="font-mono text-xs text-slate-400">
                          {log.entityId.substring(0, 8)}...
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      {log.userName && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{log.userName}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatDate(log.createdAt)}</span>
                      </div>
                    </div>
                    {log.changes && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-blue-600 hover:underline">
                          Änderungen anzeigen
                        </summary>
                        <div className="mt-2 rounded bg-slate-50 p-2 font-mono text-xs">
                          <pre>{JSON.stringify(log.changes, null, 2)}</pre>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
