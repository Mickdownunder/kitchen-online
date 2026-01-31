'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  AlertCircle,
  Clock,
  CheckCircle,
  Circle,
  User,
  Building2,
  Phone,
  Mail,
  ExternalLink,
  AlertTriangle
} from 'lucide-react'
import { useToast } from '@/components/providers/ToastProvider'
import { supabase } from '@/lib/supabase/client'

interface Ticket {
  id: string
  project_id: string
  subject: string
  status: string
  type: string
  created_by: string
  assigned_to: string | null
  created_at: string
  updated_at: string
  company_id: string
}

interface Project {
  id: string
  customer_name: string
  order_number: string | null
  status: string
}

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
}

interface Message {
  id: string
  message: string
  file_url: string | null
  is_customer: boolean
  author_id: string | null
  employee_id: string | null
  created_at: string
}

const statusConfig: Record<string, { label: string; icon: typeof Circle; className: string }> = {
  'OFFEN': { 
    label: 'Offen', 
    icon: Circle, 
    className: 'bg-green-100 text-green-800' 
  },
  'IN_BEARBEITUNG': { 
    label: 'In Bearbeitung', 
    icon: Clock, 
    className: 'bg-yellow-100 text-yellow-800' 
  },
  'GESCHLOSSEN': { 
    label: 'Geschlossen', 
    icon: CheckCircle, 
    className: 'bg-gray-100 text-gray-600' 
  },
}

function formatDateTime(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '-'
  }
}

function MessageBubble({ message }: { message: Message }) {
  const isCustomer = message.is_customer

  return (
    <div className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-3 ${
          isCustomer
            ? 'bg-white border border-slate-200 text-slate-900'
            : 'bg-blue-900 text-white'
        }`}
      >
        {/* Author */}
        <div className={`mb-1 flex items-center gap-1 text-xs ${isCustomer ? 'text-slate-500' : 'text-blue-200'}`}>
          {isCustomer ? (
            <>
              <User className="h-3 w-3" />
              <span>Kunde</span>
            </>
          ) : (
            <>
              <Building2 className="h-3 w-3" />
              <span>Sie</span>
            </>
          )}
        </div>

        {/* Message */}
        <p className="whitespace-pre-wrap break-words">{message.message}</p>

        {/* Timestamp */}
        <p className={`mt-1 text-xs ${isCustomer ? 'text-slate-400' : 'text-blue-300'}`}>
          {formatDateTime(message.created_at)}
        </p>
      </div>
    </div>
  )
}

export default function TicketDetailPage() {
  const params = useParams()
  const ticketId = params.id as string
  const { success, error: showError } = useToast()

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [replyMessage, setReplyMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const response = await fetch(`/api/tickets/${ticketId}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Fehler beim Laden')
        return
      }

      setTicket(data.data.ticket)
      setProject(data.data.project)
      setCustomer(data.data.customer)
      setMessages(data.data.messages || [])
    } catch (err) {
      console.error('Error loading ticket:', err)
      setError('Fehler beim Laden')
    } finally {
      if (showSpinner) {
        setIsLoading(false)
      }
    }
  }, [ticketId])

  useEffect(() => {
    loadData(true)
  }, [loadData])

  useEffect(() => {
    const channel = supabase
      .channel(`crm-ticket-messages-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          loadData(false)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [ticketId, loadData])

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadData(false)
    }, 10000)

    return () => window.clearInterval(interval)
  }, [loadData])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendReply = async () => {
    if (!replyMessage.trim() || isSending) return

    setIsSending(true)
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyMessage }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Senden')
      }

      setReplyMessage('')
      success('Antwort gesendet')
      await loadData(false)
    } catch (err) {
      console.error('Send error:', err)
      showError('Fehler beim Senden der Antwort')
    } finally {
      setIsSending(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true)
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Aktualisieren')
      }

      success('Status aktualisiert')
      await loadData()
    } catch (err) {
      console.error('Status update error:', err)
      showError('Fehler beim Aktualisieren des Status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent" />
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
        <h2 className="text-xl font-bold text-slate-900">Fehler</h2>
        <p className="mt-2 text-slate-500">{error || 'Ticket nicht gefunden'}</p>
        <Link
          href="/tickets"
          className="mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
      </div>
    )
  }

  const status = statusConfig[ticket.status] || statusConfig['OFFEN']
  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Main Content */}
      <div className="flex flex-1 flex-col rounded-2xl border border-slate-100 bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div className="flex items-start gap-4">
            <Link
              href="/tickets"
              className="mt-1 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-slate-900">{ticket.subject}</h1>
              <p className="mt-1 text-sm text-slate-500">
                Erstellt am {formatDateTime(ticket.created_at)}
              </p>
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-3">
            <select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={isUpdatingStatus}
              className={`rounded-full px-4 py-2 text-sm font-medium outline-none ${status.className}`}
            >
              <option value="OFFEN">Offen</option>
              <option value="IN_BEARBEITUNG">In Bearbeitung</option>
              <option value="GESCHLOSSEN">Geschlossen</option>
            </select>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {messages.length === 0 ? (
            <div className="text-center text-slate-500">
              <p>Noch keine Nachrichten.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Reply Form */}
        <div className="border-t border-slate-100 p-4">
          <div className="flex gap-3">
            <textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendReply()
                }
              }}
              placeholder={ticket.status === 'GESCHLOSSEN' ? 'Ticket wieder öffnen um zu antworten...' : 'Ihre Antwort...'}
              rows={2}
              className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleSendReply}
              disabled={isSending || !replyMessage.trim()}
              className="self-end rounded-xl bg-blue-900 p-3 text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 space-y-4">
        {/* Customer Info */}
        {customer && (
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-lg">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
              <User className="h-5 w-5 text-yellow-500" />
              Kunde
            </h3>
            <div className="space-y-3">
              <p className="font-semibold text-slate-900">{customer.name}</p>
              {customer.email && (
                <a
                  href={`mailto:${customer.email}`}
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600"
                >
                  <Mail className="h-4 w-4" />
                  {customer.email}
                </a>
              )}
              {customer.phone && (
                <a
                  href={`tel:${customer.phone}`}
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600"
                >
                  <Phone className="h-4 w-4" />
                  {customer.phone}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Project Info */}
        {project && (
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-lg">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
              <Building2 className="h-5 w-5 text-yellow-500" />
              Projekt
            </h3>
            <div className="space-y-2">
              <p className="font-semibold text-slate-900">{project.customer_name}</p>
              {project.order_number && (
                <p className="text-sm text-slate-500">Auftrag: {project.order_number}</p>
              )}
              <p className="text-sm text-slate-500">Status: {project.status}</p>
              <Link
                href={`/projects?id=${project.id}`}
                className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="h-4 w-4" />
                Projekt öffnen
              </Link>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-lg">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Aktionen
          </h3>
          <div className="space-y-2">
            <Link
              href={`/complaints?projectId=${ticket.project_id}`}
              className="block w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              Reklamation erstellen
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
