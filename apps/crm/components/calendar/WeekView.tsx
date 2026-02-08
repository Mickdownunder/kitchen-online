'use client'

import React from 'react'
import { Clock } from 'lucide-react'
import type { CalendarEvent } from '@/hooks/useCalendarEvents'
import { TimeSlot } from './TimeSlot'

interface WeekViewProps {
  days: Date[]
  dayNamesShort: string[]
  monthNames: string[]
  timeSlots: string[]
  getEventsForDate: (date: Date) => CalendarEvent[]
  onDayClick: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
}

export const WeekView: React.FC<WeekViewProps> = ({
  days,
  dayNamesShort,
  monthNames,
  timeSlots,
  getEventsForDate,
  onDayClick,
  onEventClick,
}) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div className="grid grid-cols-8 bg-slate-800 text-white">
        <div className="border-r border-slate-700 p-3 text-center">
          <Clock className="mx-auto h-4 w-4 text-slate-400" />
        </div>
        {days.map((date, idx) => {
          const isToday = date.toDateString() === new Date().toDateString()
          const isWeekend = date.getDay() === 0 || date.getDay() === 6
          return (
            <div
              key={`header-${date.toISOString()}`}
              className={`border-r border-slate-700 p-3 text-center last:border-r-0 ${
                isWeekend ? 'bg-slate-700' : ''
              }`}
            >
              <div
                className={`text-xs font-medium uppercase tracking-wider ${
                  isWeekend ? 'text-amber-400' : 'text-slate-400'
                }`}
              >
                {dayNamesShort[idx]}
              </div>
              <div
                className={`mt-0.5 text-lg font-bold ${
                  isToday
                    ? 'mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-amber-500'
                    : ''
                }`}
              >
                {date.getDate()}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                {monthNames[date.getMonth()].slice(0, 3)}
              </div>
            </div>
          )
        })}
      </div>

      <div className="max-h-[70vh] overflow-y-auto">
        {timeSlots.map((time, timeIdx) => (
          <div
            key={`time-${time}`}
            className="grid grid-cols-8 border-b border-slate-100 last:border-b-0"
          >
            <div className="border-r border-slate-200 bg-slate-50 p-2 pr-3 text-right">
              <span className="text-xs font-medium text-slate-500">{time}</span>
            </div>
            {days.map(date => {
              const dateId = `date-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
              const events = getEventsForDate(date).filter(e => {
                if (!e.time) return timeIdx === 2
                const eventHour = parseInt(e.time.split(':')[0])
                return eventHour === parseInt(time.split(':')[0])
              })
              const isWeekend = date.getDay() === 0 || date.getDay() === 6

              return (
                <TimeSlot
                  key={`${dateId}-${time}`}
                  id={dateId}
                  time={time}
                  isWeekend={isWeekend}
                  events={events}
                  onDayClick={() => onDayClick(date)}
                  onEventClick={onEventClick}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
