'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  Clock,
  AlertTriangle,
  TrendingUp,
  Truck,
  Ruler,
  ShoppingCart,
  CalendarClock,
  ArrowRight,
} from 'lucide-react'
import { CustomerProject, ProjectStatus } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/utils/logger'

interface DashboardProps {
  projects: CustomerProject[]
}

const Dashboard: React.FC<DashboardProps> = ({ projects }) => {
  const [mounted, setMounted] = useState(false)
  const { profile } = useAuth()

  // Get greeting name
  const getGreetingName = () => {
    if (profile?.fullName) {
      // Extract first name if full name contains space
      const firstName = profile.fullName.split(' ')[0]
      return firstName
    }
    return 'Chef'
  }

  useEffect(() => {
    logger.debug('Dashboard component mounted', {
      component: 'Dashboard',
      projectCount: projects.length,
    })
    setMounted(true)
  }, [projects])

  // Logik für ausstehende Aufgaben
  const pendingMeasurements = projects.filter(p => !p.isMeasured).length
  const pendingOrders = projects.filter(p => p.isMeasured && !p.isOrdered).length
  const pendingInstallations = projects.filter(p => p.isOrdered && !p.installationDate).length

  const totalRevenue = projects.reduce((acc, p) => acc + p.totalAmount, 0)

  // Format currency with consistent locale to avoid hydration mismatch
  const formatCurrency = (value: number) => {
    return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const stats = [
    {
      label: 'Aktive Projekte',
      value: projects.filter(p => p.status !== ProjectStatus.COMPLETED).length,
      icon: Clock,
      color: 'text-blue-600',
    },
    {
      label: 'Offene Reklamationen',
      value: projects.reduce(
        (acc, p) => acc + (p.complaints?.filter(c => c.status !== 'resolved').length || 0),
        0
      ),
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    {
      label: 'Anstehende Montagen',
      value: projects.filter(p => p.installationDate && !p.isInstallationAssigned).length,
      icon: Truck,
      color: 'text-amber-600',
    },
    {
      label: 'Umsatz Gesamt',
      value: totalRevenue,
      icon: TrendingUp,
      color: 'text-green-600',
      formatCurrency: true,
    },
  ]

  // Calculate monthly revenue from real project data - ALLE 12 MONATE
  const monthlyRevenueData = React.useMemo(() => {
    const monthNames = [
      'Jan',
      'Feb',
      'Mär',
      'Apr',
      'Mai',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Okt',
      'Nov',
      'Dez',
    ]
    const currentYear = new Date().getFullYear()

    // Initialize all months with 0
    const monthlyData: { [key: number]: number } = {}
    for (let i = 0; i < 12; i++) {
      monthlyData[i] = 0
    }

    // Sum revenue by month based on orderDate or measurementDate
    projects.forEach(project => {
      const dateStr = project.orderDate || project.measurementDate || project.offerDate
      if (dateStr) {
        const date = new Date(dateStr)
        // Only include current year
        if (date.getFullYear() === currentYear) {
          const month = date.getMonth()
          monthlyData[month] += project.totalAmount || 0
        }
      }
    })

    // Convert to chart format - ALLE 12 MONATE anzeigen
    const result = []
    for (let i = 0; i < 12; i++) {
      result.push({
        month: monthNames[i],
        revenue: Math.round(monthlyData[i]),
      })
    }

    return result
  }, [projects])

  // Calculate total revenue this year
  const yearlyRevenue = monthlyRevenueData.reduce((sum, m) => sum + m.revenue, 0)

  return (
    <div className="animate-in space-y-6 sm:space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="mb-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-2xl font-black tracking-tighter text-transparent sm:text-4xl md:text-5xl">
            Willkommen, {getGreetingName()}!
          </h2>
        </div>
        {mounted && (
          <div className="glass rounded-2xl px-4 py-3 text-right shadow-lg sm:px-6 sm:py-4">
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Heute ist der
            </p>
            <p className="text-base font-bold text-slate-800 sm:text-lg">
              {new Date().toLocaleDateString('de-DE', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        )}
      </div>

      {/* Action Center - Dringende Aufgaben */}
      <section>
        <div className="mb-6 flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-red-500"></div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
            Handlungsbedarf
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
          <Link
            href="/projects?filter=needs_measurement"
            className="glass card-hover group cursor-pointer rounded-2xl border border-white/50 bg-gradient-to-br from-white to-indigo-50/30 p-5 shadow-xl transition-all duration-300 hover:border-indigo-200/50 hover:shadow-2xl sm:rounded-3xl sm:p-8"
          >
            <div className="mb-3 flex items-start justify-between sm:mb-4">
              <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-3 text-white shadow-lg shadow-indigo-500/30 transition-transform group-hover:scale-110 sm:rounded-2xl sm:p-4">
                <Ruler className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-4xl font-black text-transparent sm:text-5xl">
                {mounted ? pendingMeasurements : '...'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-slate-800 sm:text-lg">Zu Ausmessen</p>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">Kein Aufmaß hinterlegt</p>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 transition-all group-hover:translate-x-1 group-hover:text-indigo-600" />
            </div>
          </Link>

          <Link
            href="/projects?filter=needs_order"
            className="glass card-hover group cursor-pointer rounded-2xl border border-white/50 bg-gradient-to-br from-white to-purple-50/30 p-5 shadow-xl transition-all duration-300 hover:border-purple-200/50 hover:shadow-2xl sm:rounded-3xl sm:p-8"
          >
            <div className="mb-3 flex items-start justify-between sm:mb-4">
              <div className="rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-3 text-white shadow-lg shadow-purple-500/30 transition-transform group-hover:scale-110 sm:rounded-2xl sm:p-4">
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-4xl font-black text-transparent sm:text-5xl">
                {mounted ? pendingOrders : '...'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-slate-800 sm:text-lg">Zu Bestellen</p>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  Aufmaß fertig, Bestellung offen
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 transition-all group-hover:translate-x-1 group-hover:text-purple-600" />
            </div>
          </Link>

          <Link
            href="/calendar?filter=needs_installation"
            className="glass card-hover group cursor-pointer rounded-2xl border border-white/50 bg-gradient-to-br from-white to-amber-50/30 p-5 shadow-xl transition-all duration-300 hover:border-amber-200/50 hover:shadow-2xl sm:rounded-3xl sm:p-8"
          >
            <div className="mb-3 flex items-start justify-between sm:mb-4">
              <div className="rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-3 text-white shadow-lg shadow-amber-500/30 transition-transform group-hover:scale-110 sm:rounded-2xl sm:p-4">
                <CalendarClock className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-4xl font-black text-transparent sm:text-5xl">
                {mounted ? pendingInstallations : '...'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-slate-800 sm:text-lg">Terminierung offen</p>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  Bestellt, kein Montagetermin
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 transition-all group-hover:translate-x-1 group-hover:text-amber-600" />
            </div>
          </Link>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => {
          // Determine link based on stat label
          const getLink = () => {
            if (stat.label === 'Aktive Projekte') return '/projects'
            if (stat.label === 'Offene Reklamationen') return '/complaints?status=reported'
            if (stat.label === 'Anstehende Montagen') return '/calendar'
            if (stat.label === 'Umsatz Gesamt') return '/invoices'
            return '#'
          }

          const link = getLink()
          const StatContent = (
            <div className="glass card-hover group flex items-center gap-5 rounded-2xl border border-white/50 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-lg transition-all duration-300 hover:shadow-xl">
              <div
                className={`rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 p-4 ${stat.color} shadow-md`}
              >
                <stat.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {stat.label}
                </p>
                <p className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-2xl font-black text-transparent">
                  {mounted
                    ? stat.formatCurrency
                      ? `${formatCurrency(stat.value as number)}€`
                      : stat.value
                    : '...'}
                </p>
              </div>
              {link !== '#' && (
                <ArrowRight className="h-5 w-5 text-slate-400 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
              )}
            </div>
          )

          return link !== '#' ? (
            <Link key={idx} href={link} className="block">
              {StatContent}
            </Link>
          ) : (
            <div key={idx}>{StatContent}</div>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-8">
        <div className="glass rounded-3xl border border-white/50 bg-gradient-to-br from-white to-slate-50/50 p-10 shadow-xl">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h3 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-2xl font-black tracking-tight text-transparent">
                Monatlicher Umsatz {new Date().getFullYear()}
              </h3>
              <p className="mt-1 text-sm text-slate-500">Alle 12 Monate im Überblick</p>
            </div>
            <div className="text-right">
              {mounted && yearlyRevenue > 0 && (
                <>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Jahresumsatz
                  </p>
                  <p className="text-xl font-black text-emerald-600">
                    {formatCurrency(yearlyRevenue)} €
                  </p>
                </>
              )}
              <Link
                href="/statistics"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-amber-600"
              >
                <ArrowRight className="h-4 w-4" />
                Detaillierte Statistiken
              </Link>
            </div>
          </div>
          <div className="h-80 min-h-[320px] w-full" style={{ minHeight: '320px', width: '100%' }}>
            {mounted &&
              (monthlyRevenueData.length > 0 && monthlyRevenueData.some(m => m.revenue > 0) ? (
                <div style={{ width: '100%', height: '320px', minHeight: '320px' }}>
                  <ResponsiveContainer width="100%" height={320} minHeight={320}>
                    <BarChart
                      data={monthlyRevenueData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }}
                        interval={0}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }}
                        tickFormatter={value => `${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{
                          borderRadius: '15px',
                          border: 'none',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                        }}
                        formatter={value => [`${formatCurrency(value as number)} €`, 'Umsatz']}
                      />
                      <Bar dataKey="revenue" fill="#f59e0b" radius={[8, 8, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-slate-400">
                  <TrendingUp className="mb-4 h-12 w-12 opacity-30" />
                  <p className="font-bold">Noch keine Umsatzdaten</p>
                  <p className="mt-1 text-sm">
                    Erstellen Sie Aufträge mit Datum, um die Performance zu sehen
                  </p>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
