'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface RevenueChartProps {
  data: { month: string; revenue: number; prevRevenue?: number }[]
  formatCurrency: (value: number) => string
  showPrevYear?: boolean
}

/**
 * RevenueChart component - dynamically loaded to reduce initial bundle size
 * recharts is ~300KB gzipped, so we lazy-load it
 */
export default function RevenueChart({ data, formatCurrency, showPrevYear = false }: RevenueChartProps) {
  const hasPrevYearData = showPrevYear && data.some(d => (d.prevRevenue || 0) > 0)

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '250px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
            interval={0}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
            tickFormatter={value => `${(value / 1000).toFixed(0)}k`}
            width={35}
          />
          <Tooltip
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string) => [
              `${formatCurrency(value)} €`,
              name === 'prevRevenue' ? 'Vorjahr' : 'Umsatz',
            ]}
          />
          {hasPrevYearData && (
            <Legend
              formatter={(value: string) => (value === 'prevRevenue' ? 'Vorjahr' : 'Aktuell')}
              wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
            />
          )}
          {hasPrevYearData && (
            <Bar
              dataKey="prevRevenue"
              fill="#cbd5e1"
              radius={[6, 6, 0, 0]}
              barSize={16}
            />
          )}
          <Bar
            dataKey="revenue"
            fill="url(#revenueGradient)"
            radius={[6, 6, 0, 0]}
            barSize={hasPrevYearData ? 16 : 24}
          />
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
