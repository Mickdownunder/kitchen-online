'use client'

import React from 'react'
import {
  Search,
  Filter,
  Info,
  Ruler,
  Truck,
  Package,
  Calendar as CalendarIcon,
  X,
} from 'lucide-react'
import type { CustomerProject, PlanningAppointment, ProjectStatus } from '@/types'

interface QuickAssignModalProps {
  isOpen: boolean
  selectedDate: Date | null
  setSelectedDate: (date: Date | null) => void
  monthNames: string[]
  isCreatingNewAppointment: boolean
  setIsCreatingNewAppointment: (value: boolean) => void
  searchQuery: string
  setSearchQuery: (value: string) => void
  sortBy: 'name' | 'date' | 'status'
  setSortBy: (value: 'name' | 'date' | 'status') => void
  projectsToAssign: CustomerProject[]
  assignDateToProject: (
    project: CustomerProject,
    type: 'measurement' | 'installation' | 'delivery'
  ) => void
  getStatusColor: (status: ProjectStatus) => string
  formatDate: (dateStr?: string) => string
  newAppointmentName: string
  setNewAppointmentName: (value: string) => void
  newAppointmentType: PlanningAppointment['type']
  setNewAppointmentType: (value: PlanningAppointment['type']) => void
  newAppointmentTime: string
  setNewAppointmentTime: (value: string) => void
  newAppointmentNotes: string
  setNewAppointmentNotes: (value: string) => void
  createPlanningAppointment: () => void
  onClose: () => void
}

export const QuickAssignModal: React.FC<QuickAssignModalProps> = ({
  isOpen,
  selectedDate,
  setSelectedDate,
  monthNames,
  isCreatingNewAppointment,
  setIsCreatingNewAppointment,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  projectsToAssign,
  assignDateToProject,
  getStatusColor,
  formatDate,
  newAppointmentName,
  setNewAppointmentName,
  newAppointmentType,
  setNewAppointmentType,
  newAppointmentTime,
  setNewAppointmentTime,
  newAppointmentNotes,
  setNewAppointmentNotes,
  createPlanningAppointment,
  onClose,
}) => {
  if (!isOpen || !selectedDate) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="animate-in zoom-in-95 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl duration-200">
        <div className="flex shrink-0 items-center justify-between bg-slate-800 p-6 text-white">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-400">
              Neuer Termin
            </p>
            <h3 className="text-xl font-bold">
              {selectedDate.getDate()}. {monthNames[selectedDate.getMonth()]}{' '}
              {selectedDate.getFullYear()}
            </h3>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 transition-colors hover:bg-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-6 mt-6 flex shrink-0 rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setIsCreatingNewAppointment(false)}
            className={`flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              !isCreatingNewAppointment ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
            }`}
          >
            Auftrag zuweisen
          </button>
          <button
            onClick={() => setIsCreatingNewAppointment(true)}
            className={`flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              isCreatingNewAppointment ? 'bg-emerald-500 text-white' : 'text-slate-500'
            }`}
          >
            Neuer Termin
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!isCreatingNewAppointment ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Auftrag suchen (Name, Nummer, Status, Stadt, Telefon)..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              {searchQuery.trim() && (
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as 'name' | 'date' | 'status')}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="name">Nach Name</option>
                    <option value="date">Nach Datum</option>
                    <option value="status">Nach Status</option>
                  </select>
                </div>
              )}
              <div className="max-h-[400px] space-y-2 overflow-y-auto">
                {projectsToAssign.length > 0 ? (
                  projectsToAssign.map(p => (
                    <div
                      key={p.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-amber-300 hover:shadow-md"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="mb-1 truncate font-bold text-slate-900">
                            {p.customerName}
                          </h4>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs font-medium text-slate-500">
                              #{p.orderNumber}
                            </span>
                            {p.address && (
                              <span className="max-w-[150px] truncate text-xs text-slate-500">
                                {(() => {
                                  const parts = p.address.split(',')
                                  return parts[parts.length - 1]?.trim() || p.address
                                })()}
                              </span>
                            )}
                            {p.orderDate && (
                              <span className="text-xs text-slate-500">
                                {formatDate(p.orderDate)}
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-lg border px-2 py-1 text-xs font-semibold ${getStatusColor(p.status)}`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => assignDateToProject(p, 'measurement')}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-500 px-2 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-600"
                        >
                          <Ruler className="h-3.5 w-3.5" /> Aufmaß
                        </button>
                        <button
                          onClick={() => assignDateToProject(p, 'installation')}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-2 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
                        >
                          <Truck className="h-3.5 w-3.5" /> Montage
                        </button>
                        <button
                          onClick={() => assignDateToProject(p, 'delivery')}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-white transition-colors ${
                            p.deliveryType === 'delivery'
                              ? 'bg-teal-500 hover:bg-teal-600'
                              : 'bg-orange-500 hover:bg-orange-600'
                          }`}
                        >
                          <Package className="h-3.5 w-3.5" />{' '}
                          {p.deliveryType === 'delivery' ? 'Lieferung' : 'Abholung'}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center">
                    <Info className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-400">
                      {!searchQuery.trim()
                        ? 'Namen oder Auftragsnummer eingeben, um Aufträge zu suchen.'
                        : 'Keine Aufträge gefunden'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Datum
                  </label>
                  <input
                    type="date"
                    autoFocus
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    value={
                      selectedDate
                        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                        : ''
                    }
                    onChange={e => {
                      const val = e.target.value
                      if (val) {
                        const d = new Date(val + 'T12:00:00')
                        setSelectedDate(d)
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Uhrzeit
                  </label>
                  <input
                    type="time"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    value={newAppointmentTime}
                    onChange={e => setNewAppointmentTime(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Kundenname
                </label>
                <input
                  required
                  placeholder="z.B. Familie Müller"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  value={newAppointmentName}
                  onChange={e => setNewAppointmentName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Termin-Typ
                </label>
                <select
                  value={newAppointmentType}
                  onChange={e =>
                    setNewAppointmentType(e.target.value as PlanningAppointment['type'])
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="Consultation">Beratung / Planung</option>
                  <option value="FirstMeeting">Erstgespräch</option>
                  <option value="Measurement">Aufmaß</option>
                  <option value="Installation">Montage</option>
                  <option value="Service">Service / Wartung</option>
                  <option value="ReMeasurement">Nachmessung</option>
                  <option value="Delivery">Lieferung</option>
                  <option value="Other">Sonstiges</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Notizen (optional)
                </label>
                <textarea
                  placeholder="Notizen zum Termin..."
                  className="min-h-[80px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  value={newAppointmentNotes}
                  onChange={e => setNewAppointmentNotes(e.target.value)}
                />
              </div>
              <button
                disabled={!newAppointmentName}
                onClick={createPlanningAppointment}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-bold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CalendarIcon className="h-4 w-4" /> Termin anlegen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
