'use client'

import React from 'react'
import { Save, Trash2 } from 'lucide-react'
import { CustomerProject } from '@/types'

interface ProjectModalFooterProps {
  formData: Partial<CustomerProject>
  calculations: {
    grossTotal: number
  }
  onClose: () => void
  onDelete?: (id: string) => void
  onSave: () => void
}

export function ProjectModalFooter({
  formData,
  calculations,
  onClose,
  onDelete,
  onSave,
}: ProjectModalFooterProps) {
  const totalPartial = formData.partialPayments?.reduce((sum, p) => sum + p.amount, 0) || 0
  const remaining = calculations.grossTotal - totalPartial
  const _hasPartialPayments = formData.partialPayments && formData.partialPayments.length > 0
  const _hasRemaining = remaining > 0

  return (
    <div className="border-t border-slate-100 bg-slate-50/50 px-10 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {formData.id && onDelete && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Möchten Sie diesen Auftrag wirklich löschen?')) {
                  onDelete(formData.id!)
                  onClose()
                }
              }}
              className="flex items-center gap-2 rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest text-red-600 transition-all hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" /> Projekt löschen
            </button>
          )}
        </div>
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-400 transition-all hover:text-slate-900"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={onSave}
            className="relative z-10 flex items-center gap-3 rounded-[1.75rem] bg-amber-500 px-12 py-5 text-xs font-black uppercase tracking-[0.2em] text-slate-900 shadow-2xl transition-all hover:bg-amber-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!formData.customerName || formData.customerName.trim() === ''}
          >
            <Save className="h-6 w-6" /> Auftrag speichern
          </button>
        </div>
      </div>
    </div>
  )
}
