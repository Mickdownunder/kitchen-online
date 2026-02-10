'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AlertCircle, ArrowLeft, Loader2, MessageSquare } from 'lucide-react'
import { portalSupabase } from '@/lib/supabase/portal-client'
import { useCustomerApi } from '../../hooks/useCustomerApi'
import {
  DateDivider,
  MessageBubble,
  ReplyForm,
  ticketStatusConfig,
  type Ticket,
  type TicketMessage,
} from './ticketDetail.ui'

export default function TicketDetailPage() {
  const params = useParams()
  const ticketId = params.id as string

  const { accessToken, isReady } = useCustomerApi()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadData = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) {
        setIsLoading(true)
      }
      setError(null)

      try {
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

        const { data: messagesData, error: messagesError } = await portalSupabase
          .from('ticket_messages')
          .select('id, message, file_url, is_customer, created_at, author_id')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true })

        if (messagesError) {
          setError('LOAD_ERROR')
          return
        }

        setMessages(messagesData || [])
      } catch {
        setError('LOAD_ERROR')
      } finally {
        if (showSpinner) {
          setIsLoading(false)
        }
      }
    },
    [ticketId],
  )

  useEffect(() => {
    if (isReady && accessToken) {
      loadData(true)
    } else if (isReady && !accessToken) {
      setIsLoading(false)
      setError('NOT_AUTHENTICATED')
    }
  }, [isReady, accessToken, loadData])

  useEffect(() => {
    if (!isReady || !accessToken) {
      return
    }

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
        },
      )
      .subscribe()

    return () => {
      portalSupabase.removeChannel(channel)
    }
  }, [isReady, accessToken, ticketId, loadData])

  useEffect(() => {
    if (!isReady || !accessToken) {
      return
    }

    const interval = window.setInterval(() => {
      loadData(false)
    }, 10000)

    return () => window.clearInterval(interval)
  }, [isReady, accessToken, loadData])

  const openAttachment = async (message: TicketMessage) => {
    if (!accessToken || !message.file_url) {
      return
    }

    const response = await fetch(`/api/customer/tickets/${ticketId}/messages/${message.id}/download`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

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
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = 'ticket-attachment'
    window.document.body.appendChild(anchor)
    anchor.click()
    window.document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const groupedMessages: { date: string; messages: TicketMessage[] }[] = []
  let currentDate = ''

  for (const message of messages) {
    const messageDate = new Date(message.created_at).toDateString()
    if (messageDate !== currentDate) {
      currentDate = messageDate
      groupedMessages.push({ date: message.created_at, messages: [message] })
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(message)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto h-12 w-12">
            <div className="absolute inset-0 animate-ping rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-20" />
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

  const status = ticketStatusConfig[ticket.status] || ticketStatusConfig.OFFEN

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/50">
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
                Erstellt am{' '}
                {new Date(ticket.created_at).toLocaleDateString('de-DE', {
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
            {groupedMessages.map((group, index) => (
              <div key={index}>
                <DateDivider date={group.date} />
                <div className="space-y-4">
                  {group.messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={message.is_customer}
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

      <div className="flex-shrink-0">
        <ReplyForm ticketId={ticketId} onSuccess={loadData} disabled={ticket.status === 'GESCHLOSSEN'} />
      </div>
    </div>
  )
}
