'use client'

import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import type { CalendarEvent } from '@/hooks/useCalendarEvents'
import { EventCard } from './EventCard'

interface MonthViewProps {
  days: (Date | null)[]
  currentMonth: number
  dayNamesShort: string[]
  getEventsForDate: (date: Date) => CalendarEvent[]
  onDayClick: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
  getWeekNumber: (date: Date) => number
}

export const MonthView: React.FC<MonthViewProps> = ({
  days,
  currentMonth,
  dayNamesShort,
  getEventsForDate,
  onDayClick,
  onEventClick,
  getWeekNumber,
}) => {
  const DroppableDayCell: React.FC<{ date: Date; isInCurrentMonth: boolean }> = ({
    date,
    isInCurrentMonth,
  }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `date-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
    })

    const events = getEventsForDate(date)
    const isToday = date.toDateString() === new Date().toDateString()
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const weekNumber = date.getDate() === 1 || date.getDay() === 1 ? getWeekNumber(date) : null

    return (
      <div
        ref={setNodeRef}
        onClick={() => onDayClick(date)}
        className={`group relative min-h-[100px] cursor-pointer border-b border-r border-slate-200 p-1.5 transition-all md:min-h-[120px] md:p-2 ${
          isWeekend ? 'bg-slate-50/80' : 'bg-white hover:bg-slate-50'
        } ${!isInCurrentMonth ? 'opacity-40' : ''} ${
          isOver ? 'bg-amber-50 ring-2 ring-inset ring-amber-400' : ''
        }`}
      >
        <div className="mb-1 flex items-start justify-between">
          <div className="flex items-center gap-1">
            {weekNumber && (
              <span className="rounded bg-slate-100 px-1 text-[9px] font-medium text-slate-400">
                KW{weekNumber}
              </span>
            )}
          </div>
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold transition-all ${
              isToday ? 'bg-amber-500 text-white' : 'text-slate-600 group-hover:bg-slate-200'
            }`}
          >
            {date.getDate()}
          </span>
        </div>

        <div className="max-h-[60px] space-y-1 overflow-y-auto md:max-h-[80px]">
          {events.slice(0, 3).map(e => (
            <EventCard key={e.id} event={e} compact onClick={() => onEventClick(e)} />
          ))}
          {events.length > 3 && (
            <span className="text-[10px] font-medium text-slate-500">
              +{events.length - 3} weitere
            </span>
          )}
        </div>

        <div className="absolute bottom-1 right-1 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="rounded bg-amber-500 p-1 text-white">
            <Plus className="h-3 w-3" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div className="grid grid-cols-7 bg-slate-800 text-white">
        {dayNamesShort.map((day, idx) => (
          <div
            key={day}
            className={`py-3 text-center text-xs font-bold uppercase tracking-wider ${
              idx >= 5 ? 'text-amber-400' : ''
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((date, idx) => {
          if (!date) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-[100px] border-b border-r border-slate-200 bg-slate-50/50 md:min-h-[120px]"
              ></div>
            )
          }
          return (
            <DroppableDayCell
              key={`day-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
              date={date}
              isInCurrentMonth={date.getMonth() === currentMonth}
            />
          )
        })}
      </div>
    </div>
  )
}
