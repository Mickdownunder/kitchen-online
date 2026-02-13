'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Circle, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import type { Task, TaskPriority, TaskStatus } from '@/types'
import { useToast } from '@/components/providers/ToastProvider'

type TaskPreset = 'today' | 'overdue' | 'open' | 'completed'

interface ApiEnvelope<T> {
  success?: boolean
  data?: T
  error?: string
}

const PRESET_OPTIONS: Array<{ id: TaskPreset; label: string }> = [
  { id: 'today', label: 'Heute' },
  { id: 'overdue', label: 'Überfällig' },
  { id: 'open', label: 'Offen' },
  { id: 'completed', label: 'Erledigt' },
]

function formatDateTime(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('de-DE')
}

function statusLabel(status: TaskStatus): string {
  if (status === 'in_progress') return 'In Arbeit'
  if (status === 'completed') return 'Erledigt'
  if (status === 'cancelled') return 'Abgebrochen'
  return 'Offen'
}

function priorityLabel(priority: TaskPriority): string {
  if (priority === 'low') return 'Niedrig'
  if (priority === 'high') return 'Hoch'
  if (priority === 'urgent') return 'Dringend'
  return 'Normal'
}

function taskStatusClass(status: TaskStatus): string {
  if (status === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'in_progress') return 'border-blue-200 bg-blue-50 text-blue-700'
  if (status === 'cancelled') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-50 text-slate-700'
}

function priorityClass(priority: TaskPriority): string {
  if (priority === 'urgent') return 'border-rose-200 bg-rose-50 text-rose-700'
  if (priority === 'high') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (priority === 'low') return 'border-slate-200 bg-slate-50 text-slate-500'
  return 'border-blue-200 bg-blue-50 text-blue-700'
}

export default function TasksView() {
  const { success, error } = useToast()
  const [preset, setPreset] = useState<TaskPreset>('today')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null)

  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPriority, setNewPriority] = useState<TaskPriority>('normal')
  const [newDueAt, setNewDueAt] = useState('')
  const [creating, setCreating] = useState(false)

  const loadTasks = useCallback(async (currentPreset: TaskPreset) => {
    setLoading(true)

    try {
      const response = await fetch(`/api/tasks?preset=${currentPreset}&limit=200`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      })
      const body = (await response.json().catch(() => ({}))) as ApiEnvelope<Task[]>

      if (!response.ok || body.success === false) {
        throw new Error(body.error || 'Tasks konnten nicht geladen werden.')
      }

      setTasks(Array.isArray(body.data) ? body.data : [])
    } catch (loadError) {
      error(loadError instanceof Error ? loadError.message : 'Tasks konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [error])

  useEffect(() => {
    void loadTasks(preset)
  }, [loadTasks, preset])

  const summary = useMemo(() => {
    return tasks.reduce(
      (accumulator, task) => {
        accumulator.total += 1
        if (task.status === 'completed') accumulator.completed += 1
        if (task.status === 'open' || task.status === 'in_progress') accumulator.open += 1
        return accumulator
      },
      { total: 0, open: 0, completed: 0 },
    )
  }, [tasks])

  async function createTask() {
    if (!newTitle.trim()) {
      error('Bitte einen Titel eingeben.')
      return
    }

    setCreating(true)

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          priority: newPriority,
          dueAt: newDueAt ? new Date(newDueAt).toISOString() : undefined,
        }),
      })

      const body = (await response.json().catch(() => ({}))) as ApiEnvelope<Task>
      if (!response.ok || body.success === false || !body.data) {
        throw new Error(body.error || 'Task konnte nicht erstellt werden.')
      }

      setNewTitle('')
      setNewDescription('')
      setNewPriority('normal')
      setNewDueAt('')
      success('Task wurde erstellt.')
      await loadTasks(preset)
    } catch (createError) {
      error(createError instanceof Error ? createError.message : 'Task konnte nicht erstellt werden.')
    } finally {
      setCreating(false)
    }
  }

  async function updateTask(taskId: string, payload: Record<string, unknown>) {
    setBusyTaskId(taskId)

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const body = (await response.json().catch(() => ({}))) as ApiEnvelope<Task>
      if (!response.ok || body.success === false) {
        throw new Error(body.error || 'Task konnte nicht aktualisiert werden.')
      }

      await loadTasks(preset)
    } catch (updateError) {
      error(updateError instanceof Error ? updateError.message : 'Task konnte nicht aktualisiert werden.')
    } finally {
      setBusyTaskId(null)
    }
  }

  async function removeTask(taskId: string) {
    if (!confirm('Task wirklich löschen?')) {
      return
    }

    setBusyTaskId(taskId)

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      })

      const body = (await response.json().catch(() => ({}))) as ApiEnvelope<unknown>
      if (!response.ok || body.success === false) {
        throw new Error(body.error || 'Task konnte nicht gelöscht werden.')
      }

      success('Task wurde gelöscht.')
      await loadTasks(preset)
    } catch (deleteError) {
      error(deleteError instanceof Error ? deleteError.message : 'Task konnte nicht gelöscht werden.')
    } finally {
      setBusyTaskId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Tasks</h1>
          <p className="mt-1 text-sm text-slate-600">Operative Aufgaben für Vertrieb, Planung und Umsetzung.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void loadTasks(preset)
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Gesamt</p>
          <p className="text-3xl font-black text-slate-900">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-blue-700">Offen</p>
          <p className="text-3xl font-black text-blue-800">{summary.open}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Erledigt</p>
          <p className="text-3xl font-black text-emerald-800">{summary.completed}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-slate-900">Neue Aufgabe</h2>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="text"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="Titel"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            type="datetime-local"
            value={newDueAt}
            onChange={(event) => setNewDueAt(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-amber-400"
          />
          <textarea
            value={newDescription}
            onChange={(event) => setNewDescription(event.target.value)}
            placeholder="Beschreibung (optional)"
            rows={3}
            className="md:col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            value={newPriority}
            onChange={(event) => setNewPriority(event.target.value as TaskPriority)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="low">Niedrig</option>
            <option value="normal">Normal</option>
            <option value="high">Hoch</option>
            <option value="urgent">Dringend</option>
          </select>

          <button
            type="button"
            onClick={() => {
              void createTask()
            }}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Aufgabe erstellen
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {PRESET_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setPreset(option.id)}
              className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
                preset === option.id
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Lade Tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500">
            Keine Tasks für den gewählten Filter.
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const busy = busyTaskId === task.id

              return (
                <article
                  key={task.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-900">{task.title}</h3>
                      {task.description && (
                        <p className="mt-1 text-sm text-slate-600">{task.description}</p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`rounded-lg border px-2 py-1 text-xs font-bold ${taskStatusClass(task.status)}`}>
                          {statusLabel(task.status)}
                        </span>
                        <span className={`rounded-lg border px-2 py-1 text-xs font-bold ${priorityClass(task.priority)}`}>
                          {priorityLabel(task.priority)}
                        </span>
                        <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-500">
                          Fällig: {formatDateTime(task.dueAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {task.status === 'completed' ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            void updateTask(task.id, { status: 'open' })
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Circle className="h-4 w-4" /> Wieder öffnen
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            void updateTask(task.id, { status: 'completed' })
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold uppercase tracking-wider text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Erledigt
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          void removeTask(task.id)
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold uppercase tracking-wider text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Löschen
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
