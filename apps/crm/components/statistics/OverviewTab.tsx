'use client'

import React, { useMemo } from 'react'
import {
  DollarSign,
  ReceiptText,
  CreditCard,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Link2 as LinkIcon,
} from 'lucide-react'
import { CustomerProject, Invoice } from '@/types'
import {
  calculateSoldRevenue,
  DateFilter,
  calculateInvoicedRevenueFromInvoices,
  calculateReceivedMoneyFromInvoices,
  calculateOutstandingFromInvoices,
  calculateMonthlySoldFromProjects,
  calculateMonthlyInvoicedFromInvoices,
  calculateMonthlyReceivedFromInvoices,
} from './utils/revenueCalculations'
import {
  ComposedChart,
  Bar,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import Link from 'next/link'

interface OverviewTabProps {
  projects: CustomerProject[]
  invoices: Invoice[]
  filter: DateFilter
  compareWithPrevious: boolean
  previousFilter?: DateFilter
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  projects,
  invoices,
  filter,
  compareWithPrevious,
  previousFilter,
}) => {
  const formatCurrency = (value: number) => {
    return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatPercent = (value: number) => {
    if (value === Infinity || isNaN(value)) return '+0%'
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  // Current period metrics - using invoice-based functions
  const currentMetrics = useMemo(() => {
    return {
      soldRevenue: calculateSoldRevenue(projects, filter),
      invoicedRevenue: calculateInvoicedRevenueFromInvoices(invoices, filter),
      receivedMoney: calculateReceivedMoneyFromInvoices(invoices, filter),
      outstanding: calculateOutstandingFromInvoices(invoices),
    }
  }, [projects, invoices, filter])

  // Previous period metrics
  const previousMetrics = useMemo(() => {
    if (!compareWithPrevious || !previousFilter) {
      return {
        soldRevenue: 0,
        invoicedRevenue: 0,
        receivedMoney: 0,
        outstanding: 0,
      }
    }
    return {
      soldRevenue: calculateSoldRevenue(projects, previousFilter),
      invoicedRevenue: calculateInvoicedRevenueFromInvoices(invoices, previousFilter),
      receivedMoney: calculateReceivedMoneyFromInvoices(invoices, previousFilter),
      outstanding: calculateOutstandingFromInvoices(invoices),
    }
  }, [projects, invoices, compareWithPrevious, previousFilter])

  // Calculate changes
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  const changes = {
    soldRevenue: calculateChange(currentMetrics.soldRevenue, previousMetrics.soldRevenue),
    invoicedRevenue: calculateChange(
      currentMetrics.invoicedRevenue,
      previousMetrics.invoicedRevenue
    ),
    receivedMoney: calculateChange(currentMetrics.receivedMoney, previousMetrics.receivedMoney),
    outstanding: calculateChange(currentMetrics.outstanding, previousMetrics.outstanding),
  }

  // Monthly data for charts - from invoices table
  const monthlyData = useMemo(() => {
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

    const year =
      filter.year === 'all' ? new Date().getFullYear() : filter.year || new Date().getFullYear()

    // Get monthly data from projects (sold) and invoices (invoiced, received)
    const monthlySold = calculateMonthlySoldFromProjects(projects, year)
    const monthlyInvoiced = calculateMonthlyInvoicedFromInvoices(invoices, year)
    const monthlyReceived = calculateMonthlyReceivedFromInvoices(invoices, year)

    return monthNames.map((month, index) => ({
      month,
      sold: Math.round(monthlySold[index] || 0),
      invoiced: Math.round(monthlyInvoiced[index] || 0),
      received: Math.round(monthlyReceived[index] || 0),
    }))
  }, [projects, invoices, filter.year])

  return (
    <div className="space-y-8">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Verkaufter Umsatz */}
        <div className="glass group relative cursor-pointer overflow-hidden rounded-2xl border border-white/50 bg-gradient-to-br from-white to-blue-50/30 p-6 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-blue-100 opacity-20 transition-opacity duration-300 group-hover:opacity-30"></div>
          <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-xl bg-blue-100 p-3">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              {compareWithPrevious && (
                <div
                  className={`flex items-center gap-1 text-xs font-black ${changes.soldRevenue >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {changes.soldRevenue >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {formatPercent(changes.soldRevenue)}
                </div>
              )}
            </div>
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">
              Verkaufter Umsatz
            </p>
            <p className="mb-1 text-3xl font-black text-slate-900">
              {formatCurrency(currentMetrics.soldRevenue)} €
            </p>
            <p className="text-xs text-slate-500">Auftragsvolumen</p>
            {compareWithPrevious && previousMetrics.soldRevenue > 0 && (
              <p className="mt-1 text-xs text-slate-400">
                Vorperiode: {formatCurrency(previousMetrics.soldRevenue)} €
              </p>
            )}
            <Link
              href="/statistics?tab=projects"
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              <LinkIcon className="h-3 w-3" /> Details
            </Link>
          </div>
        </div>

        {/* Buchhalterischer Umsatz */}
        <div className="glass group relative cursor-pointer overflow-hidden rounded-2xl border border-white/50 bg-gradient-to-br from-white to-purple-50/30 p-6 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-purple-100 opacity-20 transition-opacity duration-300 group-hover:opacity-30"></div>
          <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-xl bg-purple-100 p-3">
                <ReceiptText className="h-6 w-6 text-purple-600" />
              </div>
              {compareWithPrevious && (
                <div
                  className={`flex items-center gap-1 text-xs font-black ${changes.invoicedRevenue >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {changes.invoicedRevenue >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {formatPercent(changes.invoicedRevenue)}
                </div>
              )}
            </div>
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">
              Buchhalterischer Umsatz
            </p>
            <p className="mb-1 text-3xl font-black text-slate-900">
              {formatCurrency(currentMetrics.invoicedRevenue)} €
            </p>
            <p className="text-xs text-slate-500">Fakturierte Rechnungen</p>
            {compareWithPrevious && previousMetrics.invoicedRevenue > 0 && (
              <p className="mt-1 text-xs text-slate-400">
                Vorperiode: {formatCurrency(previousMetrics.invoicedRevenue)} €
              </p>
            )}
            <Link
              href="/statistics?tab=invoices"
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700"
            >
              <LinkIcon className="h-3 w-3" /> Details
            </Link>
          </div>
        </div>

        {/* Eingegangenes Geld */}
        <div className="glass group relative cursor-pointer overflow-hidden rounded-2xl border border-white/50 bg-gradient-to-br from-white to-emerald-50/30 p-6 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-emerald-100 opacity-20 transition-opacity duration-300 group-hover:opacity-30"></div>
          <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-xl bg-emerald-100 p-3">
                <CreditCard className="h-6 w-6 text-emerald-600" />
              </div>
              {compareWithPrevious && (
                <div
                  className={`flex items-center gap-1 text-xs font-black ${changes.receivedMoney >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {changes.receivedMoney >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {formatPercent(changes.receivedMoney)}
                </div>
              )}
            </div>
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">
              Eingegangen
            </p>
            <p className="mb-1 text-3xl font-black text-slate-900">
              {formatCurrency(currentMetrics.receivedMoney)} €
            </p>
            <p className="text-xs text-slate-500">Cash Flow</p>
            {compareWithPrevious && previousMetrics.receivedMoney > 0 && (
              <p className="mt-1 text-xs text-slate-400">
                Vorperiode: {formatCurrency(previousMetrics.receivedMoney)} €
              </p>
            )}
            <Link
              href="/statistics?tab=invoices"
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
            >
              <LinkIcon className="h-3 w-3" /> Details
            </Link>
          </div>
        </div>

        {/* Offene Forderungen */}
        <div className="glass group relative cursor-pointer overflow-hidden rounded-2xl border border-white/50 bg-gradient-to-br from-white to-amber-50/30 p-6 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-amber-100 opacity-20 transition-opacity duration-300 group-hover:opacity-30"></div>
          <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-xl bg-amber-100 p-3">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              {compareWithPrevious && (
                <div
                  className={`flex items-center gap-1 text-xs font-black ${changes.outstanding >= 0 ? 'text-red-600' : 'text-green-600'}`}
                >
                  {changes.outstanding >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {formatPercent(Math.abs(changes.outstanding))}
                </div>
              )}
            </div>
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">
              Offen
            </p>
            <p className="mb-1 text-3xl font-black text-slate-900">
              {formatCurrency(currentMetrics.outstanding)} €
            </p>
            <p className="text-xs text-slate-500">Forderungen</p>
            {compareWithPrevious && previousMetrics.outstanding > 0 && (
              <p className="mt-1 text-xs text-slate-400">
                Vorperiode: {formatCurrency(previousMetrics.outstanding)} €
              </p>
            )}
            <Link
              href="/statistics?tab=invoices"
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
            >
              <LinkIcon className="h-3 w-3" /> Details
            </Link>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Umsatz-Vergleich */}
        <div className="glass rounded-3xl border border-white/50 bg-gradient-to-br from-white to-slate-50/50 p-8 shadow-xl">
          <div className="mb-6">
            <h3 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-2xl font-black text-transparent">
              Umsatz-Vergleich
            </h3>
            <p className="mt-1 text-sm text-slate-500">Verkauft vs. Fakturiert vs. Eingegangen</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={monthlyData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }}
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
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name?: string) => {
                    const labels: { [key: string]: string } = {
                      sold: 'Verkauft',
                      invoiced: 'Fakturiert',
                      received: 'Eingegangen',
                    }
                    return [`${formatCurrency(value)} €`, labels[name || ''] || name]
                  }}
                />
                <Legend />
                <Bar dataKey="sold" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Verkauft" />
                <Bar dataKey="invoiced" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Fakturiert" />
                <Bar dataKey="received" fill="#10b981" radius={[8, 8, 0, 0]} name="Eingegangen" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cash Flow Trend */}
        <div className="glass rounded-3xl border border-white/50 bg-gradient-to-br from-white to-slate-50/50 p-8 shadow-xl">
          <div className="mb-6">
            <h3 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-2xl font-black text-transparent">
              Cash Flow Trend
            </h3>
            <p className="mt-1 text-sm text-slate-500">Eingegangenes Geld pro Monat</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }}
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
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [`${formatCurrency(value)} €`, 'Eingegangen']}
                />
                <Area
                  type="monotone"
                  dataKey="received"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorReceived)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OverviewTab
