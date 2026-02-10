import type { ElementType } from 'react'
import Link from 'next/link'
import { CheckCircle2, Clock } from 'lucide-react'

const statusSteps = [
  { id: 'Planung', label: 'Planung', icon: '🎨' },
  { id: 'Aufmaß', label: 'Aufmaß', icon: '📐' },
  { id: 'Bestellt', label: 'Bestellt', icon: '✍️' },
  { id: 'Lieferung', label: 'Lieferung', icon: '🚚' },
  { id: 'Montage', label: 'Montage', icon: '🔧' },
  { id: 'Abgeschlossen', label: 'Fertig', icon: '🎉' },
]

export function getStatusIndex(status: string): number {
  const statusMap: Record<string, string> = {
    LEAD: 'Planung',
    Lead: 'Planung',
    PLANUNG: 'Planung',
    Planung: 'Planung',
    AUFMASS: 'Aufmaß',
    Aufmaß: 'Aufmaß',
    BESTELLT: 'Bestellt',
    Bestellt: 'Bestellt',
    ORDERED: 'Bestellt',
    Ordered: 'Bestellt',
    LIEFERUNG: 'Lieferung',
    Lieferung: 'Lieferung',
    MONTAGE: 'Montage',
    Montage: 'Montage',
    ABGESCHLOSSEN: 'Abgeschlossen',
    Abgeschlossen: 'Abgeschlossen',
    FERTIG: 'Abgeschlossen',
    Fertig: 'Abgeschlossen',
    Angebot: 'Planung',
    ANGEBOT: 'Planung',
    Auftrag: 'Bestellt',
    AUFTRAG: 'Bestellt',
  }

  const normalizedStatus = statusMap[status] || status
  const index = statusSteps.findIndex((step) => step.id === normalizedStatus)
  return index >= 0 ? index : 0
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) {
    return 'Guten Morgen'
  }
  if (hour < 18) {
    return 'Guten Tag'
  }
  return 'Guten Abend'
}

export function formatDashboardDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

export function getAppointmentLabel(type: string): string {
  const typeLabels: Record<string, string> = {
    Planung: 'Planungstermin',
    Consultation: 'Planungstermin',
    FirstMeeting: 'Erstgespräch',
    Aufmaß: 'Aufmaßtermin',
    Measurement: 'Aufmaßtermin',
    Lieferung: 'Liefertermin',
    Delivery: 'Liefertermin',
    Montage: 'Montagetermin',
    Installation: 'Montagetermin',
  }

  return typeLabels[type] || type
}

export function StatusTimelineMobile({ currentStatus }: { currentStatus: string }) {
  const currentIndex = getStatusIndex(currentStatus)

  return (
    <div className="space-y-0">
      {statusSteps.map((step, index) => {
        const isComplete = index <= currentIndex
        const isCurrent = index === currentIndex
        const isLast = index === statusSteps.length - 1

        return (
          <div key={step.id} className="relative flex gap-4">
            {!isLast && (
              <div
                className={`absolute left-5 top-10 h-full w-0.5 ${
                  isComplete ? 'bg-gradient-to-b from-emerald-500 to-emerald-400' : 'bg-slate-200'
                }`}
              />
            )}

            <div
              className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg transition-all duration-500 ${
                isComplete
                  ? 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/30'
                  : 'border-2 border-slate-200 bg-slate-100'
              } ${isCurrent ? 'scale-110 ring-4 ring-emerald-100' : ''}`}
            >
              {isComplete ? (
                <CheckCircle2 className="h-5 w-5 text-white" />
              ) : (
                <span className="text-slate-400">{step.icon}</span>
              )}
            </div>

            <div className={`flex-1 pb-8 ${isLast ? 'pb-0' : ''}`}>
              <p className={`font-semibold ${isComplete ? 'text-slate-900' : 'text-slate-400'}`}>
                {step.label}
              </p>
              {isCurrent && (
                <p className="mt-1 flex items-center gap-1 text-sm font-medium text-emerald-600">
                  <Clock className="h-3 w-3" />
                  Aktueller Schritt
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function StatusTimelineDesktop({ currentStatus }: { currentStatus: string }) {
  const currentIndex = getStatusIndex(currentStatus)

  return (
    <div className="relative">
      <div className="absolute left-0 top-5 h-1.5 w-full rounded-full bg-slate-100" />
      <div
        className="absolute left-0 top-5 h-1.5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 transition-all duration-1000 ease-out"
        style={{ width: `${(currentIndex / (statusSteps.length - 1)) * 100}%` }}
      />

      <div className="relative flex justify-between">
        {statusSteps.map((step, index) => {
          const isComplete = index <= currentIndex
          const isCurrent = index === currentIndex

          return (
            <div key={step.id} className="group flex flex-col items-center">
              <div
                className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-500 ${
                  isComplete
                    ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'border-2 border-slate-200 bg-white text-slate-400'
                } ${isCurrent ? 'scale-125 ring-4 ring-emerald-100' : 'group-hover:scale-110'}`}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <span className="text-base">{step.icon}</span>
                )}
              </div>
              <span
                className={`mt-3 text-xs font-semibold transition-colors ${
                  isComplete ? 'text-slate-900' : 'text-slate-400'
                } ${isCurrent ? 'text-emerald-600' : ''}`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface QuickActionCardProps {
  icon: ElementType
  label: string
  description: string
  value?: number
  href: string
  gradient: string
  iconBg: string
}

export function QuickActionCard({
  icon: Icon,
  label,
  description,
  value,
  href,
  gradient,
  iconBg,
}: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-xl bg-white/70 p-3.5 shadow-sm ring-1 ring-white/50 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 md:rounded-2xl md:p-5"
    >
      <div
        className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-40 ${gradient}`}
      />

      <div className="relative">
        <div className={`mb-2 inline-flex rounded-lg p-2 ${iconBg} md:mb-3 md:rounded-xl md:p-2.5`}>
          <Icon className="h-4 w-4 md:h-5 md:w-5" />
        </div>
        <p className="text-xs font-medium text-slate-500 md:text-sm">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-slate-900 md:text-2xl">
          {value !== undefined ? value : description}
        </p>
      </div>
    </Link>
  )
}
