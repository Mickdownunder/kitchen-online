'use client'

import { useEffect, useState, useCallback } from 'react'
import { portalSupabase } from '@/lib/supabase/portal-client'
import { 
  Calendar,
  Clock,
  Loader2, 
  AlertCircle,
  CalendarCheck,
  Ruler,
  Truck,
  Wrench,
  CheckCircle2
} from 'lucide-react'
import { useCustomerApi } from '../hooks/useCustomerApi'
import { useProject } from '../context/ProjectContext'

interface Appointment {
  id: string
  type: string
  date: string
  time: string | null
  notes: string | null
}

interface ProjectDates {
  measurementDate: string | null
  measurementTime: string | null
  deliveryDate: string | null
  deliveryTime: string | null
  installationDate: string | null
  installationTime: string | null
  status: string
}

// Appointment type config
const typeConfig: Record<string, { label: string; icon: typeof Calendar; color: string; bgColor: string }> = {
  'Consultation': { label: 'Planungstermin', icon: Calendar, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  'FirstMeeting': { label: 'Erstgespräch', icon: Calendar, color: 'text-amber-600', bgColor: 'bg-amber-50' },
  'Planung': { label: 'Planungstermin', icon: Calendar, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  'Aufmaß': { label: 'Aufmaßtermin', icon: Ruler, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  'Measurement': { label: 'Aufmaßtermin', icon: Ruler, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  'Lieferung': { label: 'Lieferung', icon: Truck, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  'Delivery': { label: 'Lieferung', icon: Truck, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  'Montage': { label: 'Montage', icon: Wrench, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  'Installation': { label: 'Montage', icon: Wrench, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return '-'
  }
}

function formatTime(timeString: string | null): string {
  if (!timeString) return ''
  try {
    const [hours, minutes] = timeString.split(':')
    return `${hours}:${minutes} Uhr`
  } catch {
    return ''
  }
}

function isDatePast(dateString: string | null): boolean {
  if (!dateString) return false
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

function isDateToday(dateString: string | null): boolean {
  if (!dateString) return false
  const date = new Date(dateString)
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

// Hero card for the NEXT upcoming appointment - highly visible
function NextAppointmentCard({ 
  type,
  date,
  time,
  notes,
  isToday,
}: { 
  type: string
  date: string
  time: string | null
  notes?: string | null
  isToday: boolean
}) {
  const config = typeConfig[type] || { label: type, icon: Calendar, color: 'text-white', bgColor: 'bg-white/20' }
  const Icon = config.icon

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-6 text-white shadow-xl shadow-emerald-500/30">
      {/* Decorative elements */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-teal-400/20 blur-xl" />
      
      {/* Badge */}
      <div className="absolute right-4 top-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-white">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          {isToday ? 'Heute' : 'Nächster Termin'}
        </span>
      </div>

      <div className="relative flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
          <Icon className="h-7 w-7 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-emerald-100">Ihr nächster Termin</p>
          <h3 className="mt-1 text-xl font-bold text-white">{config.label}</h3>
          
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-100">
              <Calendar className="h-5 w-5" />
              <span className="text-lg font-semibold text-white">{formatDate(date)}</span>
            </div>
            {time && (
              <div className="flex items-center gap-2 text-emerald-100">
                <Clock className="h-5 w-5" />
                <span className="text-lg font-semibold text-white">{formatTime(time)}</span>
              </div>
            )}
          </div>
          
          {notes && (
            <p className="mt-4 text-sm text-emerald-100 border-t border-white/20 pt-4">
              {notes}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Regular card for other appointments
function AppointmentCard({ 
  type,
  date,
  time,
  notes,
  isPast,
  isToday,
}: { 
  type: string
  date: string
  time: string | null
  notes?: string | null
  isPast: boolean
  isToday: boolean
}) {
  const config = typeConfig[type] || { label: type, icon: Calendar, color: 'text-slate-600', bgColor: 'bg-slate-50' }
  const Icon = config.icon

  return (
    <div className={`group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 transition-all duration-300 hover:shadow-lg ${
      isPast 
        ? 'ring-slate-200/50 opacity-60' 
        : isToday 
          ? 'ring-emerald-300 shadow-emerald-100' 
          : 'ring-slate-200/50 hover:shadow-slate-200/50'
    }`}>
      {isToday && (
        <div className="absolute right-4 top-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Heute
          </span>
        </div>
      )}
      {isPast && (
        <div className="absolute right-4 top-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        </div>
      )}
      
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${config.bgColor}`}>
          <Icon className={`h-6 w-6 ${config.color}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">{config.label}</h3>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>{formatDate(date)}</span>
            </div>
            {time && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="h-4 w-4 text-slate-400" />
                <span>{formatTime(time)}</span>
              </div>
            )}
          </div>
          {notes && (
            <p className="mt-3 text-sm text-slate-500 border-t border-slate-100 pt-3">
              {notes}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

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
      // Fetch appointments for the selected project
      const { data: appointmentsData, error: appointmentsError } = await portalSupabase
        .from('planning_appointments')
        .select('id, type, date, time, notes')
        .eq('project_id', projectId)
        .order('date', { ascending: true })

      if (appointmentsError) throw appointmentsError

      // Fetch project dates for the selected project
      const { data: projectData, error: projectError } = await portalSupabase
        .from('projects')
        .select('id, measurement_date, measurement_time, delivery_date, delivery_time, installation_date, installation_time, status')
        .eq('id', projectId)
        .single()
      
      if (projectError) throw projectError

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
    } catch (err) {
      console.error('Error loading appointments:', err)
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

  // Combine appointments with project dates
  const allAppointments: Array<{ type: string; date: string; time: string | null; notes?: string | null; source: 'appointment' | 'project' }> = []

  // Add planning appointments
  appointments.forEach(apt => {
    allAppointments.push({
      type: apt.type,
      date: apt.date,
      time: apt.time,
      notes: apt.notes,
      source: 'appointment'
    })
  })

  // Add project dates if they exist and aren't already in appointments
  // Note: For Lead projects, measurement_date is used to store the planning appointment date,
  // so we don't add it as a separate Aufmaß entry if status is Lead
  if (projectDates) {
    const hasAppointmentType = (type: string) => appointments.some(a => a.type === type)
    const isLeadProject = projectDates.status === 'Lead' || projectDates.status === 'LEAD'

    // Only show measurementDate as Aufmaß if NOT a lead project
    // For leads, the measurement_date field stores the planning appointment date
    if (projectDates.measurementDate && !hasAppointmentType('Aufmaß') && !isLeadProject) {
      allAppointments.push({
        type: 'Aufmaß',
        date: projectDates.measurementDate,
        time: projectDates.measurementTime,
        source: 'project'
      })
    }

    if (projectDates.deliveryDate && !hasAppointmentType('Lieferung')) {
      allAppointments.push({
        type: 'Lieferung',
        date: projectDates.deliveryDate,
        time: projectDates.deliveryTime,
        source: 'project'
      })
    }

    if (projectDates.installationDate && !hasAppointmentType('Montage')) {
      allAppointments.push({
        type: 'Montage',
        date: projectDates.installationDate,
        time: projectDates.installationTime,
        source: 'project'
      })
    }
  }

  // Sort by date
  allAppointments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Split into upcoming and past
  const upcomingAppointments = allAppointments.filter(a => !isDatePast(a.date) || isDateToday(a.date))
  const pastAppointments = allAppointments.filter(a => isDatePast(a.date) && !isDateToday(a.date))

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto h-12 w-12">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-20 animate-ping" />
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Termine</h1>
        <p className="mt-1 text-slate-500">
          Alle Termine rund um Ihr Küchenprojekt
        </p>
      </div>

      {/* Upcoming Appointments */}
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
              <p className="mt-1 text-sm text-slate-400">Neue Termine werden hier angezeigt, sobald sie geplant sind.</p>
            </div>
          </>
        ) : (
          <>
            {/* Next appointment - hero card */}
            <NextAppointmentCard
              type={upcomingAppointments[0].type}
              date={upcomingAppointments[0].date}
              time={upcomingAppointments[0].time}
              notes={upcomingAppointments[0].notes}
              isToday={isDateToday(upcomingAppointments[0].date)}
            />

            {/* Other upcoming appointments */}
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
                  {upcomingAppointments.slice(1).map((apt, idx) => (
                    <AppointmentCard
                      key={`${apt.type}-${apt.date}-${idx}`}
                      type={apt.type}
                      date={apt.date}
                      time={apt.time}
                      notes={apt.notes}
                      isPast={false}
                      isToday={isDateToday(apt.date)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Past Appointments */}
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
            {pastAppointments.map((apt, idx) => (
              <AppointmentCard
                key={`past-${apt.type}-${apt.date}-${idx}`}
                type={apt.type}
                date={apt.date}
                time={apt.time}
                notes={apt.notes}
                isPast={true}
                isToday={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100 p-4 ring-1 ring-slate-200/50">
        <p className="text-sm text-slate-600">
          <strong className="text-slate-700">Hinweis:</strong> Bei Fragen zu Terminen oder Terminänderungen kontaktieren Sie uns bitte über den Hilfe-Bereich.
        </p>
      </div>
    </div>
  )
}
