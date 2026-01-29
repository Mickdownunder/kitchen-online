'use client'

import React from 'react'
import { Check, X } from 'lucide-react'
import type { PartialPayment } from '@/types'

interface PaymentFormProps {
  formData: Partial<PartialPayment>
  percentInput: string
  grossTotal: number
  onFormChange: (data: Partial<PartialPayment>) => void
  onPercentChange: (value: string) => void
  onPercentBlur: () => void
  onQuickPercent: (percent: number) => void
  onSave: () => void
  onCancel: () => void
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  formData,
  percentInput,
  grossTotal,
  onFormChange,
  onPercentChange,
  onPercentBlur,
  onQuickPercent,
  onSave,
  onCancel,
}) => {
  return (
    <div className="mb-6 rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-base font-black text-slate-900">Neue Anzahlung erfassen</h4>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-2 transition-all hover:bg-amber-200"
        >
          <X className="h-4 w-4 text-slate-600" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-600">
            Beschreibung
          </label>
          <input
            type="text"
            placeholder="z.B. 40% Anzahlung, 40% vor Lieferung, 20% bei Lieferung"
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-amber-500"
            value={formData.description || ''}
            onChange={e => onFormChange({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-600">
              Betrag (€)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-amber-500"
              value={formData.amount || ''}
              onChange={e => {
                const amount = parseFloat(e.target.value) || 0
                onFormChange({ ...formData, amount })
                if (grossTotal > 0 && amount > 0) {
                  const percent = (amount / grossTotal) * 100
                  onPercentChange(percent.toFixed(1))
                } else {
                  onPercentChange('')
                }
              }}
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
              value={percentInput}
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
              value={formData.date || ''}
              onChange={e => onFormChange({ ...formData, date: e.target.value })}
            />
          </div>
        </div>

        {formData.amount && formData.amount > 0 && grossTotal > 0 && (
          <div className="rounded-xl border border-amber-300 bg-white p-3">
            <p className="text-sm font-bold text-amber-800">
              {((formData.amount / grossTotal) * 100).toFixed(1)}% von{' '}
              {grossTotal.toLocaleString('de-AT')} €
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 rounded-xl bg-slate-300 px-5 py-2 text-[10px] font-black uppercase tracking-widest text-slate-900 transition-all hover:bg-slate-400"
          >
            <X className="h-4 w-4" />
            Abbrechen
          </button>
          <button
            type="button"
            onClick={onSave}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-600"
          >
            <Check className="h-4 w-4" />
            Speichern
          </button>
        </div>
      </div>
    </div>
  )
}
