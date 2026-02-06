'use client'

import React from 'react'
import {
  Clock,
  ReceiptText,
  AlertTriangle,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react'
import { CustomerProject, Invoice, ProjectStatus } from '@/types'
import { TicketStats } from './types'
import { StatCard } from '@/components/ui'

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

  const cards: Array<{
    label: string
    value: string
    icon: typeof Clock
    href: string
    iconColor: 'blue' | 'emerald' | 'red' | 'slate' | 'violet' | 'amber'
    tint: 'blue' | 'emerald' | 'red' | 'slate' | 'violet' | 'amber'
    subtitle?: string
    alertDot?: boolean
  }> = [
    {
      label: 'Aktive Projekte',
      value: activeProjects.toString(),
      icon: Clock,
      href: '/projects',
      iconColor: 'blue',
      tint: 'blue',
    },
    {
      label: 'Offene Rechnungen',
      value: `${formatCurrency(openInvoiceTotal)} €`,
      icon: ReceiptText,
      href: '/invoices',
      iconColor: 'emerald',
      tint: 'emerald',
    },
    {
      label: 'Überfällig',
      value: overdueInvoices.length > 0 ? `${formatCurrency(overdueTotal)} €` : '0 €',
      icon: AlertTriangle,
      href: '/invoices',
      iconColor: overdueInvoices.length > 0 ? 'red' : 'slate',
      tint: overdueInvoices.length > 0 ? 'red' : 'slate',
      subtitle: overdueInvoices.length > 0 ? `${overdueInvoices.length} Rechnungen` : undefined,
      alertDot: overdueInvoices.length > 0,
    },
    {
      label: 'Offene Tickets',
      value: (ticketStats.open + ticketStats.inProgress).toString(),
      icon: MessageSquare,
      href: '/tickets',
      iconColor: 'violet',
      tint: 'violet',
    },
    {
      label: 'Reklamationen',
      value: openComplaints.toString(),
      icon: ShieldAlert,
      href: '/complaints?status=reported',
      iconColor: openComplaints > 0 ? 'amber' : 'slate',
      tint: openComplaints > 0 ? 'amber' : 'slate',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-5">
      {cards.map(card => (
        <StatCard
          key={card.label}
          icon={card.icon}
          iconColor={card.iconColor}
          value={card.value}
          label={card.label}
          subtitle={card.subtitle}
          decorativeCircle
          tint={card.tint}
          alertDot={'alertDot' in card ? card.alertDot : false}
          href={card.href}
        />
      ))}
    </div>
  )
}
