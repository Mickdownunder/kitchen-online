'use client'

import React, { useEffect, useState } from 'react'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { CustomerProject, PlanningAppointment, ProjectStatus } from '@/types'
import AppointmentDetailModal from './AppointmentDetailModal'
import { useAuth } from '@/hooks/useAuth'
import { useCalendarEvents, type CalendarEvent } from '@/hooks/useCalendarEvents'
import { useCalendarNavigation } from '@/hooks/useCalendarNavigation'
import { useCalendarDragDrop } from '@/hooks/useCalendarDragDrop'
import { CalendarHeader } from './calendar/CalendarHeader'
import { CalendarLegend } from './calendar/CalendarLegend'
import { MonthView } from './calendar/MonthView'
import { WeekView } from './calendar/WeekView'
import { DayView } from './calendar/DayView'
import { QuickAssignModal } from './calendar/QuickAssignModal'

interface CalendarViewProps {
  projects: CustomerProject[]
  appointments: PlanningAppointment[]
  onUpdateProject: (project: CustomerProject) => void
  onAddAppointment: (appt: PlanningAppointment) => void
  onUpdateAppointment?: (appt: PlanningAppointment) => void
  onDeleteAppointment?: (id: string) => void
}

// Time slots for day/week view
const TIME_SLOTS = Array.from({ length: 12 }, (_, i) => {
  const hour = i + 7 // Start at 7:00
  return `${hour.toString().padStart(2, '0')}:00`
})

const CalendarView: React.FC<CalendarViewProps> = ({
  projects,
  appointments,
  onUpdateProject,
  onAddAppointment,
  onUpdateAppointment,
  onDeleteAppointment,
}) => {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'status'>('name')
  const [isCreatingNewAppointment, setIsCreatingNewAppointment] = useState(false)
  const [newAppointmentName, setNewAppointmentName] = useState('')
  const [newAppointmentTime, setNewAppointmentTime] = useState('10:00')
  const [newAppointmentType, setNewAppointmentType] =
    useState<PlanningAppointment['type']>('Consultation')
  const [newAppointmentNotes, setNewAppointmentNotes] = useState('')
  const [selectedAppointment, setSelectedAppointment] = useState<{
    appointment: PlanningAppointment | null
    project: CustomerProject | null
  } | null>(null)
  const [showOnlyMyAppointments, setShowOnlyMyAppointments] = useState(false)
  const [teamMap, setTeamMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await fetch('/api/calendar/team')
        if (res.ok) {
          const { team } = await res.json()
          const map: Record<string, string> = {}
          ;(team || []).forEach((t: { id: string; fullName: string }) => {
            map[t.id] = t.fullName || ''
          })
          setTeamMap(map)
        }
      } catch {
        // Silently ignore - team colors are optional
      }
    }
    fetchTeam()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const {
    currentDate,
    viewMode,
    setViewMode,
    goToToday,
    goToPrev,
    goToNext,
    daysForView,
    formatHeaderDate,
    dayNames,
    dayNamesShort,
    monthNames,
    getWeekNumber,
  } = useCalendarNavigation()

  const { getEventsForDate, projectsToAssign, getStatusColor, formatDate, typeLegendEntries } =
    useCalendarEvents({
      projects,
      appointments,
      showOnlyMyAppointments,
      userId: user?.id,
      debouncedSearchQuery,
      sortBy,
      teamMap,
    })

  const { sensors, collisionDetection, draggedEvent, handleDragStart, handleDragEnd } =
    useCalendarDragDrop({
      daysForView,
      getEventsForDate,
      onUpdateAppointment,
      onUpdateProject,
    })

  const handleQuickAddAppointment = () => {
    setSelectedDate(currentDate)
    setIsAssignModalOpen(true)
    setIsCreatingNewAppointment(true)
  }

  const handleDayClick = (date: Date) => {
    setSelectedDate(date)
    setIsAssignModalOpen(true)
    setIsCreatingNewAppointment(false)
  }

  const assignDateToProject = (
    project: CustomerProject,
    type: 'measurement' | 'installation' | 'delivery'
  ) => {
    if (!selectedDate) return
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`

    const updatedProject = { ...project }
    if (type === 'measurement') {
      updatedProject.measurementDate = dateStr
      updatedProject.isMeasured = true
      updatedProject.status = ProjectStatus.MEASURING
    } else if (type === 'installation') {
      updatedProject.installationDate = dateStr
      updatedProject.isInstallationAssigned = true
      updatedProject.status = ProjectStatus.INSTALLATION
    } else {
      updatedProject.deliveryDate = dateStr
      updatedProject.status = ProjectStatus.DELIVERY
    }

    onUpdateProject(updatedProject)
    setIsAssignModalOpen(false)
  }

  const hasAppointmentConflict = (
    dateStr: string,
    time: string,
    assignedUserId: string | undefined
  ): boolean => {
    if (!assignedUserId) return false
    return appointments.some(
      a =>
        a.assignedUserId === assignedUserId &&
        a.date === dateStr &&
        (a.time || '') === (time || '')
    )
  }

  const createPlanningAppointment = () => {
    if (!selectedDate || !newAppointmentName) return
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`

    const assignedUserId = user?.id
    if (
      hasAppointmentConflict(dateStr, newAppointmentTime, assignedUserId) &&
      !confirm(
        `Sie haben bereits einen Termin um ${newAppointmentTime} Uhr am ${selectedDate.toLocaleDateString('de-DE')}. Trotzdem anlegen?`
      )
    ) {
      return
    }

    const newAppt: PlanningAppointment = {
      id: 'appt-' + Date.now(),
      customerName: newAppointmentName,
      date: dateStr,
      time: newAppointmentTime,
      type: newAppointmentType,
      notes: newAppointmentNotes || undefined,
      assignedUserId,
    }

    onAddAppointment(newAppt)
    setIsAssignModalOpen(false)
    setNewAppointmentName('')
    setNewAppointmentNotes('')
    setNewAppointmentType('Consultation')
  }

  const handleEventClick = (event: CalendarEvent) => {
    if (event.project && !event.appointment) {
      const planningType: PlanningAppointment['type'] =
        event.type === 'Aufmaß'
          ? 'Measurement'
          : event.type === 'Montage'
            ? 'Installation'
            : 'Delivery'
      const tempAppointment: PlanningAppointment = {
        id: `temp-${event.project.id}-${event.type}`,
        customerName: event.project.customerName,
        date: event.date,
        time: event.time,
        type: planningType,
        notes: '',
      }
      setSelectedAppointment({ appointment: tempAppointment, project: event.project })
    } else if (event.appointment) {
      setSelectedAppointment({ appointment: event.appointment, project: event.project })
    }
  }

  const daysInView = daysForView.filter((d): d is Date => d !== null)
  const activeDay = daysInView[0] || new Date(currentDate)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="animate-in fade-in flex min-h-[calc(100vh-14rem)] flex-col gap-6 duration-500">
        <CalendarHeader
          headerText={formatHeaderDate()}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showOnlyMyAppointments={showOnlyMyAppointments}
          onToggleMyAppointments={() => setShowOnlyMyAppointments(!showOnlyMyAppointments)}
          onPrev={goToPrev}
          onNext={goToNext}
          onToday={goToToday}
          onQuickAddAppointment={handleQuickAddAppointment}
        />

        <div className="min-h-0 flex-1">
        {viewMode === 'month' ? (
          <MonthView
            days={daysForView}
            currentMonth={currentDate.getMonth()}
            dayNamesShort={dayNamesShort}
            getEventsForDate={getEventsForDate}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
            getWeekNumber={getWeekNumber}
          />
        ) : viewMode === 'week' ? (
          <WeekView
            days={daysInView}
            dayNamesShort={dayNamesShort}
            monthNames={monthNames}
            timeSlots={TIME_SLOTS}
            getEventsForDate={getEventsForDate}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
          />
        ) : (
          <DayView
            date={activeDay}
            dayNames={dayNames}
            monthNames={monthNames}
            timeSlots={TIME_SLOTS}
            getWeekNumber={getWeekNumber}
            getEventsForDate={getEventsForDate}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
          />
        )}
        </div>

        <CalendarLegend
          totalAppointments={
            projects.filter(p => p.installationDate || p.measurementDate || p.deliveryDate).length +
            appointments.length
          }
          typeLegendEntries={typeLegendEntries}
        />

        <QuickAssignModal
          isOpen={isAssignModalOpen}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          monthNames={monthNames}
          isCreatingNewAppointment={isCreatingNewAppointment}
          setIsCreatingNewAppointment={setIsCreatingNewAppointment}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortBy={sortBy}
          setSortBy={setSortBy}
          projectsToAssign={projectsToAssign}
          assignDateToProject={assignDateToProject}
          getStatusColor={getStatusColor}
          formatDate={formatDate}
          newAppointmentName={newAppointmentName}
          setNewAppointmentName={setNewAppointmentName}
          newAppointmentType={newAppointmentType}
          setNewAppointmentType={setNewAppointmentType}
          newAppointmentTime={newAppointmentTime}
          setNewAppointmentTime={setNewAppointmentTime}
          newAppointmentNotes={newAppointmentNotes}
          setNewAppointmentNotes={setNewAppointmentNotes}
          createPlanningAppointment={createPlanningAppointment}
          onClose={() => setIsAssignModalOpen(false)}
        />

        <AppointmentDetailModal
          appointment={selectedAppointment?.appointment || null}
          project={selectedAppointment?.project || null}
          isOpen={!!selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onUpdate={updatedAppointment => {
            if (updatedAppointment.id.startsWith('temp-')) {
              if (selectedAppointment?.project) {
                const updatedProject = { ...selectedAppointment.project }
                if (updatedAppointment.type === 'Measurement') {
                  updatedProject.measurementDate = updatedAppointment.date
                  updatedProject.measurementTime = updatedAppointment.time
                } else if (updatedAppointment.type === 'Installation') {
                  updatedProject.installationDate = updatedAppointment.date
                  updatedProject.installationTime = updatedAppointment.time
                } else if (updatedAppointment.type === 'Delivery') {
                  updatedProject.deliveryDate = updatedAppointment.date
                  updatedProject.deliveryTime = updatedAppointment.time
                }
                if (updatedAppointment.notes) {
                  const timestamp = new Date().toLocaleDateString('de-DE')
                  const typeLabel =
                    updatedAppointment.type === 'Measurement'
                      ? 'Aufmaß'
                      : updatedAppointment.type === 'Installation'
                        ? 'Montage'
                        : updatedProject.deliveryType === 'delivery'
                          ? 'Lieferung'
                          : 'Abholung'
                  updatedProject.notes =
                    `${updatedProject.notes || ''}\n${timestamp}: Termin-Notizen (${typeLabel}): ${updatedAppointment.notes}`.trim()
                }
                onUpdateProject(updatedProject)
              }
            } else if (onUpdateAppointment) {
              onUpdateAppointment(updatedAppointment)
            }
            setSelectedAppointment(null)
          }}
          onDelete={appointmentId => {
            if (onDeleteAppointment && !appointmentId.startsWith('temp-')) {
              onDeleteAppointment(appointmentId)
            }
            setSelectedAppointment(null)
          }}
        />

        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {draggedEvent ? (
            <div
              className={`rounded-lg border-l-4 p-2 text-xs ${draggedEvent.bgColor} ${draggedEvent.borderColor} ${draggedEvent.color} pointer-events-none shadow-xl`}
              style={{ opacity: 0.9, transform: 'scale(1.05)' }}
            >
              <div className="mb-0.5 flex items-center gap-1.5">
                {draggedEvent.icon}
                <span className="text-[10px] font-semibold uppercase">
                  {draggedEvent.typeLabel || draggedEvent.type}
                </span>
                {draggedEvent.time && (
                  <span className="ml-auto text-[10px] opacity-70">{draggedEvent.time}</span>
                )}
              </div>
              <div className="truncate font-bold">{draggedEvent.customer}</div>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  )
}

export default CalendarView
