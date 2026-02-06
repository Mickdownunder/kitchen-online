'use client'

import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { CustomerProject } from '@/types'
import { DateFilter } from './utils/revenueCalculations'
import { calculateMarginOnlyWithPurchase } from '@/lib/utils/priceCalculations'
import { Download, DollarSign, FolderOpen, TrendingUp, Percent } from 'lucide-react'
import { StatCard, ChartContainer } from '@/components/ui'

interface ProjectsTabProps {
  projects: CustomerProject[]
  filter: DateFilter
}

const ProjectsTab: React.FC<ProjectsTabProps> = ({ projects, filter }) => {
  const formatCurrency = (value: number) => {
    return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Filter projects by date
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const dateStr = p.orderDate || p.measurementDate || p.offerDate
      if (!dateStr) return false
      const date = new Date(dateStr)

      if (filter.year !== 'all' && filter.year !== undefined) {
        if (date.getFullYear() !== filter.year) return false
      }

      if (filter.month !== 'all' && filter.month !== undefined) {
        if (date.getMonth() + 1 !== filter.month) return false
      }

      return true
    })
  }, [projects, filter])

  // Monthly sold revenue
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
    const monthly: { [key: number]: { revenue: number; count: number } } = {}

    for (let i = 0; i < 12; i++) {
      monthly[i] = { revenue: 0, count: 0 }
    }

    const year =
      filter.year === 'all' ? new Date().getFullYear() : filter.year || new Date().getFullYear()

    filteredProjects.forEach(project => {
      const dateStr = project.orderDate || project.measurementDate || project.offerDate
      if (dateStr) {
        const date = new Date(dateStr)
        if (date.getFullYear() === year) {
          const month = date.getMonth()
          monthly[month].revenue += project.totalAmount || 0
          monthly[month].count += 1
        }
      }
    })

    return monthNames.map((month, index) => ({
      month,
      revenue: Math.round(monthly[index].revenue),
      count: monthly[index].count,
    }))
  }, [filteredProjects, filter.year])

  // Status distribution
  const statusDistribution = useMemo(() => {
    const statusCounts: { [key: string]: number } = {}
    filteredProjects.forEach(p => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
    })
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
  }, [filteredProjects])

  // Top customers by revenue
  const topCustomers = useMemo(() => {
    const customerRevenue: { [key: string]: { name: string; revenue: number; projects: number } } =
      {}

    filteredProjects.forEach(p => {
      if (!customerRevenue[p.customerName]) {
        customerRevenue[p.customerName] = {
          name: p.customerName,
          revenue: 0,
          projects: 0,
        }
      }
      customerRevenue[p.customerName].revenue += p.totalAmount
      customerRevenue[p.customerName].projects += 1
    })

    return Object.values(customerRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(c => ({
        ...c,
        avgValue: c.projects > 0 ? c.revenue / c.projects : 0,
      }))
  }, [filteredProjects])

  // Calculate statistics (Marge nur wo EK erfasst)
  const stats = useMemo(() => {
    const totalRevenue = filteredProjects.reduce((sum, p) => sum + (p.totalAmount || 0), 0)
    const totalNet = filteredProjects.reduce((acc, p) => acc + (p.netAmount || 0), 0)
    let totalPurchasePrice = 0
    let grossMargin = 0
    let netWithPurchase = 0
    filteredProjects.forEach(p => {
      const { margin, netWithPurchase: nwp } = calculateMarginOnlyWithPurchase(p.items || [])
      if (nwp > 0) {
        grossMargin += margin
        netWithPurchase += nwp
        totalPurchasePrice += (p.items || []).reduce((s, i) => {
          const q = i.quantity || 1
          const pp =
            i.purchasePricePerUnit && i.purchasePricePerUnit > 0 ? i.purchasePricePerUnit : 0
          return s + q * pp
        }, 0)
      }
    })
    const marginPercent = netWithPurchase > 0 ? (grossMargin / netWithPurchase) * 100 : null
    const avgProjectValue = filteredProjects.length > 0 ? totalRevenue / filteredProjects.length : 0

    return {
      totalRevenue,
      totalNet,
      totalPurchasePrice,
      grossMargin,
      marginPercent,
      avgProjectValue,
      projectCount: filteredProjects.length,
    }
  }, [filteredProjects])

  const COLORS = [
    '#f59e0b',
    '#3b82f6',
    '#10b981',
    '#ef4444',
    '#6366f1',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
    '#8b5cf6',
  ]

  const handleExportCSV = (data: Record<string, unknown>[], filename: string) => {
    const headers = Object.keys(data[0] || {})
    const csv = [
      headers.join(';'),
      ...data.map(row =>
        headers
          .map(header => {
            const value = row[header]
            return typeof value === 'string' ? `"${value}"` : value
          })
          .join(';')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <StatCard
          icon={DollarSign}
          iconColor="blue"
          value={`${formatCurrency(stats.totalRevenue)} €`}
          label="Verkaufter Umsatz"
          tint="blue"
        />
        <StatCard
          icon={FolderOpen}
          iconColor="amber"
          value={stats.projectCount}
          label="Projekte"
          tint="amber"
        />
        <StatCard
          icon={TrendingUp}
          iconColor="emerald"
          value={`${formatCurrency(stats.avgProjectValue)} €`}
          label="Ø Projektwert"
          tint="emerald"
        />
        <StatCard
          icon={Percent}
          iconColor="purple"
          value={stats.marginPercent != null ? `${stats.marginPercent.toFixed(1)}%` : '—'}
          label="Marge"
          subtitle={
            stats.marginPercent != null ? formatCurrency(stats.grossMargin) + ' €' : 'EK erfassen'
          }
          tint="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ChartContainer
          title="Verkaufter Umsatz nach Monaten"
          subtitle="Auftragsvolumen"
          action={
            <button
              onClick={() => handleExportCSV(monthlyData, 'umsatz_projekte')}
              className="rounded-lg p-2 transition-all hover:bg-slate-100"
              title="Als CSV exportieren"
            >
              <Download className="h-4 w-4 text-slate-400" />
            </button>
          }
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                  formatter={(value: number) => [`${formatCurrency(value)} €`, 'Umsatz']}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Umsatz" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>

        <ChartContainer
          title="Projektanzahl nach Monaten"
          subtitle="Anzahl neuer Aufträge"
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    borderRadius: '15px',
                    border: 'none',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                  }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} name="Projekte" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>
      </div>

      {/* Status Distribution & Top Customers */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ChartContainer title="Projekt-Status Verteilung">
          <div className="h-64">
            {statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '15px',
                      border: 'none',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">
                Keine Daten
              </div>
            )}
          </div>
        </ChartContainer>

        <ChartContainer
          title="Top 10 Kunden nach Umsatz"
          subtitle="Auftragsvolumen"
          action={
            <button
              onClick={() => handleExportCSV(topCustomers, 'top_kunden')}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                    Rang
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                    Kunde
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">
                    Umsatz
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">
                    Projekte
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">
                    Ø Wert
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topCustomers.length > 0 ? (
                  topCustomers.map((customer, index) => (
                    <tr key={index} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-sm font-black text-white">
                          {index + 1}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-black text-slate-900">{customer.name}</p>
                      </td>
                      <td className="px-4 py-4 text-right font-black text-slate-900">
                        {formatCurrency(customer.revenue)} €
                      </td>
                      <td className="px-4 py-4 text-right text-slate-600">{customer.projects}</td>
                      <td className="px-4 py-4 text-right text-slate-600">
                        {formatCurrency(customer.avgValue)} €
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      Keine Daten für den ausgewählten Zeitraum
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ChartContainer>
      </div>
    </div>
  )
}

export default ProjectsTab
