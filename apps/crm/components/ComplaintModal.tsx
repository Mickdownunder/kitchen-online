'use client'

import React from 'react'
import { X, Save, AlertCircle } from 'lucide-react'
import { CustomerProject, Complaint } from '@/types'

interface ComplaintModalProps {
  projects: CustomerProject[]
  onClose: () => void
  onSave: (projectId: string, complaint: Complaint) => void
}

const ComplaintModal: React.FC<ComplaintModalProps> = ({ projects, onClose, onSave }) => {
  const [selectedProjectId, setSelectedProjectId] = React.useState('')
  const [description, setDescription] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProjectId || !description) return

    const newComplaint: Complaint = {
      id: Date.now().toString(),
      projectId: selectedProjectId,
      description,
      status: 'reported',
      priority: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    onSave(selectedProjectId, newComplaint)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-red-50 p-6">
          <h3 className="flex items-center gap-2 text-xl font-bold text-red-900">
            <AlertCircle className="h-6 w-6" />
            Reklamation erfassen
          </h3>
          <button onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-red-100">
            <X className="h-6 w-6 text-red-900" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-8">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">
              Kunde / Projekt auswählen
            </label>
            <select
              required
              className="w-full rounded-xl border-none bg-slate-50 px-4 py-3 font-medium outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-red-500"
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
            >
              <option value="">Bitte wählen...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.customerName} (#{p.orderNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">
              Beschreibung des Mangels
            </label>
            <textarea
              required
              placeholder="Was genau muss korrigiert werden?"
              className="h-32 w-full resize-none rounded-xl border-none bg-slate-50 px-4 py-3 font-medium outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-red-500"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl px-6 py-3 font-bold text-slate-500 transition-colors hover:bg-slate-100"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 px-6 py-3 font-bold text-white shadow-lg shadow-red-100 transition-all hover:bg-red-600"
            >
              <Save className="h-5 w-5" />
              Mangel speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ComplaintModal
