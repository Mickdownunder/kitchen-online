'use client'

import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Invoice } from '@/types'
import {
  calculateFinalInvoiceRevenue,
  calculateDepositRevenueFromInvoices,
  calculateReceivedMoneyFromInvoices,
  calculateOutstandingFromInvoices,
  calculateMonthlyInvoiceDataFromInvoices,
  DateFilter,
} from './utils/revenueCalculations'
import { Download } from 'lucide-react'

interface InvoicesTabProps {
  invoices: Invoice[]
  filter: DateFilter
}

const InvoicesTab: React.FC<InvoicesTabProps> = ({ invoices, filter }) => {
  const formatCurrency = (value: number) => {
    return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Monthly data from invoices table
  const monthlyData = useMemo(() => {
    const year =
      filter.year === 'all' ? new Date().getFullYear() : filter.year || new Date().getFullYear()
    return calculateMonthlyInvoiceDataFromInvoices(invoices, year)
  }, [invoices, filter.year])

  // Calculate statistics from invoices table
  const stats = useMemo(() => {
    const invoicedRevenue = calculateFinalInvoiceRevenue(invoices, filter)
    const depositRevenue = calculateDepositRevenueFromInvoices(invoices, filter)
    const receivedMoney = calculateReceivedMoneyFromInvoices(invoices, filter)
    const outstanding = calculateOutstandingFromInvoices(invoices)

    // Count invoices
    const finalInvoiceCount = invoices.filter(inv => inv.type === 'final').length
    const depositInvoiceCount = invoices.filter(inv => inv.type === 'partial').length
    const paidFinalCount = invoices.filter(inv => inv.type === 'final' && inv.isPaid).length
    const paidDepositCount = invoices.filter(inv => inv.type === 'partial' && inv.isPaid).length

    // Calculate average payment duration
    let totalPaymentDays = 0
    let paymentCount = 0

    invoices.forEach(inv => {
      if (inv.isPaid && inv.paidDate && inv.invoiceDate) {
        const invoiceDate = new Date(inv.invoiceDate)
        const paidDate = new Date(inv.paidDate)
        const days = Math.floor(
          (paidDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (days >= 0) {
          totalPaymentDays += days
          paymentCount++
        }
      }
    })

    const avgPaymentDays = paymentCount > 0 ? Math.round(totalPaymentDays / paymentCount) : 0

    return {
      invoicedRevenue,
      depositRevenue,
      receivedMoney,
      outstanding,
      finalInvoiceCount,
      depositInvoiceCount,
      paidFinalCount,
      paidDepositCount,
      avgPaymentDays,
    }
  }, [invoices, filter])

  // Invoice type distribution
  const invoiceTypeDistribution = useMemo(() => {
    const final = stats.finalInvoiceCount
    const deposit = stats.depositInvoiceCount
    return [
      { name: 'Schlussrechnungen', value: final },
      { name: 'Anzahlungen', value: deposit },
    ]
  }, [stats])

  const COLORS = ['#8b5cf6', '#3b82f6']

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
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-purple-50/30 p-6 shadow-lg">
          <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">
            Schlussrechnungen
          </p>
          <p className="text-3xl font-black text-slate-900">
            {formatCurrency(stats.invoicedRevenue)} €
          </p>
          <p className="mt-1 text-xs text-slate-500">{stats.finalInvoiceCount} Rechnungen</p>
        </div>
        <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-blue-50/30 p-6 shadow-lg">
          <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">
            Anzahlungen
          </p>
          <p className="text-3xl font-black text-slate-900">
            {formatCurrency(stats.depositRevenue)} €
          </p>
          <p className="mt-1 text-xs text-slate-500">{stats.depositInvoiceCount} Anzahlungen</p>
        </div>
        <div className="glass group relative overflow-hidden rounded-2xl border-2 border-slate-900 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-white/10 transition-opacity group-hover:opacity-50"></div>
          <div className="relative z-10">
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-white/90">
              Gesamt
            </p>
            <p className="mb-1 text-3xl font-black text-white">
              {formatCurrency(stats.invoicedRevenue + stats.depositRevenue)} €
            </p>
            <p className="mt-1 text-xs text-white/70">
              {stats.finalInvoiceCount + stats.depositInvoiceCount} Rechnungen gesamt
            </p>
          </div>
        </div>
        <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-emerald-50/30 p-6 shadow-lg">
          <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">
            Eingegangen
          </p>
          <p className="text-3xl font-black text-slate-900">
            {formatCurrency(stats.receivedMoney)} €
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {stats.paidFinalCount + stats.paidDepositCount} bezahlt
          </p>
        </div>
        <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-amber-50/30 p-6 shadow-lg">
          <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">Offen</p>
          <p className="text-3xl font-black text-slate-900">
            {formatCurrency(stats.outstanding)} €
          </p>
          <p className="mt-1 text-xs text-slate-500">Ø {stats.avgPaymentDays} Tage</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Schlussrechnungen nach Monaten */}
        <div className="glass rounded-3xl border border-white/50 bg-gradient-to-br from-white to-slate-50/50 p-8 shadow-xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-2xl font-black text-transparent">
                Schlussrechnungen nach Monaten
              </h3>
              <p className="mt-1 text-sm text-slate-500">Final-Rechnungen</p>
            </div>
            <button
              onClick={() => handleExportCSV(monthlyData, 'schlussrechnungen')}
              className="rounded-lg p-2 transition-all hover:bg-slate-100"
              title="Als CSV exportieren"
            >
              <Download className="h-4 w-4 text-slate-400" />
            </button>
          </div>
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
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [`${formatCurrency(value)} €`, 'Fakturiert']}
                />
                <Bar dataKey="invoiced" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Fakturiert" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Anzahlungen nach Monaten */}
        <div className="glass rounded-3xl border border-white/50 bg-gradient-to-br from-white to-slate-50/50 p-8 shadow-xl">
          <div className="mb-6">
            <h3 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-2xl font-black text-transparent">
              Anzahlungen nach Monaten
            </h3>
            <p className="mt-1 text-sm text-slate-500">Teilzahlungen</p>
          </div>
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
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [`${formatCurrency(value)} €`, 'Anzahlungen']}
                />
                <Bar dataKey="deposit" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Anzahlungen" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Eingegangen vs. Offen & Rechnungsarten */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Eingegangen vs. Offen */}
        <div className="glass rounded-3xl border border-white/50 bg-gradient-to-br from-white to-slate-50/50 p-8 shadow-xl">
          <div className="mb-6">
            <h3 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-2xl font-black text-transparent">
              Eingegangen vs. Offen
            </h3>
            <p className="mt-1 text-sm text-slate-500">Zahlungseingang</p>
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
                      paid: 'Eingegangen',
                      outstanding: 'Offen',
                    }
                    return [`${formatCurrency(value)} €`, labels[name || ''] || name]
                  }}
                />
                <Legend />
                <Bar dataKey="paid" fill="#10b981" radius={[8, 8, 0, 0]} name="Eingegangen" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rechnungsarten-Verteilung */}
        <div className="glass rounded-3xl border border-white/50 bg-gradient-to-br from-white to-slate-50/50 p-8 shadow-xl">
          <h3 className="mb-6 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-2xl font-black text-transparent">
            Rechnungsarten-Verteilung
          </h3>
          <div className="h-64">
            {invoiceTypeDistribution.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={invoiceTypeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {invoiceTypeDistribution.map((entry, index) => (
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
        </div>
      </div>
    </div>
  )
}

export default InvoicesTab
