'use client'

import React from 'react'

interface CalendarLegendProps {
  totalAppointments: number
}

export const CalendarLegend: React.FC<CalendarLegendProps> = ({ totalAppointments }) => {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Legende:
      </span>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-sm border-l-2 border-emerald-500 bg-emerald-100"></div>
        <span className="text-xs text-slate-600">Planung</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-sm border-l-2 border-indigo-500 bg-indigo-100"></div>
        <span className="text-xs text-slate-600">Aufmaß</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-sm border-l-2 border-amber-500 bg-amber-100"></div>
        <span className="text-xs text-slate-600">Montage</span>
      </div>
      <div className="ml-auto text-xs text-slate-400">{totalAppointments} Termine gesamt</div>
    </div>
  )
}
