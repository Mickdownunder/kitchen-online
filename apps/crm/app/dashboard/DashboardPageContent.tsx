'use client'

import { useState, useEffect } from 'react'
import Dashboard from '@/components/Dashboard'
import { useApp } from '@/app/providers'
import AIAgentButton from '@/components/AIAgentButton'
import { getOpenInvoices } from '@/lib/supabase/services/invoices'
import { Invoice } from '@/types'
import { logger } from '@/lib/utils/logger'

interface TicketStats {
  total: number
  open: number
  inProgress: number
  closed: number
}

export default function DashboardPageContent() {
  const { projects, appointments, isLoading } = useApp()
  const [openInvoices, setOpenInvoices] = useState<Invoice[]>([])
  const [ticketStats, setTicketStats] = useState<TicketStats>({ total: 0, open: 0, inProgress: 0, closed: 0 })
  const [isLoadingExtra, setIsLoadingExtra] = useState(true)

  // Fetch additional data (invoices + tickets) in parallel
  useEffect(() => {
    let cancelled = false

    async function fetchDashboardData() {
      try {
        const [invoicesResult, ticketResponse] = await Promise.all([
          getOpenInvoices(),
          fetch('/api/tickets')
            .then(r => r.ok ? r.json() : { data: { stats: { total: 0, open: 0, inProgress: 0, closed: 0 } } })
            .catch(() => ({ data: { stats: { total: 0, open: 0, inProgress: 0, closed: 0 } } })),
        ])

        if (!cancelled) {
          const invoices = invoicesResult.ok ? invoicesResult.data : []
          setOpenInvoices(invoices)
          if (ticketResponse?.data?.stats) {
            setTicketStats(ticketResponse.data.stats)
          }
        }
      } catch (error) {
        logger.error('Error fetching dashboard data', { component: 'DashboardPageContent' }, error as Error)
      } finally {
        if (!cancelled) {
          setIsLoadingExtra(false)
        }
      }
    }

    fetchDashboardData()

    return () => {
      cancelled = true
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <Dashboard
        projects={projects || []}
        appointments={appointments || []}
        openInvoices={openInvoices}
        ticketStats={ticketStats}
        isLoadingExtra={isLoadingExtra}
      />
      <AIAgentButton />
    </>
  )
}
