'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { CustomerProject, ProjectStatus } from '@/types'
import { updateProject } from '@/lib/supabase/services'
import { createAppointment } from '@/lib/supabase/services/appointments'

interface DeliveryDateModalProps {
  project: CustomerProject
  onClose: () => void
  onSuccess?: () => void
  onUpdateProject?: (project: CustomerProject) => void
}

export default function DeliveryDateModal({
  project,
  onClose,
  onSuccess,
  onUpdateProject,
}: DeliveryDateModalProps) {
  const [deliveryDate, setDeliveryDate] = useState(
    project.deliveryDate || new Date().toISOString().split('T')[0]
  )
  const [deliveryTime, setDeliveryTime] = useState(project.deliveryTime || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!deliveryDate) {
      alert('Bitte geben Sie ein Datum ein.')
      return
    }

    setSaving(true)
    try {
      const updatedProject = await updateProject(project.id, {
        deliveryDate,
        deliveryTime: deliveryTime || undefined,
        status: ProjectStatus.DELIVERY,
      })

      if (onUpdateProject) {
        onUpdateProject(updatedProject)
      }

      try {
        await createAppointment({
          customerId: project.customerId,
          customerName: project.customerName,
          phone: project.phone,
          date: deliveryDate,
          time: deliveryTime || undefined,
          type: 'Delivery',
          notes: `Abholung für Auftrag ${project.orderNumber}`,
        })
      } catch (appointmentError: unknown) {
        const errMessage = appointmentError instanceof Error ? appointmentError.message : ''
        const errName = appointmentError instanceof Error ? appointmentError.name : ''
        if (errMessage.includes('aborted') || errName === 'AbortError') {
          // Silent ignore
        } else {
          console.error('Error creating calendar appointment:', appointmentError)
        }
      }

      if (onSuccess) onSuccess()
      onClose()
    } catch (error: unknown) {
      console.error('Error saving delivery date:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
      alert(`Fehler beim Speichern: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md">
      <div
        className="w-full max-w-md rounded-3xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Abholung-Datum</h2>
            <p className="mt-1 text-sm text-slate-600">
              Auftrag: {project.orderNumber} • {project.customerName}
            </p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 transition-all hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        <div className="space-y-6 p-8">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-600">
                Datum *
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={e => setDeliveryDate(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-600">
                Uhrzeit
              </label>
              <input
                type="time"
                value={deliveryTime}
                onChange={e => setDeliveryTime(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <p className="text-sm text-orange-900">
              <strong>Hinweis:</strong> Datum und Uhrzeit werden im Auftrag gespeichert und
              automatisch als Abholung-Termin im Kalender übernommen.
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              onClick={onClose}
              className="rounded-xl bg-slate-300 px-5 py-2 text-xs font-black uppercase tracking-widest text-slate-900 transition-all hover:bg-slate-400"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-orange-500 px-5 py-2 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? 'Speichere...' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
