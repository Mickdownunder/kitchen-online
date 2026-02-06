'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { ReceiptText, AlertTriangle, ArrowRight } from 'lucide-react'
import { Invoice } from '@/types'

interface OpenInvoicesCardProps {
  openInvoices: Invoice[]
}

const formatCurrency = (value: number) =>
  value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function getOverdueDays(dueDate: string): number {
  const due = new Date(dueDate)
  const today = new Date()
  due.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const diff = today.getTime() - due.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

export default function OpenInvoicesCard({ openInvoices }: OpenInvoicesCardProps) {
  const { totalOpen, overdueInvoices, overdueTotal, topOverdue } = useMemo(() => {
    const totalOpen = openInvoices.reduce((sum, inv) => sum + inv.amount, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const overdue = openInvoices.filter(inv => {
      if (!inv.dueDate) return false
      return new Date(inv.dueDate) < today
    })
    const overdueTotal = overdue.reduce((sum, inv) => sum + inv.amount, 0)

    const topOverdue = overdue
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 3)

    return { totalOpen, overdueInvoices: overdue, overdueTotal, topOverdue }
  }, [openInvoices])

  return (
    <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-emerald-50/30 p-6 shadow-lg transition-all duration-300 hover:shadow-xl sm:rounded-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-700 sm:text-base">Offene Rechnungen</h3>
        <Link
          href="/invoices"
          className="flex items-center gap-1 text-xs font-bold text-amber-600 transition-colors hover:text-amber-700"
        >
          Alle <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {openInvoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <ReceiptText className="mb-2 h-8 w-8 opacity-30" />
          <p className="text-sm font-medium">Keine offenen Rechnungen</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50/80 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Offen
              </p>
              <p className="mt-1 text-lg font-black text-slate-700">
                {formatCurrency(totalOpen)} €
              </p>
              <p className="text-xs text-slate-400">{openInvoices.length} Rechnungen</p>
            </div>
            <div className={`rounded-xl p-3 ${overdueInvoices.length > 0 ? 'bg-red-50/80' : 'bg-slate-50/80'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${overdueInvoices.length > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                Überfällig
              </p>
              <p className={`mt-1 text-lg font-black ${overdueInvoices.length > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                {formatCurrency(overdueTotal)} €
              </p>
              <p className={`text-xs ${overdueInvoices.length > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                {overdueInvoices.length} Rechnungen
              </p>
            </div>
          </div>

          {/* Top overdue list */}
          {topOverdue.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Älteste überfällige
              </p>
              <div className="space-y-1.5">
                {topOverdue.map(inv => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-2 rounded-lg bg-red-50/50 px-3 py-2"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-700">
                        {inv.invoiceNumber}
                        {inv.project?.customerName && (
                          <span className="ml-1 font-normal text-slate-400">
                            - {inv.project.customerName}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-black text-red-600">
                        {formatCurrency(inv.amount)} €
                      </p>
                      <p className="text-[10px] text-red-400">
                        {getOverdueDays(inv.dueDate!)} Tage
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
