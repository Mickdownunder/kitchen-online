'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { CustomerProject, ProjectStatus } from '@/types'
import { updateProject } from '@/lib/supabase/services'
import { createAppointment } from '@/lib/supabase/services/appointments'
import { logger } from '@/lib/utils/logger'

interface MeasurementDateModalProps {
  project: CustomerProject
  onClose: () => void
  onSuccess?: () => void
  onUpdateProject?: (project: CustomerProject) => void
}

export default function MeasurementDateModal({
  project,
  onClose,
  onSuccess,
  onUpdateProject,
}: MeasurementDateModalProps) {
  const [measurementDate, setMeasurementDate] = useState(
    project.measurementDate || new Date().toISOString().split('T')[0]
  )
  const [measurementTime, setMeasurementTime] = useState(project.measurementTime || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!measurementDate) {
      alert('Bitte geben Sie ein Datum ein.')
      return
    }

    setSaving(true)
    try {
      // Update project
      const updatedProjectResult = await updateProject(project.id, {
        measurementDate,
        measurementTime: measurementTime || undefined,
        isMeasured: true,
        status: ProjectStatus.MEASURING,
      })
      if (!updatedProjectResult.ok) {
        throw new Error(updatedProjectResult.message)
      }

      // Update parent component state
      if (onUpdateProject) {
        onUpdateProject(updatedProjectResult.data)
      }

      // Create calendar appointment
      try {
        await createAppointment({
          customerId: project.customerId,
          customerName: project.customerName,
          phone: project.phone,
          date: measurementDate,
          time: measurementTime || undefined,
          type: 'Measurement',
          notes: `Aufmaß für Auftrag ${project.orderNumber}`,
        })
      } catch (appointmentError: unknown) {
        // Ignore aborted requests
        const errMessage = appointmentError instanceof Error ? appointmentError.message : ''
        const errName = appointmentError instanceof Error ? appointmentError.name : ''
        if (errMessage.includes('aborted') || errName === 'AbortError') {
          // Silent ignore
        } else {
          logger.error('Error creating calendar appointment', { component: 'MeasurementDateModal' }, appointmentError instanceof Error ? appointmentError : new Error(String(appointmentError)))
        }
        // Don't fail the whole operation if appointment creation fails
      }

      if (onSuccess) onSuccess()
      onClose()
    } catch (error: unknown) {
      logger.error('Error saving measurement date', { component: 'MeasurementDateModal' }, error instanceof Error ? error : new Error(String(error)))
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
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Aufmaß-Datum</h2>
            <p className="mt-1 text-sm text-slate-600">
              Auftrag: {project.orderNumber} • {project.customerName}
            </p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 transition-all hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 p-8">
          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-600">
                Datum *
              </label>
              <input
                type="date"
                value={measurementDate}
                onChange={e => setMeasurementDate(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-600">
                Uhrzeit
              </label>
              <input
                type="time"
                value={measurementTime}
                onChange={e => setMeasurementTime(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-900">
              <strong>💡 Hinweis:</strong> Das Aufmaß-Datum wird im Projekt gespeichert und
              automatisch als Termin im Kalender erstellt.
            </p>
          </div>

          {/* Actions */}
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
              className="rounded-xl bg-blue-500 px-5 py-2 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? 'Speichere...' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
