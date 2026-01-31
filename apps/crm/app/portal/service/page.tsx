'use client'

import { useEffect, useState, useCallback } from 'react'
import { portalSupabase } from '@/lib/supabase/portal-client'
import { useCustomerApi } from '../hooks/useCustomerApi'
import { useProject } from '../context/ProjectContext'
import Link from 'next/link'
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  AlertCircle,
  Clock,
  CheckCircle2,
  Circle,
  ChevronRight,
  Plus,
  Sparkles
} from 'lucide-react'

interface Ticket {
  id: string
  subject: string
  status: string
  type: string
  created_at: string
  updated_at: string
}

const statusConfig: Record<string, { label: string; icon: typeof Circle; bgColor: string; textColor: string; dotColor: string }> = {
  'OFFEN': { 
    label: 'Offen', 
    icon: Circle, 
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    dotColor: 'bg-emerald-500'
  },
  'IN_BEARBEITUNG': { 
    label: 'In Bearbeitung', 
    icon: Clock, 
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    dotColor: 'bg-amber-500'
  },
  'GESCHLOSSEN': { 
    label: 'Geschlossen', 
    icon: CheckCircle2, 
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-500',
    dotColor: 'bg-slate-400'
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
    } else if (days === 1) {
      return 'Gestern'
    } else if (days < 7) {
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

function TicketCard({ ticket }: { ticket: Ticket }) {
  const status = statusConfig[ticket.status] || statusConfig['OFFEN']

  return (
    <Link
      href={`/portal/service/${ticket.id}`}
      className="group flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/50 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${status.bgColor}`}>
            <MessageSquare className={`h-5 w-5 ${status.textColor}`} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{ticket.subject}</p>
            <p className="mt-0.5 text-sm text-slate-500">
              {formatDate(ticket.created_at)}
            </p>
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

function CreateTicketForm({ 
  onSuccess 
}: { 
  onSuccess: () => void 
}) {
  const { accessToken } = useCustomerApi()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken) return

    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/customer/tickets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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

      // Success
      setSuccess(true)
      setSubject('')
      setMessage('')
      onSuccess()

      // Hide success message after 3 seconds
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
              onChange={(e) => setSubject(e.target.value)}
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
              onChange={(e) => setMessage(e.target.value)}
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

export default function PortalServicePage() {
  const { accessToken, isReady } = useCustomerApi()
  const { selectedProject, isLoading: projectLoading } = useProject()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTickets = useCallback(async (projectId: string, showSpinner = true) => {
    if (showSpinner) {
      setIsLoading(true)
    }
    setError(null)

    try {
      // Fetch tickets for the selected project
      const { data, error: fetchError } = await portalSupabase
        .from('tickets')
        .select('id, subject, status, type, created_at, updated_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      setTickets(data || [])
    } catch (err) {
      console.error('Error loading tickets:', err)
      setError('Anfragen konnten nicht geladen werden.')
    } finally {
      if (showSpinner) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (isReady && accessToken && selectedProject?.id && !projectLoading) {
      loadTickets(selectedProject.id, true)
    } else if (isReady && !accessToken) {
      setIsLoading(false)
      setError('NOT_AUTHENTICATED')
    }
  }, [isReady, accessToken, selectedProject?.id, projectLoading, loadTickets])

  useEffect(() => {
    if (!selectedProject?.id) return

    // Subscribe to ticket changes for this project
    const channel = portalSupabase
      .channel(`portal-tickets-${selectedProject.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `project_id=eq.${selectedProject.id}`,
        },
        () => {
          loadTickets(selectedProject.id, false)
        }
      )
      .subscribe()

    return () => {
      portalSupabase.removeChannel(channel)
    }
  }, [selectedProject?.id, loadTickets])

  useEffect(() => {
    if (!selectedProject?.id) return

    const interval = window.setInterval(() => {
      loadTickets(selectedProject.id, false)
    }, 10000)

    return () => window.clearInterval(interval)
  }, [loadTickets, selectedProject?.id])

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto h-12 w-12">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-20 animate-ping" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          </div>
          <p className="mt-4 text-slate-500">Anfragen werden geladen...</p>
        </div>
      </div>
    )
  }

  if (error === 'NOT_AUTHENTICATED') {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-slate-900">Nicht angemeldet</h2>
          <p className="mt-2 text-slate-500">Bitte melden Sie sich erneut an.</p>
        </div>
      </div>
    )
  }

  // Separate open and closed tickets
  const openTickets = tickets.filter(t => t.status !== 'GESCHLOSSEN')
  const closedTickets = tickets.filter(t => t.status === 'GESCHLOSSEN')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Service & Kontakt</h1>
        <p className="mt-1 text-slate-500">
          Ihre direkte Verbindung zu unserem Service-Team
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Create Form */}
        <div className="lg:col-span-1">
          <CreateTicketForm onSuccess={() => selectedProject?.id && loadTickets(selectedProject.id)} />
        </div>

        {/* Ticket List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Open Tickets */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Offene Anfragen</h2>
              <span className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-2.5 py-0.5 text-xs font-semibold text-white">
                {openTickets.length}
              </span>
            </div>

            {openTickets.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/50">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <MessageSquare className="h-6 w-6 text-slate-400" />
                </div>
                <p className="mt-4 text-slate-500">Keine offenen Anfragen.</p>
                <p className="mt-1 text-sm text-slate-400">Erstellen Sie eine neue Anfrage über das Formular.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {openTickets.map(ticket => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            )}
          </div>

          {/* Closed Tickets */}
          {closedTickets.length > 0 && (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">Abgeschlossen</h2>
                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {closedTickets.length}
                </span>
              </div>

              <div className="space-y-3">
                {closedTickets.map(ticket => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
