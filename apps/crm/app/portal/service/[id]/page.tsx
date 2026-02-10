'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { portalSupabase } from '@/lib/supabase/portal-client'
import { useCustomerApi } from '../../hooks/useCustomerApi'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  AlertCircle,
  Clock,
  CheckCircle2,
  Circle,
  User,
  Headphones,
  Paperclip,
  MessageSquare
} from 'lucide-react'

interface Ticket {
  id: string
  subject: string
  status: string
  type: string
  created_at: string
  updated_at: string
}

interface Message {
  id: string
  message: string
  file_url: string | null
  is_customer: boolean
  created_at: string
  author_id: string
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
    textColor: 'text-slate-600',
    dotColor: 'bg-slate-400'
  },
}

function formatTime(dateString: string): string {
  try {
    return new Date(dateString).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '-'
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return 'Heute'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Gestern'
    }
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return '-'
  }
}

function DateDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="rounded-full bg-slate-100 px-4 py-1.5">
        <span className="text-xs font-medium text-slate-500">{formatDate(date)}</span>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  isOwn,
  onOpenAttachment,
}: {
  message: Message
  isOwn: boolean
  onOpenAttachment: (message: Message) => Promise<void>
}) {
  return (
    <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
        isOwn 
          ? 'bg-gradient-to-br from-emerald-400 to-teal-500' 
          : 'bg-gradient-to-br from-slate-600 to-slate-700'
      }`}>
        {isOwn ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Headphones className="h-4 w-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex max-w-[75%] flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender Label */}
        <span className={`mb-1 text-xs font-medium ${isOwn ? 'text-amber-600' : 'text-slate-500'}`}>
          {isOwn ? 'Sie' : 'KüchenOnline Team'}
        </span>

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isOwn
              ? 'rounded-br-md bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20'
              : 'rounded-bl-md bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/50'
          }`}
        >
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{message.message}</p>

          {/* Attachment */}
          {message.file_url && (
            <button
              type="button"
              onClick={() => onOpenAttachment(message)}
              className={`mt-2 flex items-center gap-1.5 text-sm underline-offset-2 hover:underline ${
                isOwn ? 'text-amber-100' : 'text-amber-600'
              }`}
            >
              <Paperclip className="h-3.5 w-3.5" />
              Anhang öffnen
            </button>
          )}
        </div>

        {/* Timestamp */}
        <span className="mt-1 text-xs text-slate-400">
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  )
}

function ReplyForm({ 
  ticketId, 
  onSuccess,
  disabled,
}: { 
  ticketId: string
  onSuccess: () => void
  disabled: boolean
}) {
  const { accessToken } = useCustomerApi()
  const [message, setMessage] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !message.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      let body: BodyInit
      let headers: HeadersInit = {
        'Authorization': `Bearer ${accessToken}`,
      }

      if (file) {
        const formData = new FormData()
        formData.append('message', message)
        formData.append('file', file)
        body = formData
      } else {
        headers = {
          ...headers,
          'Content-Type': 'application/json',
        }
        body = JSON.stringify({ message })
      }

      const response = await fetch(`/api/customer/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers,
        body,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Senden')
      }

      setMessage('')
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Senden')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-4">
      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="flex gap-3">
        <div className="relative flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={disabled ? 'Dieses Ticket ist geschlossen' : 'Schreiben Sie eine Nachricht...'}
            disabled={disabled || isSubmitting}
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = Math.min(target.scrollHeight, 150) + 'px'
            }}
            className="w-full resize-none rounded-2xl border-0 bg-slate-100 px-4 py-3 pr-12 text-slate-800 placeholder:text-slate-400 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={disabled || isSubmitting || !message.trim()}
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.heic"
          disabled={disabled || isSubmitting}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-50"
        />
      </div>
    </form>
  )
}

export default function TicketDetailPage() {
  const params = useParams()
  const ticketId = params.id as string
  
  const { accessToken, isReady } = useCustomerApi()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
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
      // Fetch ticket
      const { data: ticketData, error: ticketError } = await portalSupabase
        .from('tickets')
        .select('id, subject, status, type, created_at, updated_at')
        .eq('id', ticketId)
        .single()

      if (ticketError || !ticketData) {
        setError('TICKET_NOT_FOUND')
        return
      }

      setTicket(ticketData)

      // Fetch messages
      const { data: messagesData, error: messagesError } = await portalSupabase
        .from('ticket_messages')
        .select('id, message, file_url, is_customer, created_at, author_id')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

      if (messagesError) {
        console.warn('Error loading messages:', messagesError)
      }

      setMessages(messagesData || [])
    } catch (err) {
      console.warn('Error loading ticket:', err)
      setError('LOAD_ERROR')
    } finally {
      if (showSpinner) {
        setIsLoading(false)
      }
    }
  }, [ticketId])

  useEffect(() => {
    if (isReady && accessToken) {
      loadData(true)
    } else if (isReady && !accessToken) {
      setIsLoading(false)
      setError('NOT_AUTHENTICATED')
    }
  }, [isReady, accessToken, loadData])

  useEffect(() => {
    if (!isReady || !accessToken) return

    const channel = portalSupabase
      .channel(`ticket-messages-${ticketId}`)
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
      portalSupabase.removeChannel(channel)
    }
  }, [isReady, accessToken, ticketId, loadData])

  useEffect(() => {
    if (!isReady || !accessToken) return

    const interval = window.setInterval(() => {
      loadData(false)
    }, 10000)

    return () => window.clearInterval(interval)
  }, [isReady, accessToken, loadData])

  const openAttachment = async (message: Message) => {
    if (!accessToken || !message.file_url) return

    const response = await fetch(
      `/api/customer/tickets/${ticketId}/messages/${message.id}/download`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    const data = await response.json()
    if (!response.ok || !data?.url) {
      throw new Error(data?.error || 'DOWNLOAD_FAILED')
    }

    const fileResponse = await fetch(data.url)
    if (!fileResponse.ok) {
      throw new Error('DOWNLOAD_FAILED')
    }

    const blob = await fileResponse.blob()
    const url = URL.createObjectURL(blob)
    const a = window.document.createElement('a')
    a.href = url
    a.download = 'ticket-attachment'
    window.document.body.appendChild(a)
    a.click()
    window.document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = []
  let currentDate = ''
  
  for (const msg of messages) {
    const msgDate = new Date(msg.created_at).toDateString()
    if (msgDate !== currentDate) {
      currentDate = msgDate
      groupedMessages.push({ date: msg.created_at, messages: [msg] })
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg)
    }
  }

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
          <p className="mt-4 text-slate-500">Wird geladen...</p>
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

  if (error === 'TICKET_NOT_FOUND' || !ticket) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <AlertCircle className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-slate-900">Anfrage nicht gefunden</h2>
          <p className="mt-2 text-slate-500">Diese Anfrage existiert nicht oder Sie haben keinen Zugriff.</p>
          <Link
            href="/portal/service"
            className="mt-6 inline-flex items-center gap-2 text-amber-600 hover:text-amber-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    )
  }

  const status = statusConfig[ticket.status] || statusConfig['OFFEN']

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/50">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link
              href="/portal/service"
              className="mt-1 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{ticket.subject}</h1>
              <p className="mt-1 text-sm text-slate-500">
                Erstellt am {new Date(ticket.created_at).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-2 rounded-full px-4 py-2 ${status.bgColor}`}>
            <div className={`h-2 w-2 rounded-full ${status.dotColor}`} />
            <span className={`text-sm font-medium ${status.textColor}`}>{status.label}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-6">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <MessageSquare className="h-6 w-6 text-slate-400" />
              </div>
              <p className="mt-4 text-slate-500">Noch keine Nachrichten.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex}>
                <DateDivider date={group.date} />
                <div className="space-y-4">
                  {group.messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isOwn={msg.is_customer}
                      onOpenAttachment={openAttachment}
                    />
                  ))}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Reply Form */}
      <div className="flex-shrink-0">
        <ReplyForm
          ticketId={ticketId}
          onSuccess={loadData}
          disabled={ticket.status === 'GESCHLOSSEN'}
        />
      </div>
    </div>
  )
}
