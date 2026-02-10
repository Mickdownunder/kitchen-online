'use client'

import React, { useMemo } from 'react'
import { DollarSign, ReceiptText, CreditCard, AlertCircle } from 'lucide-react'
import { CustomerProject, Invoice } from '@/types'
import {
  calculateSoldRevenue,
  DateFilter,
  calculateFinalInvoiceRevenue,
  calculateReceivedMoneyFromInvoices,
  calculateOutstandingFromInvoices,
  calculateMonthlySoldFromProjects,
  calculateMonthlyFinalInvoiceFromInvoices,
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
import { StatCard, ChartContainer } from '@/components/ui'
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

  // Current period metrics - Buchhalterischer Umsatz = nur Schlussrechnungen (nach Rechnungsdatum)
  const currentMetrics = useMemo(() => {
    return {
      soldRevenue: calculateSoldRevenue(projects, filter),
      invoicedRevenue: calculateFinalInvoiceRevenue(invoices, filter),
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
      invoicedRevenue: calculateFinalInvoiceRevenue(invoices, previousFilter),
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

    // Get monthly data: sold from projects, invoiced = nur Schlussrechnungen (Buchhalterischer Umsatz)
    const monthlySold = calculateMonthlySoldFromProjects(projects, year)
    const monthlyInvoiced = calculateMonthlyFinalInvoiceFromInvoices(invoices, year)
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
        <StatCard
          icon={DollarSign}
          iconColor="blue"
          value={`${formatCurrency(currentMetrics.soldRevenue)} €`}
          label="Verkaufter Umsatz"
          subtitle="Auftragsvolumen"
          subtitleSecondary={
            compareWithPrevious && previousMetrics.soldRevenue > 0
              ? `Vorperiode: ${formatCurrency(previousMetrics.soldRevenue)} €`
              : undefined
          }
          trend={
            compareWithPrevious
              ? { value: changes.soldRevenue, isPositive: changes.soldRevenue >= 0 }
              : undefined
          }
          tint="blue"
        />
        <StatCard
          icon={ReceiptText}
          iconColor="purple"
          value={`${formatCurrency(currentMetrics.invoicedRevenue)} €`}
          label="Buchhalterischer Umsatz"
          subtitle="Nur Schlussrechnungen"
          subtitleSecondary={
            compareWithPrevious && previousMetrics.invoicedRevenue > 0
              ? `Vorperiode: ${formatCurrency(previousMetrics.invoicedRevenue)} €`
              : undefined
          }
          trend={
            compareWithPrevious
              ? { value: changes.invoicedRevenue, isPositive: changes.invoicedRevenue >= 0 }
              : undefined
          }
          tint="purple"
        />
        <StatCard
          icon={CreditCard}
          iconColor="emerald"
          value={`${formatCurrency(currentMetrics.receivedMoney)} €`}
          label="Eingegangen"
          subtitle="Cash Flow"
          subtitleSecondary={
            compareWithPrevious && previousMetrics.receivedMoney > 0
              ? `Vorperiode: ${formatCurrency(previousMetrics.receivedMoney)} €`
              : undefined
          }
          trend={
            compareWithPrevious
              ? { value: changes.receivedMoney, isPositive: changes.receivedMoney >= 0 }
              : undefined
          }
          tint="emerald"
        />
        <StatCard
          icon={AlertCircle}
          iconColor="amber"
          value={`${formatCurrency(currentMetrics.outstanding)} €`}
          label="Offen"
          subtitle="Forderungen"
          subtitleSecondary={
            compareWithPrevious && previousMetrics.outstanding > 0
              ? `Vorperiode: ${formatCurrency(previousMetrics.outstanding)} €`
              : undefined
          }
          trend={
            compareWithPrevious
              ? { value: Math.abs(changes.outstanding), isPositive: changes.outstanding < 0 }
              : undefined
          }
          tint="amber"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ChartContainer
          title="Umsatz-Vergleich"
          subtitle="Verkauft vs. Schlussrechnungen vs. Eingegangen"
        >
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
                  formatter={(value: number, name: string) => {
                    const labels: { [key: string]: string } = {
                      sold: 'Verkauft',
                      invoiced: 'Fakturiert',
                      received: 'Eingegangen',
                    }
                    return [`${formatCurrency(value)} €`, labels[name] || name]
                  }}
                />
                <Legend />
                <Bar dataKey="sold" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Verkauft" />
                <Bar dataKey="invoiced" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Schlussrechnungen" />
                <Bar dataKey="received" fill="#10b981" radius={[8, 8, 0, 0]} name="Eingegangen" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>

        <ChartContainer
          title="Cash Flow Trend"
          subtitle="Eingegangenes Geld pro Monat"
        >
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
                  formatter={(value: number) => [`${formatCurrency(value)} €`, 'Eingegangen']}
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
        </ChartContainer>
      </div>
    </div>
  )
}

export default OverviewTab
