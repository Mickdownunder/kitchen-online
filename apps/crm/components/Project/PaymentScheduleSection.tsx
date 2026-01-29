'use client'

import React from 'react'
import { Percent, Calendar, CheckCircle2, XCircle } from 'lucide-react'
import { CustomerProject, PaymentSchedule } from '@/types'
import { getDefaultPaymentSchedule, validatePaymentSchedule } from '@/lib/utils/paymentSchedule'

interface PaymentScheduleSectionProps {
  formData: Partial<CustomerProject>
  setFormData: React.Dispatch<React.SetStateAction<Partial<CustomerProject>>>
}

export function PaymentScheduleSection({ formData, setFormData }: PaymentScheduleSectionProps) {
  const schedule = formData.paymentSchedule || getDefaultPaymentSchedule()
  const isValid = validatePaymentSchedule(schedule)
  const sum = schedule.firstPercent + schedule.secondPercent + schedule.finalPercent

  const updateSchedule = (updates: Partial<PaymentSchedule>) => {
    setFormData(prev => ({
      ...prev,
      paymentSchedule: {
        ...(prev.paymentSchedule || getDefaultPaymentSchedule()),
        ...updates,
      },
    }))
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Percent className="h-4 w-4 text-slate-400" />
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Zahlungsschema
        </h4>
      </div>

      <div className="shadow-lg/30 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50/90 to-slate-100/90 p-6">
        {/* Prozent-Verteilung */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-600">
              1. Anzahlung (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={schedule.firstPercent}
                onChange={e => {
                  const value = parseInt(e.target.value) || 0
                  updateSchedule({ firstPercent: value })
                }}
                className="w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-amber-400/50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                %
              </span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-600">
              2. Anzahlung (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={schedule.secondPercent}
                onChange={e => {
                  const value = parseInt(e.target.value) || 0
                  updateSchedule({ secondPercent: value })
                }}
                className="w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-amber-400/50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                %
              </span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-600">
              Restzahlung (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={schedule.finalPercent}
                onChange={e => {
                  const value = parseInt(e.target.value) || 0
                  updateSchedule({ finalPercent: value })
                }}
                className="w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-amber-400/50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                %
              </span>
            </div>
          </div>
        </div>

        {/* Validierung */}
        {!isValid && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <XCircle className="h-4 w-4" />
            <span>Summe muss 100% ergeben (aktuell: {sum}%)</span>
          </div>
        )}

        {isValid && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            <span>Zahlungsschema gültig ({sum}%)</span>
          </div>
        )}

        {/* Tage vor Liefertermin */}
        <div className="mb-6">
          <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-600">
            <Calendar className="h-4 w-4" />
            Tage vor Liefertermin (2. Anzahlung)
          </label>
          <input
            type="number"
            min="1"
            max="90"
            step="1"
            value={schedule.secondDueDaysBeforeDelivery}
            onChange={e => {
              const value = parseInt(e.target.value) || 21
              updateSchedule({ secondDueDaysBeforeDelivery: value })
            }}
            className="w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-amber-400/50"
          />
          <p className="mt-2 text-xs text-slate-500">
            Die zweite Anzahlung wird automatisch {schedule.secondDueDaysBeforeDelivery} Tage vor
            dem Liefertermin erstellt.
          </p>
        </div>

        {/* Automatische Erstellung */}
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={schedule.autoCreateFirst}
              onChange={e => updateSchedule({ autoCreateFirst: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 text-amber-500 focus:ring-2 focus:ring-amber-400/50"
            />
            <span className="text-sm font-medium text-slate-700">
              Automatisch erste Anzahlung bei Projekterstellung erstellen
            </span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={schedule.autoCreateSecond}
              onChange={e => updateSchedule({ autoCreateSecond: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 text-amber-500 focus:ring-2 focus:ring-amber-400/50"
            />
            <span className="text-sm font-medium text-slate-700">
              Automatisch zweite Anzahlung {schedule.secondDueDaysBeforeDelivery} Tage vor
              Liefertermin erstellen
            </span>
          </label>
        </div>
      </div>
    </section>
  )
}
