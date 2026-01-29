'use client'

import React from 'react'
import { ReceiptText } from 'lucide-react'
import type { PartialPayment } from '@/types'

interface PaymentSummaryProps {
  partialPayments: PartialPayment[]
  grossTotal: number
  finalInvoice?: {
    invoiceNumber: string
    amount: number
    date: string
    isPaid: boolean
    paidDate?: string
  }
  onGenerateFinalInvoice: () => void
  onToggleFinalInvoicePaid: (isPaid: boolean) => void
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  partialPayments,
  grossTotal,
  finalInvoice,
  onGenerateFinalInvoice,
  onToggleFinalInvoicePaid,
}) => {
  const totalPartial = partialPayments.reduce((sum, p) => sum + p.amount, 0)
  const remaining = grossTotal - totalPartial
  const hasUnpaidPayments = partialPayments.some(p => !p.isPaid)

  return (
    <>
      {/* Summary Section */}
      {partialPayments.length > 0 && (
        <div className="mt-6 rounded-xl border-2 border-slate-200 bg-slate-50 p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">Teilzahlungen gesamt:</span>
            <span className="text-lg font-black text-slate-900">
              {totalPartial.toLocaleString('de-AT')} €
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">
              Verbleibend für Schlussrechnung:
            </span>
            <span className="text-xl font-black text-amber-600">
              {remaining.toLocaleString('de-AT')} €
            </span>
          </div>
        </div>
      )}

      {/* Final Invoice Section */}
      {finalInvoice ? (
        <div className="mt-6 rounded-xl border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-purple-100 p-6">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-base font-black text-slate-900">Schlussrechnung</p>
              <p className="text-xs text-slate-600">{finalInvoice.invoiceNumber}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${
                finalInvoice.isPaid
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {finalInvoice.isPaid ? 'Bezahlt' : 'Offen'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-slate-900">
              {finalInvoice.amount.toLocaleString('de-AT')} €
            </span>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="h-5 w-5 accent-purple-500"
                checked={finalInvoice.isPaid}
                onChange={e => onToggleFinalInvoicePaid(e.target.checked)}
              />
              <span className="text-sm font-bold text-slate-700">Als bezahlt markieren</span>
            </label>
          </div>
          <div className="mt-2 text-xs text-slate-600">
            Datum: {new Date(finalInvoice.date).toLocaleDateString('de-DE')}
          </div>
        </div>
      ) : (
        partialPayments.length > 0 &&
        remaining > 0 && (
          <div className="mt-6">
            <button
              type="button"
              onClick={onGenerateFinalInvoice}
              disabled={hasUnpaidPayments}
              className={`flex w-full items-center justify-center gap-3 rounded-xl px-6 py-4 text-sm font-black uppercase tracking-widest shadow-lg transition-all ${
                hasUnpaidPayments
                  ? 'cursor-not-allowed bg-slate-300 text-slate-500'
                  : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700'
              }`}
              title={
                hasUnpaidPayments ? 'Bitte markieren Sie zuerst alle Anzahlungen als bezahlt' : ''
              }
            >
              <ReceiptText className="h-5 w-5" />
              {hasUnpaidPayments
                ? 'Schlussrechnung (erst nach Bezahlung aller Anzahlungen möglich)'
                : `Schlussrechnung erzeugen (${remaining.toLocaleString('de-AT')} €)`}
            </button>
            {hasUnpaidPayments && (
              <p className="mt-2 text-center text-xs text-amber-600">
                ⚠️ Bitte markieren Sie zuerst alle Anzahlungen als bezahlt
              </p>
            )}
          </div>
        )
      )}
    </>
  )
}
