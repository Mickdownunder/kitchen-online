'use client'

import React from 'react'
import { Calendar as CalendarIcon, User, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { ViewMode } from '@/hooks/useCalendarNavigation'

interface CalendarHeaderProps {
  headerText: string
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  showOnlyMyAppointments: boolean
  onToggleMyAppointments: () => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onQuickAddAppointment?: () => void
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  headerText,
  viewMode,
  onViewModeChange,
  showOnlyMyAppointments,
  onToggleMyAppointments,
  onPrev,
  onNext,
  onToday,
  onQuickAddAppointment,
}) => {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
      <div className="flex items-center gap-4">
        <div className="rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 p-3 shadow-lg">
          <CalendarIcon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Kalender</h1>
          <p className="text-sm text-slate-500">{headerText}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => onViewModeChange('day')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              viewMode === 'day'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Tag
          </button>
          <button
            onClick={() => onViewModeChange('week')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              viewMode === 'week'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Woche
          </button>
          <button
            onClick={() => onViewModeChange('month')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              viewMode === 'month'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Monat
          </button>
        </div>

        {onQuickAddAppointment && (
          <button
            onClick={onQuickAddAppointment}
            className="flex items-center gap-2 rounded-xl border border-emerald-500 bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-emerald-600"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Neuer Termin</span>
          </button>
        )}
        <button
          onClick={onToggleMyAppointments}
          className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
            showOnlyMyAppointments
              ? 'border-amber-500 bg-amber-500 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
        >
          <User className="h-3.5 w-3.5" />
          <span>Meine</span>
        </button>

        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          <button onClick={onPrev} className="rounded-lg p-2 transition-colors hover:bg-white">
            <ChevronLeft className="h-4 w-4 text-slate-600" />
          </button>
          <button
            onClick={onToday}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-white"
          >
            Heute
          </button>
          <button onClick={onNext} className="rounded-lg p-2 transition-colors hover:bg-white">
            <ChevronRight className="h-4 w-4 text-slate-600" />
          </button>
        </div>
      </div>
    </div>
  )
}
