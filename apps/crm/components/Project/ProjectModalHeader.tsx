'use client'

import React from 'react'
import { X } from 'lucide-react'
import { CustomerProject } from '@/types'

interface ProjectModalHeaderProps {
  formData: Partial<CustomerProject>
  onClose: () => void
  id?: string
}

export function ProjectModalHeader({ formData, onClose, id }: ProjectModalHeaderProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="flex flex-col gap-6 border-b border-slate-100 bg-slate-50/50 px-10 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 id={id} className="text-3xl font-black tracking-tight text-slate-900">
            {formData.customerName || 'Neuer Auftrag'}
          </h3>
          <p className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
            Status: <span className="text-slate-900">{formData.status}</span> | Komm:{' '}
            {formData.orderNumber || '---'}
          </p>
        </div>
        <button
          onClick={onClose}
          onKeyDown={handleKeyDown}
          aria-label="Modal schließen"
          className="rounded-2xl bg-white p-4 shadow-sm transition-all hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <X className="h-6 w-6 text-slate-400" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
