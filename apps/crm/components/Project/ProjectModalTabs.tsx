'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, TrendingUp, FileText, CreditCard, Receipt } from 'lucide-react'
import { CustomerProject } from '@/types'

interface ProjectModalTabsProps {
  activeTab: 'basics' | 'items' | 'controlling' | 'docs' | 'documents' | 'payments'
  setActiveTab: (
    tab: 'basics' | 'items' | 'controlling' | 'docs' | 'documents' | 'payments'
  ) => void
  formData: Partial<CustomerProject>
  onClose: () => void
}

export function ProjectModalTabs({
  activeTab,
  setActiveTab,
  formData,
  onClose,
}: ProjectModalTabsProps) {
  const router = useRouter()

  return (
    <div className="flex w-fit items-center gap-2 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-inner">
      <button
        onClick={() => setActiveTab('basics')}
        className={`rounded-xl px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'basics' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}
      >
        Stammdaten & Verlauf
      </button>
      <button
        onClick={() => setActiveTab('items')}
        className={`flex items-center gap-2 rounded-xl px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'items' ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}
      >
        <Plus className="h-3 w-3" /> Positionen
      </button>
      <button
        onClick={() => setActiveTab('controlling')}
        className={`flex items-center gap-2 rounded-xl px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'controlling' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}
      >
        <TrendingUp className="h-3 w-3" /> Margen-Check
      </button>
      <button
        onClick={() => setActiveTab('documents')}
        className={`flex items-center gap-2 rounded-xl px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'documents' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}
      >
        <Receipt className="h-3 w-3" /> Auftragsunterlagen
      </button>
      <button
        onClick={() => setActiveTab('docs')}
        className={`flex items-center gap-2 rounded-xl px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'docs' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}
      >
        <FileText className="h-3 w-3" /> Dokumente
      </button>
      <button
        onClick={() => {
          if (formData.id) {
            router.push(`/payments?projectId=${formData.id}`)
            onClose()
          } else {
            router.push('/payments')
            onClose()
          }
        }}
        className={`flex items-center gap-2 rounded-xl px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'payments' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}
      >
        <CreditCard className="h-3 w-3" /> Zahlungen erfassen
      </button>
    </div>
  )
}
