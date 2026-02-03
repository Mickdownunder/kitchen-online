'use client'

import React, { useState } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { usePriceInput } from '@/hooks/usePriceInput'
import type { PartialPayment } from '@/types'

interface PaymentRowProps {
  payment: PartialPayment
  index: number
  isEditing: boolean
  editFormData: Partial<PartialPayment> | null
  editingPercentInput: string
  grossTotal: number
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onDelete: () => void
  onFormChange: (data: Partial<PartialPayment>) => void
  onPercentChange: (value: string) => void
  onPercentBlur: () => void
  onQuickPercent: (percent: number) => void
  onMarkAsPaid: (paidDate: string) => void
  onUnmarkAsPaid: () => void
}

export const PaymentRow: React.FC<PaymentRowProps> = ({
  payment,
  index,
  isEditing,
  editFormData,
  editingPercentInput,
  grossTotal,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onFormChange,
  onPercentChange,
  onPercentBlur,
  onQuickPercent,
  onMarkAsPaid,
  onUnmarkAsPaid,
}) => {
  const [showPaidDateInput, setShowPaidDateInput] = useState(false)
  const [paidDateInput, setPaidDateInput] = useState(
    () => new Date().toISOString().split('T')[0]
  )
  const paymentData = isEditing && editFormData ? editFormData : payment

  const amountInput = usePriceInput({
    initialValue: paymentData?.amount,
    onValueChange: value => {
      if (!paymentData) return
      onFormChange({ ...paymentData, amount: value })
      if (grossTotal > 0 && value != null && value > 0) {
        onPercentChange(((value / grossTotal) * 100).toFixed(1))
      } else {
        onPercentChange('')
      }
    },
    allowEmpty: true,
    min: 0,
  })

  if (isEditing) {
    return (
      <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-black uppercase tracking-widest text-amber-600">
              Anzahlung {index + 1}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSave}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-600"
              >
                <Check className="h-4 w-4" />
                Speichern
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center gap-2 rounded-xl bg-slate-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-400"
              >
                <X className="h-4 w-4" />
                Abbrechen
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-600">
              Beschreibung
            </label>
            <input
              type="text"
              placeholder="z.B. 40% Anzahlung, 40% vor Lieferung"
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-amber-500"
              value={paymentData?.description || ''}
              onChange={e => onFormChange({ ...paymentData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-600">
                Betrag (€)
              </label>
              <input
                {...amountInput}
                type="text"
                placeholder="z.B. 500,00"
                inputMode="decimal"
                className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-600">
                Oder Prozent (%)
              </label>
              <div className="mb-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => onQuickPercent(30)}
                  className="flex-1 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-amber-700 transition-all hover:bg-amber-200"
                >
                  30%
                </button>
                <button
                  type="button"
                  onClick={() => onQuickPercent(40)}
                  className="flex-1 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-amber-700 transition-all hover:bg-amber-200"
                >
                  40%
                </button>
                <button
                  type="button"
                  onClick={() => onQuickPercent(50)}
                  className="flex-1 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-amber-700 transition-all hover:bg-amber-200"
                >
                  50%
                </button>
              </div>
              <input
                type="number"
                step="0.1"
                placeholder="40"
                className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-amber-500"
                value={
                  editingPercentInput ||
                  (paymentData?.amount && grossTotal > 0
                    ? ((paymentData.amount / grossTotal) * 100).toFixed(1)
                    : '')
                }
                onChange={e => onPercentChange(e.target.value)}
                onBlur={onPercentBlur}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-600">
                Datum
              </label>
              <input
                type="date"
                className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-amber-500"
                value={paymentData?.date || ''}
                onChange={e => onFormChange({ ...paymentData, date: e.target.value })}
              />
            </div>
          </div>

          {paymentData?.amount && paymentData.amount > 0 && grossTotal > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-bold text-amber-800">
                {((paymentData.amount / grossTotal) * 100).toFixed(1)}% von{' '}
                {grossTotal.toLocaleString('de-AT')} €
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-black text-slate-900">
              {payment.description || `Anzahlung ${index + 1}`}
            </span>
            {grossTotal > 0 && (
              <span className="text-xs text-slate-500">
                ({((payment.amount / grossTotal) * 100).toFixed(1)}%)
              </span>
            )}
            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${
                payment.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {payment.isPaid ? 'Bezahlt' : 'Offen'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-slate-900">
              {payment.amount.toLocaleString('de-AT')} €
            </span>
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-2 rounded-xl bg-slate-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-300"
            >
              <Pencil className="h-4 w-4" />
              Bearbeiten
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-2 rounded-xl bg-red-100 px-3 py-2 text-xs font-black uppercase tracking-widest text-red-700 transition-all hover:bg-red-200"
            >
              <Trash2 className="h-4 w-4" />
              Löschen
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 pt-2">
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span>Datum: {new Date(payment.date).toLocaleDateString('de-DE')}</span>
            {payment.isPaid && payment.paidDate && (
              <span className="font-bold text-emerald-700">
                Bezahlt am: {new Date(payment.paidDate).toLocaleDateString('de-DE')}
              </span>
            )}
          </div>
          {showPaidDateInput ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={paidDateInput}
                onChange={e => setPaidDateInput(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => {
                  onMarkAsPaid(paidDateInput)
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
          ) : payment.isPaid ? (
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="h-5 w-5 accent-amber-500"
                checked
                onChange={() => onUnmarkAsPaid()}
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
              className="flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm font-bold text-amber-700 transition-all hover:bg-amber-200"
            >
              <Check className="h-4 w-4" />
              Als bezahlt markieren
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
