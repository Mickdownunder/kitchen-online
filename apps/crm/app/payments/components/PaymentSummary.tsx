'use client'

import React, { useState } from 'react'
import { ReceiptText, Check, X } from 'lucide-react'
import type { PartialPayment } from '@/types'

interface PaymentSummaryProps {
  partialPayments: PartialPayment[]
  grossTotal: number
  finalInvoice?: {
    id: string
    invoiceNumber: string
    amount: number
    date: string
    isPaid: boolean
    paidDate?: string
  }
  onGenerateFinalInvoice: (invoiceDate: string) => void
  onMarkFinalInvoicePaid: (paidDate: string) => void
  onUnmarkFinalInvoicePaid: () => void
  onDeleteFinalInvoice: () => void
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  partialPayments,
  grossTotal,
  finalInvoice,
  onGenerateFinalInvoice,
  onMarkFinalInvoicePaid,
  onUnmarkFinalInvoicePaid,
  onDeleteFinalInvoice,
}) => {
  const [showPaidDateInput, setShowPaidDateInput] = useState(false)
  const [paidDateInput, setPaidDateInput] = useState(
    () => new Date().toISOString().split('T')[0]
  )
  const [finalInvoiceDate, setFinalInvoiceDate] = useState(
    () => new Date().toISOString().split('T')[0]
  )
  const totalPartial = partialPayments.reduce((sum, p) => sum + p.amount, 0)
  const remaining = grossTotal - totalPartial
  const hasUnpaidPayments = partialPayments.some(p => !p.isPaid)

  return (
    <>
      {/* Summary Section – bei Anzahlungen oder wenn direkt Schlussrechnung möglich */}
      {(partialPayments.length > 0 || (remaining > 0 && !finalInvoice)) && (
        <div className="mt-6 rounded-xl border-2 border-slate-200 bg-slate-50 p-6">
          {partialPayments.length > 0 && (
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">Teilzahlungen gesamt:</span>
              <span className="text-lg font-black text-slate-900">
                {totalPartial.toLocaleString('de-AT')} €
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">
              {partialPayments.length === 0
                ? 'Auftragswert (direkt Schlussrechnung):'
                : 'Verbleibend für Schlussrechnung:'}
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
            {showPaidDateInput ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={paidDateInput}
                  onChange={e => setPaidDateInput(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    onMarkFinalInvoicePaid(paidDateInput)
                    setShowPaidDateInput(false)
                  }}
                  className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-white transition-all hover:bg-emerald-600"
                >
                  <Check className="h-4 w-4" />
                  Bestätigen
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaidDateInput(false)}
                  className="rounded-lg bg-slate-200 p-2 transition-all hover:bg-slate-300"
                  title="Abbrechen"
                >
                  <X className="h-4 w-4 text-slate-600" />
                </button>
              </div>
            ) : finalInvoice.isPaid ? (
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-purple-500"
                  checked
                  onChange={() => onUnmarkFinalInvoicePaid()}
                />
                <span className="text-sm font-bold text-slate-700">Als bezahlt markieren</span>
              </label>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPaidDateInput(new Date().toISOString().split('T')[0])
                  setShowPaidDateInput(true)
                }}
                className="flex items-center gap-2 rounded-lg bg-purple-100 px-3 py-2 text-sm font-bold text-purple-700 transition-all hover:bg-purple-200"
              >
                <Check className="h-4 w-4" />
                Als bezahlt markieren
              </button>
            )}
          </div>
          <div className="mt-2 text-xs text-slate-600">
            Datum: {new Date(finalInvoice.date).toLocaleDateString('de-DE')}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onDeleteFinalInvoice}
              className="rounded-xl bg-red-100 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-700 transition-all hover:bg-red-200"
            >
              Schlussrechnung löschen
            </button>
          </div>
        </div>
      ) : (
        remaining > 0 && (
          <div className="mt-6 rounded-xl border-2 border-purple-200 bg-purple-50/50 p-6">
            <div className="mb-4">
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-600">
                Datum der Schlussrechnung
              </label>
              <input
                type="date"
                value={finalInvoiceDate}
                onChange={e => setFinalInvoiceDate(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-purple-500"
              />
            </div>
            <button
              type="button"
              onClick={() => onGenerateFinalInvoice(finalInvoiceDate)}
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
                : partialPayments.length === 0
                  ? `Direkt Schlussrechnung (ohne Anzahlung) – ${remaining.toLocaleString('de-AT')} €`
                  : `Schlussrechnung erzeugen (${remaining.toLocaleString('de-AT')} €)`}
            </button>
            {hasUnpaidPayments && (
              <p className="mt-2 text-center text-xs text-amber-600">
                ⚠️ Bitte markieren Sie zuerst alle Anzahlungen als bezahlt
              </p>
            )}
            {partialPayments.length === 0 && !hasUnpaidPayments && (
              <p className="mt-2 text-center text-xs text-slate-500">
                Für kleine Aufträge ohne Anzahlungsplan
              </p>
            )}
          </div>
        )
      )}
    </>
  )
}
