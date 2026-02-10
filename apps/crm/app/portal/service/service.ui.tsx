import { useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { useCustomerApi } from '../hooks/useCustomerApi'

export interface Ticket {
  id: string
  subject: string
  status: string
  type: string
  created_at: string
  updated_at: string
}

const statusConfig: Record<
  string,
  { label: string; icon: LucideIcon; bgColor: string; textColor: string; dotColor: string }
> = {
  OFFEN: {
    label: 'Offen',
    icon: Circle,
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    dotColor: 'bg-emerald-500',
  },
  IN_BEARBEITUNG: {
    label: 'In Bearbeitung',
    icon: Clock,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    dotColor: 'bg-amber-500',
  },
  GESCHLOSSEN: {
    label: 'Geschlossen',
    icon: CheckCircle2,
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-500',
    dotColor: 'bg-slate-400',
  },
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return 'Heute'
    }
    if (days === 1) {
      return 'Gestern'
    }
    if (days < 7) {
      return `vor ${days} Tagen`
    }

    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '-'
  }
}

export function TicketCard({ ticket }: { ticket: Ticket }) {
  const status = statusConfig[ticket.status] || statusConfig.OFFEN

  return (
    <Link
      href={`/portal/service/${ticket.id}`}
      className="group flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/50 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/50"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${status.bgColor}`}>
            <MessageSquare className={`h-5 w-5 ${status.textColor}`} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{ticket.subject}</p>
            <p className="mt-0.5 text-sm text-slate-500">{formatDate(ticket.created_at)}</p>
          </div>
        </div>
      </div>
      <div className="ml-4 flex items-center gap-3">
        <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${status.bgColor}`}>
          <div className={`h-2 w-2 rounded-full ${status.dotColor}`} />
          <span className={`text-xs font-medium ${status.textColor}`}>{status.label}</span>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-emerald-500" />
      </div>
    </Link>
  )
}

export function CreateTicketForm({ onSuccess }: { onSuccess: () => void }) {
  const { accessToken } = useCustomerApi()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!accessToken) {
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/customer/tickets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subject, message }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessages: Record<string, string> = {
          VALIDATION_ERROR: 'Bitte füllen Sie alle Felder korrekt aus.',
          TICKET_CREATE_FAILED: 'Anfrage konnte nicht erstellt werden.',
          INTERNAL_ERROR: 'Ein Fehler ist aufgetreten.',
        }
        throw new Error(errorMessages[data.error] || 'Fehler beim Erstellen')
      }

      setSuccess(true)
      setSubject('')
      setMessage('')
      onSuccess()

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-emerald-400/10 to-teal-400/10 blur-2xl" />

      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25">
            <Plus className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Neue Anfrage</h2>
            <p className="text-sm text-slate-500">Wir melden uns schnellstmöglich</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-slate-700">
              Betreff
            </label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              required
              minLength={3}
              maxLength={200}
              placeholder="Worum geht es?"
              className="mt-1.5 block w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-slate-700">
              Ihre Nachricht
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
              minLength={10}
              maxLength={5000}
              rows={4}
              placeholder="Beschreiben Sie Ihr Anliegen..."
              className="mt-1.5 block w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
              <Sparkles className="h-4 w-4 flex-shrink-0" />
              <span>Anfrage erfolgreich erstellt!</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !subject.trim() || !message.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Wird gesendet...</span>
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                <span>Anfrage senden</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
