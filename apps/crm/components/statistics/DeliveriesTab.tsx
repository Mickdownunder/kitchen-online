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
import { DeliveryNote, CustomerDeliveryNote } from '@/types'
import { DateFilter } from './utils/revenueCalculations'
import { Download, Package, Truck, Layers } from 'lucide-react'
import { StatCard, ChartContainer } from '@/components/ui'

interface DeliveriesTabProps {
  supplierDeliveryNotes: DeliveryNote[]
  customerDeliveryNotes: CustomerDeliveryNote[]
  filter: DateFilter
}

const DeliveriesTab: React.FC<DeliveriesTabProps> = ({
  supplierDeliveryNotes,
  customerDeliveryNotes,
  filter,
}) => {
  // Filter delivery notes by date
  const filteredSupplier = useMemo(() => {
    return supplierDeliveryNotes.filter(n => {
      const date = new Date(n.deliveryDate)
      if (filter.year !== 'all' && filter.year !== undefined) {
        if (date.getFullYear() !== filter.year) return false
      }
      if (filter.month !== 'all' && filter.month !== undefined) {
        if (date.getMonth() + 1 !== filter.month) return false
      }
      return true
    })
  }, [supplierDeliveryNotes, filter])

  const filteredCustomer = useMemo(() => {
    return customerDeliveryNotes.filter(n => {
      const date = new Date(n.deliveryDate)
      if (filter.year !== 'all' && filter.year !== undefined) {
        if (date.getFullYear() !== filter.year) return false
      }
      if (filter.month !== 'all' && filter.month !== undefined) {
        if (date.getMonth() + 1 !== filter.month) return false
      }
      return true
    })
  }, [customerDeliveryNotes, filter])

  // Monthly data
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
    const monthly: { [key: number]: { supplier: number; customer: number } } = {}

    for (let i = 0; i < 12; i++) {
      monthly[i] = { supplier: 0, customer: 0 }
    }

    const year =
      filter.year === 'all' ? new Date().getFullYear() : filter.year || new Date().getFullYear()

    filteredSupplier.forEach(n => {
      const date = new Date(n.deliveryDate)
      if (date.getFullYear() === year) {
        const month = date.getMonth()
        monthly[month].supplier += 1
      }
    })

    filteredCustomer.forEach(n => {
      const date = new Date(n.deliveryDate)
      if (date.getFullYear() === year) {
        const month = date.getMonth()
        monthly[month].customer += 1
      }
    })

    return monthNames.map((month, index) => ({
      month,
      supplier: monthly[index].supplier,
      customer: monthly[index].customer,
      total: monthly[index].supplier + monthly[index].customer,
    }))
  }, [filteredSupplier, filteredCustomer, filter.year])

  // Status distribution for supplier notes
  const supplierStatusDistribution = useMemo(() => {
    const statusCounts: { [key: string]: number } = {}
    filteredSupplier.forEach(n => {
      statusCounts[n.status] = (statusCounts[n.status] || 0) + 1
    })
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
  }, [filteredSupplier])

  // Top suppliers (by count)
  const topSuppliers = useMemo(() => {
    const supplierCounts: { [key: string]: number } = {}
    filteredSupplier.forEach(n => {
      supplierCounts[n.supplierName] = (supplierCounts[n.supplierName] || 0) + 1
    })
    return Object.entries(supplierCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [filteredSupplier])

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
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          icon={Package}
          iconColor="amber"
          value={filteredSupplier.length}
          label="Lieferanten-Lieferscheine"
          tint="amber"
        />
        <StatCard
          icon={Truck}
          iconColor="blue"
          value={filteredCustomer.length}
          label="Kunden-Lieferscheine"
          tint="blue"
        />
        <StatCard
          icon={Layers}
          iconColor="slate"
          value={filteredSupplier.length + filteredCustomer.length}
          label="Gesamt"
          tint="slate"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ChartContainer
          title="Anzahl Lieferscheine nach Monaten"
          subtitle="Kunden vs. Lieferanten"
          action={
            <button
              onClick={() => handleExportCSV(monthlyData, 'lieferscheine_monatlich')}
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
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    borderRadius: '15px',
                    border: 'none',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                  }}
                />
                <Legend />
                <Bar dataKey="supplier" fill="#f59e0b" radius={[8, 8, 0, 0]} name="Lieferanten" />
                <Bar dataKey="customer" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Kunden" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>

        <ChartContainer title="Status-Verteilung (Lieferanten)">
          <div className="h-64">
            {supplierStatusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={supplierStatusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {supplierStatusDistribution.map((entry, index) => (
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
      </div>

      <ChartContainer
        title="Top 10 Lieferanten"
        subtitle="Nach Anzahl Lieferscheine"
        action={
          <button
            onClick={() => handleExportCSV(topSuppliers, 'top_lieferanten')}
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
                  Lieferant
                </th>
                <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">
                  Anzahl
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topSuppliers.length > 0 ? (
                topSuppliers.map((supplier, index) => (
                  <tr key={index} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-sm font-black text-white">
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-black text-slate-900">{supplier.name}</p>
                    </td>
                    <td className="px-4 py-4 text-right font-black text-slate-900">
                      {supplier.count}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                    Keine Daten für den ausgewählten Zeitraum
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartContainer>
    </div>
  )
}

export default DeliveriesTab
