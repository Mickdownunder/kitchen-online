import { Calendar, CheckCircle2, Clock, Ruler, Truck, Wrench, type LucideIcon } from 'lucide-react'

export interface Appointment {
  id: string
  type: string
  date: string
  time: string | null
  notes: string | null
}

export interface ProjectDates {
  measurementDate: string | null
  measurementTime: string | null
  deliveryDate: string | null
  deliveryTime: string | null
  installationDate: string | null
  installationTime: string | null
  status: string
}

const typeConfig: Record<string, { label: string; icon: LucideIcon; color: string; bgColor: string }> = {
  Consultation: {
    label: 'Planungstermin',
    icon: Calendar,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  FirstMeeting: {
    label: 'Erstgespräch',
    icon: Calendar,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  Planung: { label: 'Planungstermin', icon: Calendar, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  Aufmaß: { label: 'Aufmaßtermin', icon: Ruler, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  Measurement: {
    label: 'Aufmaßtermin',
    icon: Ruler,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
  Lieferung: { label: 'Lieferung', icon: Truck, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  Delivery: { label: 'Lieferung', icon: Truck, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  Montage: { label: 'Montage', icon: Wrench, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  Installation: { label: 'Montage', icon: Wrench, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
}

function formatDate(dateString: string | null): string {
  if (!dateString) {
    return '-'
  }

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
  if (!timeString) {
    return ''
  }

  try {
    const [hours, minutes] = timeString.split(':')
    return `${hours}:${minutes} Uhr`
  } catch {
    return ''
  }
}

export function isDatePast(dateString: string | null): boolean {
  if (!dateString) {
    return false
  }

  const date = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

export function isDateToday(dateString: string | null): boolean {
  if (!dateString) {
    return false
  }

  const date = new Date(dateString)
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

interface NextAppointmentCardProps {
  type: string
  date: string
  time: string | null
  notes?: string | null
  isToday: boolean
}

export function NextAppointmentCard({ type, date, time, notes, isToday }: NextAppointmentCardProps) {
  const config =
    typeConfig[type] ||
    ({ label: type, icon: Calendar, color: 'text-white', bgColor: 'bg-white/20' } as const)
  const Icon = config.icon

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-6 text-white shadow-xl shadow-emerald-500/30">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-teal-400/20 blur-xl" />

      <div className="absolute right-4 top-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
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

          {notes && <p className="mt-4 border-t border-white/20 pt-4 text-sm text-emerald-100">{notes}</p>}
        </div>
      </div>
    </div>
  )
}

interface AppointmentCardProps {
  type: string
  date: string
  time: string | null
  notes?: string | null
  isPast: boolean
  isToday: boolean
}

export function AppointmentCard({ type, date, time, notes, isPast, isToday }: AppointmentCardProps) {
  const config =
    typeConfig[type] ||
    ({ label: type, icon: Calendar, color: 'text-slate-600', bgColor: 'bg-slate-50' } as const)
  const Icon = config.icon

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 transition-all duration-300 hover:shadow-lg ${
        isPast
          ? 'opacity-60 ring-slate-200/50'
          : isToday
            ? 'ring-emerald-300 shadow-emerald-100'
            : 'ring-slate-200/50 hover:shadow-slate-200/50'
      }`}
    >
      {isToday && (
        <div className="absolute right-4 top-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
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
          {notes && <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500">{notes}</p>}
        </div>
      </div>
    </div>
  )
}
