'use client'

import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import type { CalendarEvent } from '@/hooks/useCalendarEvents'
import { EventCard } from './EventCard'

interface TimeSlotProps {
  id: string
  time?: string
  isWeekend: boolean
  events: CalendarEvent[]
  onDayClick: () => void
  onEventClick: (event: CalendarEvent) => void
  isDayView?: boolean
}

export const TimeSlot: React.FC<TimeSlotProps> = ({
  id,
  time,
  isWeekend,
  events,
  onDayClick,
  onEventClick,
  isDayView,
}) => {
  const slotId = time ? `slot-${id.replace('date-', '')}-${time}` : id
  const { setNodeRef, isOver } = useDroppable({ id: slotId })

  return (
    <div
      ref={setNodeRef}
      onClick={onDayClick}
      data-slot-id={slotId}
      className={`min-h-[60px] cursor-pointer border-r border-slate-100 p-1.5 transition-all duration-150 last:border-r-0 ${
        isDayView ? 'flex-1' : ''
      } ${isWeekend ? 'bg-slate-50/50' : 'hover:bg-blue-50/50'} ${
        isOver ? 'scale-[1.02] bg-amber-100 ring-2 ring-inset ring-amber-500' : ''
      }`}
    >
      <div className={isDayView ? 'flex flex-wrap gap-2' : 'space-y-1'}>
        {events.map(e => (
          <EventCard key={e.id} event={e} onClick={() => onEventClick(e)} />
        ))}
      </div>
    </div>
  )
}
