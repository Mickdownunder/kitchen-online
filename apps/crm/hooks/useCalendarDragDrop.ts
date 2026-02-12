'use client'

import { useCallback, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import {
  CollisionDetection,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { CalendarEvent } from '@/hooks/useCalendarEvents'
import type { CustomerProject, PlanningAppointment } from '@/types'

interface UseCalendarDragDropOptions {
  daysForView: (Date | null)[]
  getEventsForDate: (date: Date) => CalendarEvent[]
  onUpdateAppointment?: (appt: PlanningAppointment) => void
  onUpdateProject: (project: CustomerProject) => void
}

interface UseCalendarDragDropResult {
  sensors: ReturnType<typeof useSensors>
  collisionDetection: CollisionDetection
  draggedEvent: CalendarEvent | null
  handleDragStart: (event: DragStartEvent) => void
  handleDragEnd: (event: DragEndEvent) => void
  setDraggedEvent: Dispatch<SetStateAction<CalendarEvent | null>>
}

export function useCalendarDragDrop(
  options: UseCalendarDragDropOptions
): UseCalendarDragDropResult {
  const { daysForView, getEventsForDate, onUpdateAppointment, onUpdateProject } = options
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  const collisionDetection: CollisionDetection = args => {
    const collisions = rectIntersection(args)
    if (collisions.length === 0) return []

    const slotCollisions = collisions.filter(c => String(c.id).startsWith('slot-'))
    if (slotCollisions.length > 0) {
      return [slotCollisions[0]]
    }

    return [collisions[0]]
  }

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const eventId = event.active.id as string
      for (const date of daysForView) {
        if (date) {
          const events = getEventsForDate(date)
          const foundEvent = events.find(e => e.id === eventId)
          if (foundEvent) {
            setDraggedEvent(foundEvent)
            break
          }
        }
      }
    },
    [daysForView, getEventsForDate]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { over } = event
      setDraggedEvent(null)

      if (!over || !draggedEvent) return

      const targetId = over.id as string

      const timeSlotMatch = targetId.match(/slot-(\d+)-(\d+)-(\d+)-(\d+):00/)
      if (timeSlotMatch) {
        const [, year, month, day, hour] = timeSlotMatch
        const newDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        const newTime = `${hour.padStart(2, '0')}:00`

        if (draggedEvent.appointment) {
          if (onUpdateAppointment) {
            onUpdateAppointment({
              ...draggedEvent.appointment,
              date: newDate,
              time: newTime,
            })
          }
        } else if (draggedEvent.project) {
          const updatedProject = { ...draggedEvent.project }
          if (draggedEvent.type === 'Aufmaß') {
            updatedProject.measurementDate = newDate
            updatedProject.measurementTime = newTime
          } else if (draggedEvent.type === 'Montage') {
            updatedProject.installationDate = newDate
            updatedProject.installationTime = newTime
          } else if (draggedEvent.type === 'Abholung' || draggedEvent.type === 'Lieferung') {
            updatedProject.deliveryDate = newDate
            updatedProject.deliveryTime = newTime
          }
          onUpdateProject(updatedProject)
        }
        return
      }

      if (!targetId.startsWith('date-')) return

      const [, year, month, day] = targetId.match(/date-(\d+)-(\d+)-(\d+)/) || []
      if (!year || !month || !day) return

      const newDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`

      if (draggedEvent.appointment) {
        if (onUpdateAppointment) {
          onUpdateAppointment({
            ...draggedEvent.appointment,
            date: newDate,
          })
        }
      } else if (draggedEvent.project) {
        const updatedProject = { ...draggedEvent.project }
        if (draggedEvent.type === 'Aufmaß') {
          updatedProject.measurementDate = newDate
        } else if (draggedEvent.type === 'Montage') {
          updatedProject.installationDate = newDate
        } else if (draggedEvent.type === 'Abholung' || draggedEvent.type === 'Lieferung') {
          updatedProject.deliveryDate = newDate
        }
        onUpdateProject(updatedProject)
      }
    },
    [draggedEvent, onUpdateAppointment, onUpdateProject]
  )

  return {
    sensors,
    collisionDetection,
    draggedEvent,
    handleDragStart,
    handleDragEnd,
    setDraggedEvent,
  }
}
