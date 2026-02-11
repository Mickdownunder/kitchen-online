'use client'

import React, { useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  TrendingUp,
  ArrowRight,
  Loader2,
  CalendarClock,
  AlertTriangle,
  MessageSquareWarning,
  ReceiptText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { CustomerProject, Invoice, PlanningAppointment } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { TicketStats } from './dashboard/types'
import ActionBar from './dashboard/ActionBar'
import KPICards from './dashboard/KPICards'
import MorningReadinessBoard from './dashboard/MorningReadinessBoard'
import ProjectPipeline from './dashboard/ProjectPipeline'
import UpcomingAppointments from './dashboard/UpcomingAppointments'
import OpenInvoicesCard from './dashboard/OpenInvoicesCard'
import ActivityFeed from './dashboard/ActivityFeed'
import { getUpcomingInstallationMaterialSnapshots } from '@/lib/utils/materialTracking'

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
  const [showBusinessOverview, setShowBusinessOverview] = useState(false)
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

  const today = useMemo(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  }, [])

  const overdueInvoices = useMemo(() => {
    return openInvoices.filter((inv) => {
      if (!inv.dueDate) return false
      return new Date(inv.dueDate) < today
    })
  }, [openInvoices, today])

  const overdueAmount = useMemo(
    () => overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0),
    [overdueInvoices],
  )

  const openTicketCount = ticketStats.open + ticketStats.inProgress

  const criticalMaterialCount = useMemo(
    () =>
      getUpcomingInstallationMaterialSnapshots(projects, 14).filter((p) => p.riskLevel === 'critical')
        .length,
    [projects],
  )

  const todayAppointmentsCount = useMemo(() => {
    return appointments.filter((appointment) => {
      if (!appointment.date) return false
      const appointmentDate = new Date(appointment.date)
      if (Number.isNaN(appointmentDate.getTime())) return false
      appointmentDate.setHours(0, 0, 0, 0)
      return appointmentDate.getTime() === today.getTime()
    }).length
  }, [appointments, today])

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

      {/* Morning focus: decisions in <60 seconds */}
      <section className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-red-50/30 p-5 shadow-lg sm:rounded-3xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500">
              Morgen-Fokus
            </p>
            <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">
              Was brennt heute?
            </h3>
          </div>
          <Link
            href="/orders?queue=brennt"
            className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-red-600 transition-colors hover:text-red-700"
          >
            Risiko-Details <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Link
            href="/invoices"
            className="rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 transition-colors hover:bg-red-100/70"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-wider text-red-600">
                Überfällige Rechnungen
              </p>
              <ReceiptText className="h-4 w-4 text-red-500" />
            </div>
            <p className="mt-2 text-2xl font-black text-red-700">{overdueInvoices.length}</p>
            <p className="text-xs font-semibold text-red-600">{formatCurrency(overdueAmount)} €</p>
          </Link>

          <Link
            href="/tickets"
            className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 transition-colors hover:bg-amber-100/70"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                Offene Tickets
              </p>
              <MessageSquareWarning className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-amber-700">{openTicketCount}</p>
            <p className="text-xs font-semibold text-amber-700">Support & Service</p>
          </Link>

          <Link
            href="/orders?queue=brennt"
            className="rounded-xl border border-purple-200 bg-purple-50/70 px-4 py-3 transition-colors hover:bg-purple-100/70"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-wider text-purple-700">
                Kritische Montagen
              </p>
              <AlertTriangle className="h-4 w-4 text-purple-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-purple-700">{criticalMaterialCount}</p>
            <p className="text-xs font-semibold text-purple-700">Nächste 14 Tage</p>
          </Link>

          <Link
            href="/calendar"
            className="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 transition-colors hover:bg-blue-100/70"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                Termine heute
              </p>
              <CalendarClock className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-blue-700">{todayAppointmentsCount}</p>
            <p className="text-xs font-semibold text-blue-700">Kalender heute</p>
          </Link>
        </div>
      </section>

      {/* Morning cockpit: material readiness for upcoming installations */}
      <MorningReadinessBoard projects={projects} />

      <section className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-slate-50/40 p-4 shadow-lg sm:rounded-3xl sm:p-5">
        <button
          type="button"
          onClick={() => setShowBusinessOverview((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:bg-slate-50"
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Sekundär
            </p>
            <p className="text-sm font-black text-slate-800">Business-Überblick</p>
          </div>
          {showBusinessOverview ? (
            <ChevronUp className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          )}
        </button>

        {showBusinessOverview && (
          <div className="mt-5 space-y-6">
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
        )}
      </section>
    </div>
  )
}

export default Dashboard
