'use client'

import React, { useMemo, useSyncExternalStore } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { TrendingUp, ArrowRight, Loader2 } from 'lucide-react'
import { CustomerProject, Invoice, PlanningAppointment } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { TicketStats } from './dashboard/types'
import ActionBar from './dashboard/ActionBar'
import KPICards from './dashboard/KPICards'
import ProjectPipeline from './dashboard/ProjectPipeline'
import UpcomingAppointments from './dashboard/UpcomingAppointments'
import OpenInvoicesCard from './dashboard/OpenInvoicesCard'
import ActivityFeed from './dashboard/ActivityFeed'

// Dynamic import for the chart component (recharts is ~300KB gzipped)
const RevenueChart = dynamic(() => import('./charts/RevenueChart'), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  ),
})

interface DashboardProps {
  projects: CustomerProject[]
  appointments: PlanningAppointment[]
  openInvoices: Invoice[]
  ticketStats: TicketStats
  isLoadingExtra?: boolean
}

const Dashboard: React.FC<DashboardProps> = ({
  projects,
  appointments,
  openInvoices,
  ticketStats,
}) => {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const { profile } = useAuth()

  const getGreetingName = () => {
    if (profile?.fullName) {
      return profile.fullName.split(' ')[0]
    }
    return 'Chef'
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Calculate monthly revenue for current year AND previous year
  const { monthlyRevenueData, yearlyRevenue, prevYearlyRevenue } = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
    const currentYear = new Date().getFullYear()
    const prevYear = currentYear - 1

    const currentYearData: Record<number, number> = {}
    const prevYearData: Record<number, number> = {}
    for (let i = 0; i < 12; i++) {
      currentYearData[i] = 0
      prevYearData[i] = 0
    }

    projects.forEach(project => {
      const dateStr = project.orderDate || project.measurementDate || project.offerDate
      if (dateStr) {
        const date = new Date(dateStr)
        const year = date.getFullYear()
        const month = date.getMonth()

        if (year === currentYear) {
          currentYearData[month] += project.totalAmount || 0
        } else if (year === prevYear) {
          prevYearData[month] += project.totalAmount || 0
        }
      }
    })

    const result = []
    for (let i = 0; i < 12; i++) {
      result.push({
        month: monthNames[i],
        revenue: Math.round(currentYearData[i]),
        prevRevenue: Math.round(prevYearData[i]),
      })
    }

    const yearlyRevenue = result.reduce((sum, m) => sum + m.revenue, 0)
    const prevYearlyRevenue = result.reduce((sum, m) => sum + (m.prevRevenue || 0), 0)

    return { monthlyRevenueData: result, yearlyRevenue, prevYearlyRevenue }
  }, [projects])

  if (!mounted) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="animate-in space-y-6 sm:space-y-8">
      {/* Header: Greeting + Date */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-2xl font-black tracking-tighter text-transparent sm:text-3xl md:text-4xl">
          Willkommen, {getGreetingName()}!
        </h2>
        <div className="glass rounded-2xl border border-white/50 px-5 py-3 text-right shadow-lg">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Heute
          </p>
          <p className="text-sm font-bold text-slate-700 sm:text-base">
            {new Date().toLocaleDateString('de-DE', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Action Bar - compact alerts */}
      <ActionBar projects={projects} />

      {/* KPI Cards Row */}
      <KPICards
        projects={projects}
        openInvoices={openInvoices}
        ticketStats={ticketStats}
      />

      {/* Middle Row: 3 columns (Termine, Rechnungen, Feed) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <UpcomingAppointments appointments={appointments} />
        <OpenInvoicesCard openInvoices={openInvoices} />
        <ActivityFeed
          projects={projects}
          openInvoices={openInvoices}
          appointments={appointments}
        />
      </div>

      {/* Pipeline + Revenue Chart side by side, same height */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Pipeline (~2/5 width, stretches to match chart height) */}
        <div className="lg:col-span-2">
          <div className="glass flex h-full flex-col rounded-2xl border border-white/50 bg-gradient-to-br from-white to-slate-50/30 p-6 shadow-lg sm:rounded-3xl sm:p-8">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-700 sm:text-base">Projekt-Pipeline</h3>
              <Link
                href="/projects"
                className="flex items-center gap-1 text-xs font-bold text-amber-600 transition-colors hover:text-amber-700"
              >
                Alle <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="flex flex-1 flex-col justify-between">
              <ProjectPipeline projects={projects} />
            </div>
          </div>
        </div>

        {/* Revenue Chart (~3/5 width) */}
        <div className="lg:col-span-3">
          <div className="glass flex h-full flex-col rounded-2xl border border-white/50 bg-gradient-to-br from-white to-amber-50/30 p-6 shadow-lg sm:rounded-3xl sm:p-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-700 sm:text-base">
                  Monatlicher Umsatz {new Date().getFullYear()}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {prevYearlyRevenue > 0 ? 'Mit Vorjahresvergleich' : 'Alle 12 Monate im Überblick'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {yearlyRevenue > 0 && (
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Jahresumsatz
                    </p>
                    <p className="text-lg font-black text-emerald-600">
                      {formatCurrency(yearlyRevenue)} €
                    </p>
                    {prevYearlyRevenue > 0 && (
                      <p className="text-[10px] text-slate-400">
                        Vorjahr: {formatCurrency(prevYearlyRevenue)} €
                      </p>
                    )}
                  </div>
                )}
                <Link
                  href="/statistics"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-amber-600"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  Statistiken
                </Link>
              </div>
            </div>
            <div className="min-h-[288px] flex-1">
              {monthlyRevenueData.some(m => m.revenue > 0 || (m.prevRevenue || 0) > 0) ? (
                <RevenueChart
                  data={monthlyRevenueData}
                  formatCurrency={formatCurrency}
                  showPrevYear={prevYearlyRevenue > 0}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-slate-400">
                  <TrendingUp className="mb-4 h-12 w-12 opacity-30" />
                  <p className="font-bold">Noch keine Umsatzdaten</p>
                  <p className="mt-1 text-sm">
                    Erstellen Sie Aufträge mit Datum, um die Performance zu sehen
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
