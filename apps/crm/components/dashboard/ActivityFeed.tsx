'use client'

import React, { useMemo } from 'react'
import {
  Users,
  ShieldAlert,
  ReceiptText,
  CalendarDays,
} from 'lucide-react'
import { CustomerProject, Invoice, PlanningAppointment } from '@/types'

interface ActivityFeedProps {
  projects: CustomerProject[]
  openInvoices: Invoice[]
  appointments: PlanningAppointment[]
}

interface ActivityItem {
  id: string
  type: 'project' | 'complaint' | 'payment' | 'appointment'
  text: string
  detail?: string
  timestamp: Date
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
}

function timeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'gerade eben'
  if (diffMins < 60) return `vor ${diffMins} Min.`
  if (diffHours < 24) return `vor ${diffHours} Std.`
  if (diffDays === 1) return 'gestern'
  if (diffDays < 7) return `vor ${diffDays} Tagen`
  if (diffDays < 30) return `vor ${Math.floor(diffDays / 7)} Wo.`
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

export default function ActivityFeed({
  projects,
  openInvoices,
  appointments,
}: ActivityFeedProps) {
  const activities = useMemo(() => {
    const items: ActivityItem[] = []

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    projects.forEach(p => {
      const created = new Date(p.createdAt)
      if (created > thirtyDaysAgo) {
        items.push({
          id: `project-${p.id}`,
          type: 'project',
          text: 'Neues Projekt',
          detail: `${p.customerName} - ${p.orderNumber}`,
          timestamp: created,
          icon: Users,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
        })
      }

      p.complaints?.forEach(c => {
        const cCreated = new Date(c.createdAt)
        if (cCreated > thirtyDaysAgo && c.status !== 'resolved') {
          items.push({
            id: `complaint-${c.id}`,
            type: 'complaint',
            text: 'Neue Reklamation',
            detail: p.customerName,
            timestamp: cCreated,
            icon: ShieldAlert,
            color: 'text-red-600',
            bgColor: 'bg-red-100',
          })
        }
      })
    })

    openInvoices.forEach(inv => {
      if (inv.isPaid && inv.paidDate) {
        const paidDate = new Date(inv.paidDate)
        if (paidDate > thirtyDaysAgo) {
          items.push({
            id: `payment-${inv.id}`,
            type: 'payment',
            text: 'Zahlung eingegangen',
            detail: `${inv.invoiceNumber} - ${inv.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`,
            timestamp: paidDate,
            icon: ReceiptText,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-100',
          })
        }
      }
    })

    appointments.forEach(a => {
      const apptDate = new Date(a.date)
      if (apptDate > thirtyDaysAgo) {
        items.push({
          id: `appt-${a.id}`,
          type: 'appointment',
          text: `Termin: ${a.type === 'Measurement' ? 'Aufmaß' : a.type === 'Installation' ? 'Montage' : a.type === 'Consultation' ? 'Beratung' : a.type}`,
          detail: a.customerName,
          timestamp: apptDate,
          icon: CalendarDays,
          color: 'text-violet-600',
          bgColor: 'bg-violet-100',
        })
      }
    })

    return items
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 8)
  }, [projects, openInvoices, appointments])

  return (
    <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-purple-50/30 p-6 shadow-lg transition-all duration-300 hover:shadow-xl sm:rounded-3xl">
      <h3 className="mb-4 text-sm font-black text-slate-700 sm:text-base">Letzte Aktivitäten</h3>
      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <CalendarDays className="mb-2 h-8 w-8 opacity-30" />
          <p className="text-sm font-medium">Keine aktuellen Aktivitäten</p>
        </div>
      ) : (
        <div className="relative space-y-0.5">
          {/* Timeline line */}
          <div className="absolute bottom-3 left-[17px] top-3 w-px bg-slate-100" />

          {activities.map(activity => {
            const Icon = activity.icon

            return (
              <div
                key={activity.id}
                className="group relative flex items-start gap-3 rounded-lg px-1 py-2 transition-all hover:bg-white/60"
              >
                <div
                  className={`relative z-10 shrink-0 rounded-lg p-1.5 ${activity.bgColor}`}
                >
                  <Icon className={`h-3.5 w-3.5 ${activity.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-700">{activity.text}</p>
                  {activity.detail && (
                    <p className="truncate text-[11px] text-slate-400">{activity.detail}</p>
                  )}
                </div>
                <span className="shrink-0 text-[10px] font-medium text-slate-300">
                  {timeAgo(activity.timestamp)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
