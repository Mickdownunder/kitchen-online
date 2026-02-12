'use client'

import React, { useState, useEffect } from 'react'
import { X, Calendar, Clock, User, Phone, Save, Edit2, Check, Trash2 } from 'lucide-react'
import { PlanningAppointment, CustomerProject } from '@/types'
import { logger } from '@/lib/utils/logger'
import { getAppointmentTypeLabel } from '@/lib/utils/appointmentTypeLabels'

interface AppointmentDetailModalProps {
  appointment: PlanningAppointment | null
  project?: CustomerProject | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (appointment: PlanningAppointment) => void
  onDelete?: (appointmentId: string) => void
}

const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  appointment,
  project,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [notes, setNotes] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (appointment) {
      setEditDate(appointment.date || '')
      setEditTime(appointment.time || '')

      // For project-based appointments, try to extract notes from project
      if (appointment.id.startsWith('temp-') && project) {
        const typeLabel = getAppointmentTypeLabel(appointment.type, {
          projectDeliveryType: project.deliveryType,
          notes: appointment.notes,
          defaultDeliveryKind: 'Abholung',
        })
        const notesMatch = project.notes?.match(
          new RegExp(`${typeLabel}.*?:\\s*(.+?)(?=\\n|$)`, 'i')
        )
        setNotes(notesMatch ? notesMatch[1].trim() : '')
      } else {
        setNotes(appointment.notes || '')
      }
      setIsEditing(false)
    }
  }, [appointment, project])

  if (!isOpen || !appointment) return null

  const handleSave = async () => {
    if (!appointment) return

    setIsSaving(true)
    try {
      const updated: PlanningAppointment = {
        ...appointment,
        date: editDate,
        time: editTime || undefined,
        notes: notes,
      }
      onUpdate(updated)
      setIsEditing(false)
    } catch (error) {
      logger.error('Error saving appointment', { component: 'AppointmentDetailModal' }, error instanceof Error ? error : new Error(String(error)))
      alert('Fehler beim Speichern')
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getTypeColor = (type: string, typeLabel?: string) => {
    const colors: Record<string, string> = {
      Consultation: 'bg-emerald-500',
      FirstMeeting: 'bg-blue-500',
      Measurement: 'bg-indigo-500',
      Installation: 'bg-amber-500',
      Service: 'bg-purple-500',
      ReMeasurement: 'bg-cyan-500',
      Delivery: typeLabel === 'Abholung' ? 'bg-orange-500' : 'bg-violet-500',
      Other: 'bg-slate-500',
    }
    return colors[type] || 'bg-slate-500'
  }

  const isProjectBased = appointment.id.startsWith('temp-')
  const appointmentTypeLabel = getAppointmentTypeLabel(appointment.type, {
    projectDeliveryType: project?.deliveryType,
    notes: appointment.notes,
    defaultDeliveryKind: isProjectBased ? 'Abholung' : 'Lieferung',
  })

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex shrink-0 items-start justify-between p-6 text-white ${getTypeColor(appointment.type, appointmentTypeLabel)}`}
        >
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/20 p-2.5">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-white/80">
                  {appointmentTypeLabel}
                </p>
                <h3 className="text-xl font-bold">{appointment.customerName}</h3>
              </div>
            </div>
            {appointment.time && (
              <div className="ml-12 mt-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-white/80" />
                <span className="text-sm font-medium text-white/90">{appointment.time} Uhr</span>
              </div>
            )}
            {project && (
              <p className="ml-12 mt-2 text-sm text-white/70">Auftrag #{project.orderNumber}</p>
            )}
          </div>
          <button onClick={onClose} className="rounded-xl p-2 transition-colors hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* Date & Time - Editable */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Datum & Uhrzeit
              </p>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-amber-50 hover:text-amber-600"
                  title="Datum und Uhrzeit bearbeiten"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Datum</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Uhrzeit</label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={e => setEditTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Speichern
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setEditDate(appointment.date || '')
                      setEditTime(appointment.time || '')
                      setIsEditing(false)
                    }}
                    className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-300"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="mb-1 flex items-center gap-2 text-slate-500">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs">Datum</span>
                  </div>
                  <p className="font-bold text-slate-800">{formatDate(editDate)}</p>
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-2 text-slate-500">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">Uhrzeit</span>
                  </div>
                  <p className="font-bold text-slate-800">{editTime ? `${editTime} Uhr` : '—'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Customer Info */}
          {project && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Kunde
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="font-medium text-slate-800">{project.customerName}</span>
                </div>
                {project.address && (
                  <p className="ml-6 text-sm text-slate-600">{project.address}</p>
                )}
                {project.phone && (
                  <div className="ml-6 flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <a
                      href={`tel:${project.phone}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {project.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Notizen
            </p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notizen zum Termin..."
              className="min-h-[100px] w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
            {notes !== (appointment.notes || '') && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="mt-2 flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Notizen speichern
                  </>
                )}
              </button>
            )}
          </div>

          {/* Info for project-based appointments */}
          {isProjectBased && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-700">
                Hinweis
              </p>
              <p className="text-sm text-amber-800">
                Dieser Termin ist mit einem Auftrag verknüpft. Datum und Uhrzeit werden im Auftrag
                gespeichert.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 p-4">
          {onDelete && !isProjectBased ? (
            <button
              onClick={() => {
                if (confirm('Möchten Sie diesen Termin wirklich löschen?')) {
                  onDelete(appointment.id)
                  onClose()
                }
              }}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Löschen
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-200 px-6 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-300"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  )
}

export default AppointmentDetailModal
