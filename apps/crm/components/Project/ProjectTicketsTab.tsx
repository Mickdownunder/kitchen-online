'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  Circle, 
  ChevronRight,
  ExternalLink,
  Loader2
} from 'lucide-react'

interface Ticket {
  id: string
  subject: string
  status: string
  created_at: string
  updated_at: string
}

interface ProjectTicketsTabProps {
  projectId: string | undefined
}

const statusConfig: Record<string, { label: string; icon: typeof Circle; className: string }> = {
  'OFFEN': { label: 'Offen', icon: Circle, className: 'bg-green-100 text-green-800' },
  'IN_BEARBEITUNG': { label: 'In Bearbeitung', icon: Clock, className: 'bg-yellow-100 text-yellow-800' },
  'GESCHLOSSEN': { label: 'Geschlossen', icon: CheckCircle, className: 'bg-gray-100 text-gray-600' },
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '-'
  }
}

export function ProjectTicketsTab({ projectId }: ProjectTicketsTabProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) {
      setLoading(false)
      return
    }

    const loadTickets = async () => {
      try {
        const response = await fetch(`/api/tickets?projectId=${projectId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Fehler beim Laden')
        }

        setTickets(data.data.tickets || [])
      } catch (err) {
        console.error('Error loading tickets:', err)
        setError('Fehler beim Laden der Anfragen')
      } finally {
        setLoading(false)
      }
    }

    loadTickets()
  }, [projectId])

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <MessageSquare className="mb-4 h-12 w-12 text-slate-300" />
        <p className="text-slate-500">Projekt muss zuerst gespeichert werden.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with link to full view */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">
          Kundenanfragen ({tickets.length})
        </h3>
        <Link
          href={`/tickets?projectId=${projectId}`}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
        >
          <ExternalLink className="h-4 w-4" />
          Alle anzeigen
        </Link>
      </div>

      {/* Ticket List */}
      {tickets.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-12 text-center">
          <MessageSquare className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-slate-500">Keine Kundenanfragen für dieses Projekt.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(ticket => {
            const status = statusConfig[ticket.status] || statusConfig['OFFEN']
            const StatusIcon = status.icon

            return (
              <Link
                key={ticket.id}
                href={`/tickets/${ticket.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 transition-all hover:border-yellow-300 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <StatusIcon className={`h-5 w-5 ${ticket.status === 'OFFEN' ? 'text-green-500' : ticket.status === 'IN_BEARBEITUNG' ? 'text-yellow-500' : 'text-gray-400'}`} />
                  <div>
                    <p className="font-medium text-slate-900">{ticket.subject}</p>
                    <p className="text-xs text-slate-500">{formatDate(ticket.updated_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
