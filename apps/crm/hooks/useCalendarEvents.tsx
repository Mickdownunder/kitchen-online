'use client'

import { useCallback, useMemo } from 'react'
import { Ruler, Truck, ChefHat, Package } from 'lucide-react'
import type { CustomerProject, PlanningAppointment } from '@/types'
import { ProjectStatus } from '@/types'
import { formatDate as formatDateUtil, getStatusColor as getStatusColorUtil } from '@/lib/utils'

export type CalendarEvent = {
  id: string
  type: 'Aufmaß' | 'Montage' | 'Planung' | 'Abholung'
  customer: string
  project: CustomerProject | null
  appointment: PlanningAppointment | null
  time?: string
  color: string
  bgColor: string
  borderColor: string
  icon: React.ReactNode
  date: string
}

interface UseCalendarEventsOptions {
  projects: CustomerProject[]
  appointments: PlanningAppointment[]
  showOnlyMyAppointments: boolean
  userId?: string | null
  debouncedSearchQuery: string
  sortBy: 'name' | 'date' | 'status'
}

const formatDateString = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

export function useCalendarEvents(options: UseCalendarEventsOptions) {
  const { projects, appointments, showOnlyMyAppointments, userId, debouncedSearchQuery, sortBy } =
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
              (a.customerName === p.customerName || a.customerId === p.customerId)
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
        if (p.measurementDate === dateStr) {
          events.push({
            id: `project-${p.id}-measurement`,
            type: 'Aufmaß',
            customer: p.customerName,
            project: p,
            appointment: null,
            time: p.measurementTime,
            date: dateStr,
            color: 'text-indigo-700',
            bgColor: 'bg-indigo-50',
            borderColor: 'border-indigo-400',
            icon: <Ruler className="h-3 w-3" />,
          })
        }
        if (p.installationDate === dateStr) {
          events.push({
            id: `project-${p.id}-installation`,
            type: 'Montage',
            customer: p.customerName,
            project: p,
            appointment: null,
            time: p.installationTime,
            date: dateStr,
            color: 'text-amber-700',
            bgColor: 'bg-amber-50',
            borderColor: 'border-amber-400',
            icon: <Truck className="h-3 w-3" />,
          })
        }
        if (p.deliveryDate === dateStr) {
          events.push({
            id: `project-${p.id}-delivery`,
            type: 'Abholung',
            customer: p.customerName,
            project: p,
            appointment: null,
            time: p.deliveryTime,
            date: dateStr,
            color: 'text-orange-700',
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-400',
            icon: <Package className="h-3 w-3" />,
          })
        }
        return events
      })

      const planningEvents = filteredAppointments
        .filter(a => a.date === dateStr)
        .map(a => {
          const associatedProject = projects.find(
            p => p.customerName === a.customerName || p.customerId === a.customerId
          )

          return {
            id: `appointment-${a.id}`,
            type: 'Planung' as const,
            customer: a.customerName,
            time: a.time,
            project: associatedProject || null,
            appointment: a,
            date: dateStr,
            color: 'text-emerald-700',
            bgColor: 'bg-emerald-50',
            borderColor: 'border-emerald-400',
            icon: <ChefHat className="h-3 w-3" />,
          }
        })

      return [...projectEvents, ...planningEvents]
    },
    [projects, appointments, showOnlyMyAppointments, userId]
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
  }
}
