'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Calendar, CalendarCheck, CheckCircle2, Loader2 } from 'lucide-react'
import { portalSupabase } from '@/lib/supabase/portal-client'
import { useProject } from '../context/ProjectContext'
import { useCustomerApi } from '../hooks/useCustomerApi'
import {
  AppointmentCard,
  isDatePast,
  isDateToday,
  NextAppointmentCard,
  type Appointment,
  type ProjectDates,
} from './termine.ui'

export default function PortalTerminePage() {
  const { accessToken, isReady } = useCustomerApi()
  const { selectedProject, isLoading: projectLoading } = useProject()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [projectDates, setProjectDates] = useState<ProjectDates | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (projectId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: appointmentsData, error: appointmentsError } = await portalSupabase
        .from('planning_appointments')
        .select('id, type, date, time, notes')
        .eq('project_id', projectId)
        .order('date', { ascending: true })

      if (appointmentsError) {
        throw appointmentsError
      }

      const { data: projectData, error: projectError } = await portalSupabase
        .from('projects')
        .select(
          'id, measurement_date, measurement_time, delivery_date, delivery_time, installation_date, installation_time, status',
        )
        .eq('id', projectId)
        .single()

      if (projectError) {
        throw projectError
      }

      setAppointments(appointmentsData || [])
      setProjectDates({
        measurementDate: projectData?.measurement_date || null,
        measurementTime: projectData?.measurement_time || null,
        deliveryDate: projectData?.delivery_date || null,
        deliveryTime: projectData?.delivery_time || null,
        installationDate: projectData?.installation_date || null,
        installationTime: projectData?.installation_time || null,
        status: projectData?.status || '',
      })
    } catch {
      setError('Termine konnten nicht geladen werden.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isReady && accessToken && selectedProject?.id && !projectLoading) {
      loadData(selectedProject.id)
    } else if (isReady && !accessToken) {
      setIsLoading(false)
      setError('NOT_AUTHENTICATED')
    }
  }, [isReady, accessToken, selectedProject?.id, projectLoading, loadData])

  const allAppointments: Array<{
    type: string
    date: string
    time: string | null
    notes?: string | null
    source: 'appointment' | 'project'
  }> = []

  appointments.forEach((apt) => {
    allAppointments.push({
      type: apt.type,
      date: apt.date,
      time: apt.time,
      notes: apt.notes,
      source: 'appointment',
    })
  })

  if (projectDates) {
    const hasAppointmentType = (type: string) => appointments.some((appointment) => appointment.type === type)
    const isLeadProject = projectDates.status === 'Lead' || projectDates.status === 'LEAD'

    if (projectDates.measurementDate && !hasAppointmentType('Aufmaß') && !isLeadProject) {
      allAppointments.push({
        type: 'Aufmaß',
        date: projectDates.measurementDate,
        time: projectDates.measurementTime,
        source: 'project',
      })
    }

    if (projectDates.deliveryDate && !hasAppointmentType('Lieferung')) {
      allAppointments.push({
        type: 'Lieferung',
        date: projectDates.deliveryDate,
        time: projectDates.deliveryTime,
        source: 'project',
      })
    }

    if (projectDates.installationDate && !hasAppointmentType('Montage')) {
      allAppointments.push({
        type: 'Montage',
        date: projectDates.installationDate,
        time: projectDates.installationTime,
        source: 'project',
      })
    }
  }

  allAppointments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const upcomingAppointments = allAppointments.filter(
    (appointment) => !isDatePast(appointment.date) || isDateToday(appointment.date),
  )
  const pastAppointments = allAppointments.filter(
    (appointment) => isDatePast(appointment.date) && !isDateToday(appointment.date),
  )

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto h-12 w-12">
            <div className="absolute inset-0 animate-ping rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-20" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          </div>
          <p className="mt-4 text-slate-500">Termine werden geladen...</p>
        </div>
      </div>
    )
  }

  if (error === 'NOT_AUTHENTICATED') {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-slate-900">Nicht angemeldet</h2>
          <p className="mt-2 text-slate-500">Bitte melden Sie sich erneut an.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Termine</h1>
        <p className="mt-1 text-slate-500">Alle Termine rund um Ihr Küchenprojekt</p>
      </div>

      <div className="space-y-6">
        {upcomingAppointments.length === 0 ? (
          <>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                <CalendarCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Anstehende Termine</h2>
            </div>
            <div className="rounded-2xl bg-slate-50 p-8 text-center">
              <Calendar className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-slate-500">Keine anstehenden Termine</p>
              <p className="mt-1 text-sm text-slate-400">
                Neue Termine werden hier angezeigt, sobald sie geplant sind.
              </p>
            </div>
          </>
        ) : (
          <>
            <NextAppointmentCard
              type={upcomingAppointments[0].type}
              date={upcomingAppointments[0].date}
              time={upcomingAppointments[0].time}
              notes={upcomingAppointments[0].notes}
              isToday={isDateToday(upcomingAppointments[0].date)}
            />

            {upcomingAppointments.length > 1 && (
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                    <Calendar className="h-4 w-4 text-slate-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">Weitere Termine</h2>
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {upcomingAppointments.length - 1}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {upcomingAppointments.slice(1).map((appointment, index) => (
                    <AppointmentCard
                      key={`${appointment.type}-${appointment.date}-${index}`}
                      type={appointment.type}
                      date={appointment.date}
                      time={appointment.time}
                      notes={appointment.notes}
                      isPast={false}
                      isToday={isDateToday(appointment.date)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {pastAppointments.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
              <CheckCircle2 className="h-4 w-4 text-slate-500" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Vergangene Termine</h2>
            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {pastAppointments.length}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {pastAppointments.map((appointment, index) => (
              <AppointmentCard
                key={`past-${appointment.type}-${appointment.date}-${index}`}
                type={appointment.type}
                date={appointment.date}
                time={appointment.time}
                notes={appointment.notes}
                isPast
                isToday={false}
              />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100 p-4 ring-1 ring-slate-200/50">
        <p className="text-sm text-slate-600">
          <strong className="text-slate-700">Hinweis:</strong> Bei Fragen zu Terminen oder
          Terminänderungen kontaktieren Sie uns bitte über den Hilfe-Bereich.
        </p>
      </div>
    </div>
  )
}
