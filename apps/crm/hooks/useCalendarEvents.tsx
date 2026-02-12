'use client'

import { useCallback, useMemo } from 'react'
import { Ruler, Truck, ChefHat, Package } from 'lucide-react'
import type { CustomerProject, PlanningAppointment } from '@/types'
import { ProjectStatus } from '@/types'
import { formatDate as formatDateUtil, getStatusColor as getStatusColorUtil } from '@/lib/utils'
import {
  getAppointmentTypeColorKey,
  getAppointmentTypeLabel,
} from '@/lib/utils/appointmentTypeLabels'

export type CalendarEvent = {
  id: string
  type: 'Aufmaß' | 'Montage' | 'Planung' | 'Abholung' | 'Lieferung'
  typeLabel?: string
  customer: string
  project: CustomerProject | null
  appointment: PlanningAppointment | null
  time?: string
  color: string
  bgColor: string
  borderColor: string
  icon: React.ReactNode
  date: string
  assignedUserId?: string
  assignedUserName?: string
  materialReady?: boolean
  materialReadyLabel?: string
}

/** Farben pro Termin-Typ – eindeutig, damit man lernt: Farbe = Typ */
const TYPE_COLORS: Record<
  string,
  { color: string; bgColor: string; borderColor: string; label: string }
> = {
  Consultation: {
    color: 'text-sky-900',
    bgColor: 'bg-sky-200',
    borderColor: 'border-sky-600',
    label: 'Beratung / Planung',
  },
  FirstMeeting: {
    color: 'text-indigo-900',
    bgColor: 'bg-indigo-200',
    borderColor: 'border-indigo-600',
    label: 'Erstgespräch',
  },
  Measurement: {
    color: 'text-lime-900',
    bgColor: 'bg-lime-200',
    borderColor: 'border-lime-600',
    label: 'Aufmaß',
  },
  Installation: {
    color: 'text-red-900',
    bgColor: 'bg-red-200',
    borderColor: 'border-red-600',
    label: 'Montage',
  },
  Service: {
    color: 'text-fuchsia-900',
    bgColor: 'bg-fuchsia-200',
    borderColor: 'border-fuchsia-600',
    label: 'Service / Wartung',
  },
  ReMeasurement: {
    color: 'text-cyan-900',
    bgColor: 'bg-cyan-200',
    borderColor: 'border-cyan-600',
    label: 'Nachmessung',
  },
  Delivery: {
    color: 'text-amber-900',
    bgColor: 'bg-amber-200',
    borderColor: 'border-amber-600',
    label: 'Abholung',
  },
  Lieferung: {
    color: 'text-violet-900',
    bgColor: 'bg-violet-200',
    borderColor: 'border-violet-600',
    label: 'Lieferung',
  },
  Other: {
    color: 'text-slate-800',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-500',
    label: 'Sonstiges',
  },
}

const DEFAULT_TYPE_COLOR = TYPE_COLORS.Other

interface UseCalendarEventsOptions {
  projects: CustomerProject[]
  appointments: PlanningAppointment[]
  showOnlyMyAppointments: boolean
  userId?: string | null
  debouncedSearchQuery: string
  sortBy: 'name' | 'date' | 'status'
  /** Map of user_id -> full_name for employee color coding */
  teamMap?: Record<string, string>
}

interface UseCalendarEventsResult {
  getEventsForDate: (date: Date) => CalendarEvent[]
  projectsToAssign: CustomerProject[]
  getStatusColor: (status: ProjectStatus) => string
  formatDate: (dateStr?: string) => string
  typeLegendEntries: Array<{
    key: string
    label: string
    color: string
    bgColor: string
    borderColor: string
  }>
}

const formatDateString = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

export function useCalendarEvents(options: UseCalendarEventsOptions): UseCalendarEventsResult {
  const { projects, appointments, showOnlyMyAppointments, userId, debouncedSearchQuery, sortBy, teamMap } =
    options

  const getEventsForDate = useCallback(
    (date: Date): CalendarEvent[] => {
      const dateStr = formatDateString(date)

      let filteredProjects = projects
      let filteredAppointments = appointments

      if (showOnlyMyAppointments && userId) {
        filteredAppointments = appointments.filter(a => a.assignedUserId === userId)
        filteredProjects = projects.filter(p => {
          const hasUserAppointment = appointments.some(
            a =>
              a.assignedUserId === userId &&
              (a.customerName === p.customerName ||
                (a.customerId && p.customerId && a.customerId === p.customerId))
          )
          return (
            hasUserAppointment ||
            p.measurementDate === dateStr ||
            p.installationDate === dateStr ||
            p.deliveryDate === dateStr
          )
        })
      }

      const projectEvents = filteredProjects.flatMap(p => {
        const events: CalendarEvent[] = []
        // Nur für Montage-Termine: Montagebereit / Material offen anzeigen
        const materialReady =
          Boolean(p.readyForAssemblyDate) ||
          p.deliveryStatus === 'ready_for_assembly' ||
          Boolean(p.allItemsDelivered)
        const materialReadyLabel = materialReady ? 'Montagebereit' : 'Material offen'

        if (p.measurementDate === dateStr) {
          const measurementColor = TYPE_COLORS.Measurement
          events.push({
            id: `project-${p.id}-measurement`,
            type: 'Aufmaß',
            customer: p.customerName,
            project: p,
            appointment: null,
            time: p.measurementTime,
            date: dateStr,
            color: measurementColor.color,
            bgColor: measurementColor.bgColor,
            borderColor: measurementColor.borderColor,
            icon: <Ruler className="h-3 w-3" />,
          })
        }
        if (p.installationDate === dateStr) {
          const installationColor = TYPE_COLORS.Installation
          events.push({
            id: `project-${p.id}-installation`,
            type: 'Montage',
            customer: p.customerName,
            project: p,
            appointment: null,
            time: p.installationTime,
            date: dateStr,
            color: installationColor.color,
            bgColor: installationColor.bgColor,
            borderColor: installationColor.borderColor,
            icon: <Truck className="h-3 w-3" />,
            materialReady,
            materialReadyLabel,
          })
        }
        if (p.deliveryDate === dateStr) {
          const isLieferung = p.deliveryType === 'delivery'
          const deliveryColor = isLieferung ? TYPE_COLORS.Lieferung : TYPE_COLORS.Delivery
          events.push({
            id: `project-${p.id}-delivery`,
            type: isLieferung ? 'Lieferung' : 'Abholung',
            customer: p.customerName,
            project: p,
            appointment: null,
            time: p.deliveryTime,
            date: dateStr,
            color: deliveryColor.color,
            bgColor: deliveryColor.bgColor,
            borderColor: deliveryColor.borderColor,
            icon: <Package className="h-3 w-3" />,
          })
        }
        return events
      })

      const planningEvents = filteredAppointments
        .filter(a => a.date === dateStr)
        .map(a => {
          const assignedUserId = a.assignedUserId
          const assignedUserName = assignedUserId && teamMap ? teamMap[assignedUserId] : undefined
          const associatedProject = projects.find(
            p =>
              p.customerName === a.customerName ||
              (a.customerId && p.customerId && a.customerId === p.customerId)
          )
          const appointmentTypeOptions = {
            projectDeliveryType: associatedProject?.deliveryType,
            notes: a.notes,
          }
          const typeColorKey = getAppointmentTypeColorKey(a.type, appointmentTypeOptions)
          const typeColor = TYPE_COLORS[typeColorKey] || DEFAULT_TYPE_COLOR
          const typeLabel = getAppointmentTypeLabel(a.type, appointmentTypeOptions)
          // Planung/Beratung: keine Montagebereit-Anzeige (nur bei Montage-Terminen)

          return {
            id: `appointment-${a.id}`,
            type: 'Planung' as const,
            typeLabel,
            customer: a.customerName,
            time: a.time,
            project: associatedProject || null,
            appointment: a,
            date: dateStr,
            assignedUserId,
            assignedUserName,
            color: typeColor.color,
            bgColor: typeColor.bgColor,
            borderColor: typeColor.borderColor,
            icon: <ChefHat className="h-3 w-3" />,
          }
        })

      return [...projectEvents, ...planningEvents]
    },
    [projects, appointments, showOnlyMyAppointments, userId, teamMap]
  )

  const typeLegendEntries = useMemo(
    () =>
      Object.entries(TYPE_COLORS).map(([key, val]) => ({
        key,
        label: val.label,
        color: val.color,
        bgColor: val.bgColor,
        borderColor: val.borderColor,
      })),
    []
  )

  const projectsToAssign = useMemo(() => {
    const q = (debouncedSearchQuery || '').trim()
    if (!q) return []

    const query = q.toLowerCase()
    return projects
      .filter(p => {
        if (p.status === ProjectStatus.COMPLETED) return false

        if (p.customerName.toLowerCase().includes(query)) return true
        if (p.orderNumber.includes(query)) return true
        if (p.status.toLowerCase().includes(query)) return true

        if (p.address) {
          const addressParts = p.address.toLowerCase().split(',')
          if (addressParts.some(part => part.trim().includes(query))) return true
        }

        if (p.phone && p.phone.replace(/\s/g, '').includes(query.replace(/\s/g, ''))) return true

        return false
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.customerName.localeCompare(b.customerName, 'de')
          case 'date': {
            const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0
            const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0
            return dateB - dateA
          }
          case 'status':
            return a.status.localeCompare(b.status, 'de')
          default:
            return 0
        }
      })
  }, [projects, debouncedSearchQuery, sortBy])

  // Re-export centralized utilities for backward compatibility
  const getStatusColor = useCallback((status: ProjectStatus): string => {
    return getStatusColorUtil(status)
  }, [])

  const formatDate = useCallback((dateStr?: string): string => {
    return formatDateUtil(dateStr)
  }, [])

  return {
    getEventsForDate,
    projectsToAssign,
    getStatusColor,
    formatDate,
    typeLegendEntries,
  }
}
