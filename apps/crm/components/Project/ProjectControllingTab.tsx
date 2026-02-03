'use client'

import React from 'react'
import { AlertCircle, ShieldCheck } from 'lucide-react'
import { CustomerProject } from '@/types'

interface ProjectControllingTabProps {
  formData: Partial<CustomerProject>
  calculations: {
    netTotal: number
    taxTotal: number
    grossTotal: number
    totalPurchaseNet: number
    profitNet: number | null
    marginPercent: number | null
    taxByRate: Record<number, number>
  }
}

export function ProjectControllingTab({ calculations }: ProjectControllingTabProps) {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 space-y-10">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-[2.5rem] border border-slate-100 bg-slate-50 p-8">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            Einkauf (Netto)
          </p>
          <p className="text-3xl font-black text-slate-900">
            {calculations.totalPurchaseNet.toLocaleString('de-AT')} €
          </p>
        </div>
        <div className="rounded-[2.5rem] border border-slate-100 bg-slate-50 p-8">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            Rohgewinn (Netto)
          </p>
          <p className="text-3xl font-black text-indigo-600">
            {calculations.profitNet != null
              ? `${calculations.profitNet.toLocaleString('de-AT')} €`
              : '—'}
          </p>
          {calculations.profitNet == null && (
            <p className="mt-1 text-xs italic text-slate-500">Wird angezeigt, sobald EK erfasst</p>
          )}
        </div>
        <div
          className={`rounded-[2.5rem] border p-8 ${
            calculations.marginPercent == null
              ? 'border-slate-100 bg-slate-50'
              : calculations.marginPercent < 25
                ? 'border-red-100 bg-red-50'
                : 'border-emerald-100 bg-emerald-50'
          }`}
        >
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            Marge (%)
          </p>
          <div className="flex items-center gap-3">
            {calculations.marginPercent != null ? (
              <>
                <p
                  className={`text-3xl font-black ${calculations.marginPercent < 25 ? 'text-red-600' : 'text-emerald-600'}`}
                >
                  {calculations.marginPercent.toFixed(1)}%
                </p>
                {calculations.marginPercent < 25 ? (
                  <AlertCircle className="h-6 w-6 text-red-500" />
                ) : (
                  <ShieldCheck className="h-6 w-6 text-emerald-500" />
                )}
              </>
            ) : (
              <>
                <p className="text-3xl font-black text-slate-400">—</p>
                <p className="text-xs italic text-slate-500">EK erfassen</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[2.5rem] border border-slate-100 bg-slate-50 p-8">
        <h5 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">
          Detaillierte Aufschlüsselung
        </h5>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Verkauf (Netto):</span>
            <span className="font-black text-slate-900">
              {calculations.netTotal.toLocaleString('de-AT', { minimumFractionDigits: 2 })} €
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Einkauf (Netto):</span>
            <span className="font-black text-slate-900">
              {calculations.totalPurchaseNet.toLocaleString('de-AT', { minimumFractionDigits: 2 })}{' '}
              €
            </span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-3">
            <span className="font-black text-slate-900">Rohgewinn (Netto):</span>
            <span className="text-lg font-black text-indigo-600">
              {calculations.profitNet != null
                ? `${calculations.profitNet.toLocaleString('de-AT', { minimumFractionDigits: 2 })} €`
                : '—'}
            </span>
          </div>
          <div className="flex justify-between border-t-2 border-slate-300 pt-3">
            <span className="font-black text-slate-900">Marge:</span>
            <span
              className={`text-lg font-black ${
                calculations.marginPercent == null
                  ? 'text-slate-400'
                  : calculations.marginPercent < 25
                    ? 'text-red-600'
                    : 'text-emerald-600'
              }`}
            >
              {calculations.marginPercent != null
                ? `${calculations.marginPercent.toFixed(1)}%`
                : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
