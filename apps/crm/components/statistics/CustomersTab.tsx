'use client'

import React, { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CustomerProject } from '@/types'
import { DateFilter } from './utils/revenueCalculations'
import { Download, Users, TrendingUp } from 'lucide-react'

interface CustomersTabProps {
  projects: CustomerProject[]
  filter: DateFilter
}

const CustomersTab: React.FC<CustomersTabProps> = ({ projects, filter }) => {
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

  // Top 15 customers by total revenue
  const topCustomers = useMemo(() => {
    const customerData: {
      [key: string]: {
        name: string
        revenue: number
        projects: number
        firstOrderDate?: string
        lastOrderDate?: string
      }
    } = {}

    filteredProjects.forEach(p => {
      if (!customerData[p.customerName]) {
        customerData[p.customerName] = {
          name: p.customerName,
          revenue: 0,
          projects: 0,
          firstOrderDate: undefined,
          lastOrderDate: undefined,
        }
      }
      customerData[p.customerName].revenue += p.totalAmount
      customerData[p.customerName].projects += 1

      const orderDate = p.orderDate || p.measurementDate || p.offerDate
      if (orderDate) {
        if (
          !customerData[p.customerName].firstOrderDate ||
          orderDate < customerData[p.customerName].firstOrderDate!
        ) {
          customerData[p.customerName].firstOrderDate = orderDate
        }
        if (
          !customerData[p.customerName].lastOrderDate ||
          orderDate > customerData[p.customerName].lastOrderDate!
        ) {
          customerData[p.customerName].lastOrderDate = orderDate
        }
      }
    })

    return Object.values(customerData)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15)
      .map(c => ({
        ...c,
        avgValue: c.projects > 0 ? c.revenue / c.projects : 0,
        ltv: c.revenue, // Lifetime Value = total revenue
      }))
  }, [filteredProjects])

  // Customer growth (new vs. existing)
  const customerGrowth = useMemo(() => {
    const year =
      filter.year === 'all' ? new Date().getFullYear() : filter.year || new Date().getFullYear()
    const previousYear = year - 1

    const currentYearCustomers = new Set<string>()
    const previousYearCustomers = new Set<string>()

    filteredProjects.forEach(p => {
      const orderDate = p.orderDate || p.measurementDate || p.offerDate
      if (orderDate) {
        const date = new Date(orderDate)
        if (date.getFullYear() === year) {
          currentYearCustomers.add(p.customerName)
        }
        if (date.getFullYear() === previousYear) {
          previousYearCustomers.add(p.customerName)
        }
      }
    })

    const newCustomers = Array.from(currentYearCustomers).filter(c => !previousYearCustomers.has(c))
    const existingCustomers = Array.from(currentYearCustomers).filter(c =>
      previousYearCustomers.has(c)
    )

    return {
      new: newCustomers.length,
      existing: existingCustomers.length,
      total: currentYearCustomers.size,
    }
  }, [filteredProjects, filter.year])

  // Average customer value
  const avgCustomerValue = useMemo(() => {
    const customerRevenue: { [key: string]: number } = {}
    filteredProjects.forEach(p => {
      customerRevenue[p.customerName] = (customerRevenue[p.customerName] || 0) + p.totalAmount
    })
    const totalRevenue = Object.values(customerRevenue).reduce((sum, rev) => sum + rev, 0)
    const customerCount = Object.keys(customerRevenue).length
    return customerCount > 0 ? totalRevenue / customerCount : 0
  }, [filteredProjects])

  // Customer revenue chart data
  const customerChartData = useMemo(() => {
    return topCustomers.slice(0, 10).map(c => ({
      name: c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
      revenue: Math.round(c.revenue),
    }))
  }, [topCustomers])

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
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-blue-50/30 p-6 shadow-lg">
          <div className="mb-2 flex items-center gap-3">
            <Users className="h-6 w-6 text-blue-600" />
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Kunden gesamt
            </p>
          </div>
          <p className="text-3xl font-black text-slate-900">{customerGrowth.total}</p>
          <p className="mt-1 text-xs text-slate-500">
            {customerGrowth.new} neu, {customerGrowth.existing} Bestand
          </p>
        </div>
        <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-emerald-50/30 p-6 shadow-lg">
          <div className="mb-2 flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Ø Kundenwert
            </p>
          </div>
          <p className="text-3xl font-black text-slate-900">{formatCurrency(avgCustomerValue)} €</p>
        </div>
        <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-purple-50/30 p-6 shadow-lg">
          <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">
            Top Kunde LTV
          </p>
          <p className="text-3xl font-black text-slate-900">
            {topCustomers.length > 0 ? formatCurrency(topCustomers[0].ltv) : '0'} €
          </p>
          {topCustomers.length > 0 && (
            <p className="mt-1 text-xs text-slate-500">{topCustomers[0].name}</p>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Top 10 Kunden nach Umsatz */}
        <div className="glass rounded-3xl border border-white/50 bg-gradient-to-br from-white to-slate-50/50 p-8 shadow-xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-2xl font-black text-transparent">
                Top 10 Kunden nach Umsatz
              </h3>
              <p className="mt-1 text-sm text-slate-500">Gesamtumsatz pro Kunde</p>
            </div>
            <button
              onClick={() => handleExportCSV(customerChartData, 'top_kunden_umsatz')}
              className="rounded-lg p-2 transition-all hover:bg-slate-100"
              title="Als CSV exportieren"
            >
              <Download className="h-4 w-4 text-slate-400" />
            </button>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={customerChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }}
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
                  formatter={(value: any) => [`${formatCurrency(value)} €`, 'Umsatz']}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Umsatz" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Kunden-Wachstum */}
        <div className="glass rounded-3xl border border-white/50 bg-gradient-to-br from-white to-slate-50/50 p-8 shadow-xl">
          <div className="mb-6">
            <h3 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-2xl font-black text-transparent">
              Kunden-Wachstum
            </h3>
            <p className="mt-1 text-sm text-slate-500">Neue vs. Bestandskunden</p>
          </div>
          <div className="flex h-80 items-center justify-center">
            <div className="text-center">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="mb-2 text-5xl font-black text-emerald-600">
                    {customerGrowth.new}
                  </div>
                  <div className="text-sm font-bold uppercase tracking-widest text-slate-600">
                    Neue Kunden
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-5xl font-black text-blue-600">
                    {customerGrowth.existing}
                  </div>
                  <div className="text-sm font-bold uppercase tracking-widest text-slate-600">
                    Bestandskunden
                  </div>
                </div>
              </div>
              <div className="mt-8 border-t border-slate-200 pt-8">
                <div className="text-3xl font-black text-slate-900">{customerGrowth.total}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-slate-500">Gesamt</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top 15 Kunden Tabelle */}
      <div className="glass rounded-3xl border border-white/50 bg-gradient-to-br from-white to-slate-50/50 p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-2xl font-black text-transparent">
              Top 15 Kunden nach Gesamtumsatz
            </h3>
            <p className="mt-1 text-sm text-slate-500">Kunden-Lebenszeitwert (LTV)</p>
          </div>
          <button
            onClick={() => handleExportCSV(topCustomers, 'top_kunden_ltv')}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
        </div>
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
                  Gesamtumsatz
                </th>
                <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">
                  Projekte
                </th>
                <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">
                  Ø Wert
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                  Erstes Projekt
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
                    <td className="px-4 py-4 text-slate-600">
                      {customer.firstOrderDate
                        ? new Date(customer.firstOrderDate).toLocaleDateString('de-DE')
                        : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Keine Daten für den ausgewählten Zeitraum
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default CustomersTab
