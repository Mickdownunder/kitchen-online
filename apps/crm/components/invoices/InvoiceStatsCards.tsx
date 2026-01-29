'use client'

import React from 'react'
import { ReceiptText, Euro, CheckCircle2, Clock } from 'lucide-react'

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
      <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-purple-50/30 p-6 shadow-lg">
        <div className="mb-2 flex items-center gap-3">
          <ReceiptText className="h-6 w-6 text-purple-600" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">
            Buchhalterischer Umsatz
          </p>
        </div>
        <p className="text-3xl font-black text-slate-900">
          {formatCurrency(stats.invoicedRevenue)}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {stats.finalCount} Schlussrechnung{stats.finalCount !== 1 ? 'en' : ''}
        </p>
      </div>

      <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-blue-50/30 p-6 shadow-lg">
        <div className="mb-2 flex items-center gap-3">
          <Euro className="h-6 w-6 text-blue-600" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">
            Anzahlungs-Umsatz
          </p>
        </div>
        <p className="text-3xl font-black text-slate-900">{formatCurrency(stats.depositRevenue)}</p>
        <p className="mt-1 text-xs text-slate-500">
          {stats.depositCount} Anzahlung{stats.depositCount !== 1 ? 'en' : ''}
        </p>
      </div>

      <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-emerald-50/30 p-6 shadow-lg">
        <div className="mb-2 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Eingegangen</p>
        </div>
        <p className="text-3xl font-black text-slate-900">{formatCurrency(stats.paid)}</p>
        <p className="mt-1 text-xs text-slate-500">
          {stats.totalCount > 0 ? `${Math.round((stats.paid / stats.total) * 100)}% bezahlt` : '0%'}
        </p>
      </div>

      <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-amber-50/30 p-6 shadow-lg">
        <div className="mb-2 flex items-center gap-3">
          <Clock className="h-6 w-6 text-amber-600" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Offen</p>
        </div>
        <p className="text-3xl font-black text-slate-900">{formatCurrency(stats.outstanding)}</p>
        <p className="mt-1 text-xs text-slate-500">
          {stats.totalCount} Rechnung{stats.totalCount !== 1 ? 'en' : ''} gesamt
        </p>
      </div>
    </div>
  )
}
