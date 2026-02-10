'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Loader2, MessageSquare } from 'lucide-react'
import { portalSupabase } from '@/lib/supabase/portal-client'
import { useProject } from '../context/ProjectContext'
import { useCustomerApi } from '../hooks/useCustomerApi'
import { CreateTicketForm, TicketCard, type Ticket } from './service.ui'

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
      const { data, error: fetchError } = await portalSupabase
        .from('tickets')
        .select('id, subject, status, type, created_at, updated_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      setTickets(data || [])
    } catch {
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
    if (!selectedProject?.id) {
      return
    }

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
        },
      )
      .subscribe()

    return () => {
      portalSupabase.removeChannel(channel)
    }
  }, [selectedProject?.id, loadTickets])

  useEffect(() => {
    if (!selectedProject?.id) {
      return
    }

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
            <div className="absolute inset-0 animate-ping rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-20" />
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

  const openTickets = tickets.filter((ticket) => ticket.status !== 'GESCHLOSSEN')
  const closedTickets = tickets.filter((ticket) => ticket.status === 'GESCHLOSSEN')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Service & Kontakt</h1>
        <p className="mt-1 text-slate-500">Ihre direkte Verbindung zu unserem Service-Team</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <CreateTicketForm onSuccess={() => selectedProject?.id && loadTickets(selectedProject.id)} />
        </div>

        <div className="space-y-6 lg:col-span-2">
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
                <p className="mt-1 text-sm text-slate-400">
                  Erstellen Sie eine neue Anfrage über das Formular.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {openTickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            )}
          </div>

          {closedTickets.length > 0 && (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">Abgeschlossen</h2>
                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {closedTickets.length}
                </span>
              </div>

              <div className="space-y-3">
                {closedTickets.map((ticket) => (
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
