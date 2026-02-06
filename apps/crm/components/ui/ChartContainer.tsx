'use client'

import React from 'react'

export interface ChartContainerProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}

export function ChartContainer({
  title,
  subtitle,
  children,
  className = '',
  action,
}: ChartContainerProps) {
  return (
    <div
      className={`glass overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-br from-white to-slate-50/50 p-8 shadow-xl ${className}`}
    >
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-900">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      <div className="min-h-[250px]">{children}</div>
    </div>
  )
}
