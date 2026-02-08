'use client'

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  MessageSquare, 
  Search, 
  Clock,
  CheckCircle,
  Circle,
  ChevronRight,
  User,
  Building2,
  RefreshCw
} from 'lucide-react'
import AIAgentButton from '@/components/AIAgentButton'
import { useToast } from '@/components/providers/ToastProvider'
import { supabase } from '@/lib/supabase/client'
import { getCurrentCompanyId } from '@/lib/supabase/services/permissions'
import { logger } from '@/lib/utils/logger'

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
  project: {
    id: string
    customerName: string
    orderNumber: string | null
  } | null
  customer: {
    id: string
    name: string
  } | null
}

interface TicketStats {
  total: number
  open: number
  inProgress: number
  closed: number
}

const statusConfig: Record<string, { label: string; icon: typeof Circle; className: string; bgClass: string }> = {
  'OFFEN': { 
    label: 'Offen', 
    icon: Circle, 
    className: 'text-green-600',
    bgClass: 'bg-green-100 text-green-800'
  },
  'IN_BEARBEITUNG': { 
    label: 'In Bearbeitung', 
    icon: Clock, 
    className: 'text-yellow-600',
    bgClass: 'bg-yellow-100 text-yellow-800'
  },
  'GESCHLOSSEN': { 
    label: 'Geschlossen', 
    icon: CheckCircle, 
    className: 'text-gray-400',
    bgClass: 'bg-gray-100 text-gray-600'
  },
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `vor ${diffMins} Min.`
    if (diffHours < 24) return `vor ${diffHours} Std.`
    if (diffDays < 7) return `vor ${diffDays} Tagen`
    
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  } catch {
    return '-'
  }
}

function TicketRow({ ticket }: { ticket: Ticket }) {
  const status = statusConfig[ticket.status] || statusConfig['OFFEN']
  const StatusIcon = status.icon

  return (
    <Link
      href={`/tickets/${ticket.id}`}
      className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-yellow-300 hover:shadow-md"
    >
      {/* Status Icon */}
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${ticket.status === 'OFFEN' ? 'bg-green-100' : ticket.status === 'IN_BEARBEITUNG' ? 'bg-yellow-100' : 'bg-gray-100'}`}>
        <StatusIcon className={`h-5 w-5 ${status.className}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-slate-900">{ticket.subject}</p>
          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status.bgClass}`}>
            {status.label}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
          {ticket.customer && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {ticket.customer.name}
            </span>
          )}
          {ticket.project && (
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {ticket.project.customerName}
              {ticket.project.orderNumber && ` (${ticket.project.orderNumber})`}
            </span>
          )}
        </div>
      </div>

      {/* Time & Arrow */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400">{formatDate(ticket.updated_at)}</span>
        <ChevronRight className="h-5 w-5 text-slate-300" />
      </div>
    </Link>
  )
}

function TicketsContent() {
  const searchParams = useSearchParams()
  const { error: showError } = useToast()

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [stats, setStats] = useState<TicketStats>({ total: 0, open: 0, inProgress: 0, closed: 0 })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [companyId, setCompanyId] = useState<string | null>(null)
  // Default to 'active' (OFFEN + IN_BEARBEITUNG), not 'all'
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'active')

  const loadTickets = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) {
        setLoading(true)
      }
      const params = new URLSearchParams()
      // 'active' and 'all' fetch all tickets, filtering happens client-side
      if (statusFilter !== 'all' && statusFilter !== 'active') {
        params.set('status', statusFilter)
      }

      const response = await fetch(`/api/tickets?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Laden')
      }

      setTickets(data.data.tickets)
      setStats(data.data.stats)
    } catch (err) {
      logger.error('Error loading tickets', { component: 'TicketsClient' }, err instanceof Error ? err : new Error(String(err)))
      showError('Fehler beim Laden der Kundenanfragen')
    } finally {
      if (showSpinner) {
        setLoading(false)
      }
    }
  }, [statusFilter, showError])

  useEffect(() => {
    loadTickets(true)
  }, [loadTickets])

  useEffect(() => {
    let isMounted = true
    const fetchCompanyId = async () => {
      const id = await getCurrentCompanyId()
      if (isMounted) {
        setCompanyId(id)
      }
    }
    fetchCompanyId()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!companyId) return

    const channel = supabase
      .channel(`crm-tickets-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          loadTickets(false)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [companyId, loadTickets])

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadTickets(false)
    }, 10000)

    return () => window.clearInterval(interval)
  }, [loadTickets])

  // Filter tickets by search and active status
  const filteredTickets = useMemo(() => {
    let result = tickets
    
    // Filter by 'active' status (exclude closed)
    if (statusFilter === 'active') {
      result = result.filter(ticket => ticket.status !== 'GESCHLOSSEN')
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(ticket => 
        ticket.subject.toLowerCase().includes(term) ||
        ticket.customer?.name.toLowerCase().includes(term) ||
        ticket.project?.customerName.toLowerCase().includes(term) ||
        ticket.project?.orderNumber?.toLowerCase().includes(term)
      )
    }
    
    return result
  }, [tickets, searchTerm, statusFilter])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <div className="animate-in fade-in space-y-8 duration-700">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="mb-2 text-5xl font-black tracking-tighter text-slate-900">
              Kundenanfragen
            </h2>
            <p className="font-medium text-slate-500">
              Eingehende Anfragen aus dem Kundenportal
            </p>
          </div>
          <button
            onClick={() => loadTickets(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Aktualisieren
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div 
            onClick={() => setStatusFilter('active')}
            className={`cursor-pointer rounded-2xl border p-4 shadow-lg transition-all ${statusFilter === 'active' ? 'border-blue-500 bg-blue-50' : 'border-blue-100 bg-white hover:border-blue-200'}`}
          >
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-blue-400">Aktiv</p>
            <p className="text-2xl font-black text-blue-600">{stats.open + stats.inProgress}</p>
          </div>
          <div 
            onClick={() => setStatusFilter('OFFEN')}
            className={`cursor-pointer rounded-2xl border p-4 shadow-lg transition-all ${statusFilter === 'OFFEN' ? 'border-green-500 bg-green-50' : 'border-green-100 bg-white hover:border-green-200'}`}
          >
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-green-400">Offen</p>
            <p className="text-2xl font-black text-green-600">{stats.open}</p>
          </div>
          <div 
            onClick={() => setStatusFilter('IN_BEARBEITUNG')}
            className={`cursor-pointer rounded-2xl border p-4 shadow-lg transition-all ${statusFilter === 'IN_BEARBEITUNG' ? 'border-yellow-500 bg-yellow-50' : 'border-yellow-100 bg-white hover:border-yellow-200'}`}
          >
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-yellow-400">In Bearbeitung</p>
            <p className="text-2xl font-black text-yellow-600">{stats.inProgress}</p>
          </div>
          <div 
            onClick={() => setStatusFilter('GESCHLOSSEN')}
            className={`cursor-pointer rounded-2xl border p-4 shadow-lg transition-all ${statusFilter === 'GESCHLOSSEN' ? 'border-gray-500 bg-gray-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
          >
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-gray-400">Archiv</p>
            <p className="text-2xl font-black text-gray-600">{stats.closed}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
          <input
            type="text"
            placeholder="Suche nach Betreff, Kunde, Auftrag..."
            className="w-full rounded-2xl border border-slate-100 bg-white py-4 pl-12 pr-4 font-medium outline-none focus:ring-2 focus:ring-yellow-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Ticket List */}
        {filteredTickets.length > 0 ? (
          <div className="space-y-3">
            {filteredTickets.map(ticket => (
              <TicketRow key={ticket.id} ticket={ticket} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-100 bg-white p-16 text-center shadow-lg">
            <MessageSquare className="mx-auto mb-4 h-16 w-16 text-slate-300" />
            <h3 className="mb-2 text-xl font-black text-slate-900">
              {tickets.length === 0 ? 'Keine Kundenanfragen' : 'Keine Ergebnisse'}
            </h3>
            <p className="text-slate-500">
              {tickets.length === 0
                ? 'Aktuell gibt es keine offenen Kundenanfragen.'
                : 'Versuchen Sie eine andere Suche.'}
            </p>
          </div>
        )}
      </div>

      <AIAgentButton />
    </>
  )
}

export default function TicketsClient() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent" />
        </div>
      }
    >
      <TicketsContent />
    </Suspense>
  )
}
