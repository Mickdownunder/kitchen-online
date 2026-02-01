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
} from 'recharts'

interface RevenueChartProps {
  data: { month: string; revenue: number }[]
  formatCurrency: (value: number) => string
}

/**
 * RevenueChart component - dynamically loaded to reduce initial bundle size
 * recharts is ~300KB gzipped, so we lazy-load it
 */
export default function RevenueChart({ data, formatCurrency }: RevenueChartProps) {
  return (
    <div style={{ width: '100%', height: '320px', minHeight: '320px' }}>
      <ResponsiveContainer width="100%" height={320} minHeight={320}>
        <BarChart
          data={data}
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
  )
}
