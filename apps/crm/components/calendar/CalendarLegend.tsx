'use client'

import React from 'react'

interface TypeLegendEntry {
  key: string
  label: string
  color: string
  bgColor: string
  borderColor: string
}

interface CalendarLegendProps {
  totalAppointments: number
  typeLegendEntries?: TypeLegendEntry[]
}

export const CalendarLegend: React.FC<CalendarLegendProps> = ({
  totalAppointments,
  typeLegendEntries = [],
}) => {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Legende:
      </span>
      {typeLegendEntries.map(t => (
        <div key={t.key} className="flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-sm border-l-2 ${t.borderColor} ${t.bgColor}`}
          />
          <span className="text-xs text-slate-600 max-w-[100px] truncate" title={t.label}>
            {t.label}
          </span>
        </div>
      ))}
      <div className="ml-auto text-xs text-slate-400">{totalAppointments} Termine gesamt</div>
    </div>
  )
}
