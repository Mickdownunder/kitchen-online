'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  MessageSquare,
  Ruler,
  Wrench,
  Truck,
  HelpCircle,
  Users,
  RotateCcw,
  ArrowRight,
} from 'lucide-react'
import { PlanningAppointment } from '@/types'

interface UpcomingAppointmentsProps {
  appointments: PlanningAppointment[]
}

const TYPE_CONFIG: Record<
  PlanningAppointment['type'],
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }
> = {
  Consultation: { label: 'Beratung', icon: MessageSquare, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  FirstMeeting: { label: 'Erstgespräch', icon: Users, color: 'text-sky-600', bgColor: 'bg-sky-100' },
  Measurement: { label: 'Aufmaß', icon: Ruler, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  Installation: { label: 'Montage', icon: Wrench, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  Service: { label: 'Service', icon: HelpCircle, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  ReMeasurement: { label: 'Nachmaß', icon: RotateCcw, color: 'text-violet-600', bgColor: 'bg-violet-100' },
  Delivery: { label: 'Lieferung', icon: Truck, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  Other: { label: 'Sonstiges', icon: CalendarDays, color: 'text-slate-600', bgColor: 'bg-slate-100' },
}

function formatDate(dateStr: string): string {
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  today.setHours(0, 0, 0, 0)
  tomorrow.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)

  if (d.getTime() === today.getTime()) return 'Heute'
  if (d.getTime() === tomorrow.getTime()) return 'Morgen'

  return new Date(dateStr).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
}

export default function UpcomingAppointments({ appointments }: UpcomingAppointmentsProps) {
  const upcoming = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    return appointments
      .filter(a => {
        const apptDate = new Date(a.date)
        apptDate.setHours(0, 0, 0, 0)
        return apptDate >= now
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5)
  }, [appointments])

  return (
    <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-blue-50/30 p-6 shadow-lg transition-all duration-300 hover:shadow-xl sm:rounded-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-700 sm:text-base">Nächste Termine</h3>
        <Link
          href="/calendar"
          className="flex items-center gap-1 text-xs font-bold text-amber-600 transition-colors hover:text-amber-700"
        >
          Kalender <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {upcoming.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <CalendarDays className="mb-2 h-8 w-8 opacity-30" />
          <p className="text-sm font-medium">Keine anstehenden Termine</p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcoming.map(appt => {
            const config = TYPE_CONFIG[appt.type] || TYPE_CONFIG.Other
            const Icon = config.icon

            return (
              <Link
                key={appt.id}
                href="/calendar"
                className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-all hover:bg-white/60"
              >
                <div className={`shrink-0 rounded-lg ${config.bgColor} p-2`}>
                  <Icon className={`h-4 w-4 ${config.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-700">
                    {appt.customerName}
                  </p>
                  <p className="text-xs text-slate-400">{config.label}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-bold text-slate-600">{formatDate(appt.date)}</p>
                  {appt.time && (
                    <p className="text-[11px] text-slate-400">{appt.time}</p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
