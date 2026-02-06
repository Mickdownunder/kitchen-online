'use client'

import React from 'react'
import { ReceiptText, Euro, CheckCircle2, Clock } from 'lucide-react'
import { StatCard } from '@/components/ui'

interface InvoiceStats {
  total: number
  paid: number
  outstanding: number
  depositCount: number
  finalCount: number
  totalCount: number
  invoicedRevenue: number
  depositRevenue: number
}

interface InvoiceStatsCardsProps {
  stats: InvoiceStats
}

const formatCurrency = (amount: number): string => {
  return `${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

export const InvoiceStatsCards: React.FC<InvoiceStatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={ReceiptText}
        iconColor="purple"
        value={formatCurrency(stats.invoicedRevenue)}
        label="Buchhalterischer Umsatz"
        subtitle={`${stats.finalCount} Schlussrechnung${stats.finalCount !== 1 ? 'en' : ''}`}
        tint="purple"
      />
      <StatCard
        icon={Euro}
        iconColor="blue"
        value={formatCurrency(stats.depositRevenue)}
        label="Anzahlungs-Umsatz"
        subtitle={`${stats.depositCount} Anzahlung${stats.depositCount !== 1 ? 'en' : ''}`}
        tint="blue"
      />
      <StatCard
        icon={CheckCircle2}
        iconColor="emerald"
        value={formatCurrency(stats.paid)}
        label="Eingegangen"
        subtitle={
          stats.totalCount > 0 ? `${Math.round((stats.paid / stats.total) * 100)}% bezahlt` : '0%'
        }
        tint="emerald"
      />
      <StatCard
        icon={Clock}
        iconColor="amber"
        value={formatCurrency(stats.outstanding)}
        label="Offen"
        subtitle={`${stats.totalCount} Rechnung${stats.totalCount !== 1 ? 'en' : ''} gesamt`}
        tint="amber"
      />
    </div>
  )
}
