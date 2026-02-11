'use client'

import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import type { CalendarEvent } from '@/hooks/useCalendarEvents'

interface EventCardProps {
  event: CalendarEvent
  onClick: () => void
  compact?: boolean
}

export const EventCard: React.FC<EventCardProps> = ({ event, onClick, compact }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onClick={e => {
          e.stopPropagation()
          onClick()
        }}
        className={`min-h-[28px] rounded border-l-2 px-2 py-2 text-[11px] ${event.bgColor} ${event.borderColor} ${event.color} cursor-grab truncate active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
      >
        <span className="truncate font-medium">{event.customer}</span>
        {event.materialReadyLabel && (
          <span
            className={`mt-0.5 inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${
              event.materialReady
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            {event.materialReadyLabel}
          </span>
        )}
        {event.assignedUserName && (
          <span className="mt-0.5 block truncate text-[10px] opacity-80">{event.assignedUserName}</span>
        )}
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={e => {
        e.stopPropagation()
        onClick()
      }}
      className={`min-h-[44px] rounded-lg border-l-4 px-2 py-2.5 text-xs ${event.bgColor} ${event.borderColor} ${event.color} cursor-grab shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="mb-0.5 flex items-center gap-1.5">
        {event.icon}
        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
          {event.typeLabel || event.type}
        </span>
        {event.time && <span className="ml-auto text-[10px] opacity-60">{event.time}</span>}
      </div>
      <div className="truncate font-bold">{event.customer}</div>
      {event.materialReadyLabel && (
        <div
          className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
            event.materialReady
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}
        >
          {event.materialReadyLabel}
        </div>
      )}
      {event.assignedUserName && (
        <div className="mt-0.5 truncate text-[10px] opacity-80">{event.assignedUserName}</div>
      )}
    </div>
  )
}
