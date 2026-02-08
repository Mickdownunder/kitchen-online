'use client'

import React from 'react'
import type { CalendarEvent } from '@/hooks/useCalendarEvents'
import { TimeSlot } from './TimeSlot'

interface DayViewProps {
  date: Date
  dayNames: string[]
  monthNames: string[]
  timeSlots: string[]
  getWeekNumber: (date: Date) => number
  getEventsForDate: (date: Date) => CalendarEvent[]
  onDayClick: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
}

export const DayView: React.FC<DayViewProps> = ({
  date,
  dayNames,
  monthNames,
  timeSlots,
  getWeekNumber,
  getEventsForDate,
  onDayClick,
  onEventClick,
}) => {
  const isToday = date.toDateString() === new Date().toDateString()
  const allEvents = getEventsForDate(date)

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div className="bg-slate-800 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-slate-400">
              {dayNames[(date.getDay() + 6) % 7]}
            </p>
            <div className="mt-1 flex items-baseline gap-3">
              <span className={`text-4xl font-bold ${isToday ? 'text-amber-400' : ''}`}>
                {date.getDate()}
              </span>
              <span className="text-xl text-slate-300">
                {monthNames[date.getMonth()]} {date.getFullYear()}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-slate-400">
              KW {getWeekNumber(date)}
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-400">{allEvents.length}</p>
            <p className="text-xs text-slate-400">Termine</p>
          </div>
        </div>
      </div>

      <div className="max-h-[70vh] overflow-y-auto">
        {timeSlots.map((time, timeIdx) => {
          const events = allEvents.filter(e => {
            if (!e.time) return timeIdx === 2
            const eventHour = parseInt(e.time.split(':')[0])
            return eventHour === parseInt(time.split(':')[0])
          })
          const dateId = `date-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`

          return (
            <div key={`time-${time}`} className="flex border-b border-slate-100 last:border-b-0">
              <div className="w-20 shrink-0 border-r border-slate-200 bg-slate-50 p-3 text-right">
                <span className="text-sm font-semibold text-slate-500">{time}</span>
              </div>
              <TimeSlot
                key={`${dateId}-${time}`}
                id={dateId}
                time={time}
                isWeekend={false}
                events={events}
                onDayClick={() => onDayClick(date)}
                onEventClick={onEventClick}
                isDayView
              />
            </div>
          )
        })}
      </div>

      {allEvents.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Alle Termine
          </p>
          <div className="space-y-2">
            {allEvents.map(e => (
              <div
                key={`summary-${e.id}`}
                onClick={() => onEventClick(e)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors ${e.bgColor} hover:opacity-80`}
              >
                <div className={`rounded-lg bg-white/50 p-2 ${e.color}`}>{e.icon}</div>
                <div className="min-w-0 flex-1">
                  <p className={`font-bold ${e.color}`}>{e.customer}</p>
                  <p className="text-xs text-slate-500">
                    {e.type}
                    {e.time ? ` • ${e.time}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
