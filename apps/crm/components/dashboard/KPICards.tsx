'use client'

import React from 'react'
import Link from 'next/link'
import {
  Clock,
  ReceiptText,
  AlertTriangle,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react'
import { CustomerProject, Invoice, ProjectStatus } from '@/types'
import { TicketStats } from './types'

interface KPICardsProps {
  projects: CustomerProject[]
  openInvoices: Invoice[]
  ticketStats: TicketStats
}

const formatCurrency = (value: number) =>
  value.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default function KPICards({ projects, openInvoices, ticketStats }: KPICardsProps) {
  const activeProjects = projects.filter(p => p.status !== ProjectStatus.COMPLETED).length
  const openInvoiceTotal = openInvoices.reduce((sum, inv) => sum + inv.amount, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const overdueInvoices = openInvoices.filter(inv => {
    if (!inv.dueDate) return false
    return new Date(inv.dueDate) < today
  })
  const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0)

  const openComplaints = projects.reduce(
    (sum, p) => sum + (p.complaints?.filter(c => c.status !== 'resolved').length || 0),
    0
  )

  const cards = [
    {
      label: 'Aktive Projekte',
      value: activeProjects.toString(),
      icon: Clock,
      href: '/projects',
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      tint: 'to-blue-50/30',
    },
    {
      label: 'Offene Rechnungen',
      value: `${formatCurrency(openInvoiceTotal)} €`,
      icon: ReceiptText,
      href: '/invoices',
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      tint: 'to-emerald-50/30',
    },
    {
      label: 'Überfällig',
      value: overdueInvoices.length > 0 ? `${formatCurrency(overdueTotal)} €` : '0 €',
      icon: AlertTriangle,
      href: '/invoices',
      iconColor: overdueInvoices.length > 0 ? 'text-red-600' : 'text-slate-400',
      iconBg: overdueInvoices.length > 0 ? 'bg-red-100' : 'bg-slate-100',
      tint: overdueInvoices.length > 0 ? 'to-red-50/30' : 'to-slate-50/30',
      subtitle: overdueInvoices.length > 0 ? `${overdueInvoices.length} Rechnungen` : undefined,
      isAlert: overdueInvoices.length > 0,
    },
    {
      label: 'Offene Tickets',
      value: (ticketStats.open + ticketStats.inProgress).toString(),
      icon: MessageSquare,
      href: '/tickets',
      iconColor: 'text-violet-600',
      iconBg: 'bg-violet-100',
      tint: 'to-violet-50/30',
    },
    {
      label: 'Reklamationen',
      value: openComplaints.toString(),
      icon: ShieldAlert,
      href: '/complaints?status=reported',
      iconColor: openComplaints > 0 ? 'text-amber-600' : 'text-slate-400',
      iconBg: openComplaints > 0 ? 'bg-amber-100' : 'bg-slate-100',
      tint: openComplaints > 0 ? 'to-amber-50/30' : 'to-slate-50/30',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-5">
      {cards.map(card => (
        <Link
          key={card.label}
          href={card.href}
          className={`glass group relative overflow-hidden rounded-2xl border border-white/50 bg-gradient-to-br from-white ${card.tint} p-6 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}
        >
          {/* Decorative circle like OverviewTab */}
          <div className={`absolute right-0 top-0 -mr-10 -mt-10 h-24 w-24 rounded-full ${card.iconBg} opacity-20 transition-opacity duration-300 group-hover:opacity-30`} />

          {card.isAlert && (
            <div className="absolute right-3 top-3 h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
          )}

          <div className="relative">
            <div className="mb-3 flex items-center gap-3">
              <div className={`rounded-xl ${card.iconBg} p-2.5`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-800">{card.value}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {card.label}
            </p>
            {'subtitle' in card && card.subtitle && (
              <p className="mt-0.5 text-xs font-semibold text-red-500">{card.subtitle}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
