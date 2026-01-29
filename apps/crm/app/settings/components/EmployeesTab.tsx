'use client'

import { Check, Loader2, Pencil, Plus, Trash2, Users, X } from 'lucide-react'
import { Employee } from '@/types'

export function EmployeesTab({
  employees,
  editingEmployee,
  setEditingEmployee,
  saving,
  onSaveEmployee,
  onDeleteEmployee,
}: {
  employees: Employee[]
  editingEmployee: Partial<Employee> | null
  setEditingEmployee: React.Dispatch<React.SetStateAction<Partial<Employee> | null>>
  saving: boolean
  onSaveEmployee: () => void
  onDeleteEmployee: (id: string) => void
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
          <Users className="h-5 w-5 text-amber-500" />
          Mitarbeiter & Verkäufer
        </h3>
        <button
          onClick={() =>
            setEditingEmployee({ firstName: '', lastName: '', role: 'verkaeufer', isActive: true })
          }
          className="flex items-center gap-2 rounded-xl bg-yellow-500 px-4 py-2 text-sm font-bold text-blue-900 transition-all hover:bg-yellow-600"
        >
          <Plus className="h-4 w-4" />
          Neuer Mitarbeiter
        </button>
      </div>

      {editingEmployee && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h4 className="font-bold text-slate-900">
            {editingEmployee.id ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}
          </h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Vorname *
              </label>
              <input
                type="text"
                value={editingEmployee.firstName || ''}
                onChange={e =>
                  setEditingEmployee(prev => (prev ? { ...prev, firstName: e.target.value } : null))
                }
                className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Nachname *
              </label>
              <input
                type="text"
                value={editingEmployee.lastName || ''}
                onChange={e =>
                  setEditingEmployee(prev => (prev ? { ...prev, lastName: e.target.value } : null))
                }
                className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Rolle
              </label>
              <select
                value={editingEmployee.role || 'verkaeufer'}
                onChange={e =>
                  setEditingEmployee(prev =>
                    prev ? { ...prev, role: e.target.value as Employee['role'] } : null
                  )
                }
                className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-500"
              >
                <option value="geschaeftsfuehrer">Geschäftsführer</option>
                <option value="administration">Administration</option>
                <option value="buchhaltung">Buchhaltung</option>
                <option value="verkaeufer">Verkäufer</option>
                <option value="monteur">Monteur</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                E-Mail
              </label>
              <input
                type="email"
                value={editingEmployee.email || ''}
                onChange={e =>
                  setEditingEmployee(prev => (prev ? { ...prev, email: e.target.value } : null))
                }
                className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Telefon
              </label>
              <input
                type="tel"
                value={editingEmployee.phone || ''}
                onChange={e =>
                  setEditingEmployee(prev => (prev ? { ...prev, phone: e.target.value } : null))
                }
                className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Provision (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={editingEmployee.commissionRate || ''}
                onChange={e =>
                  setEditingEmployee(prev =>
                    prev
                      ? { ...prev, commissionRate: parseFloat(e.target.value) || undefined }
                      : null
                  )
                }
                className="w-full rounded-xl bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500"
                placeholder="z.B. 5"
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={editingEmployee.isActive !== false}
              onChange={e =>
                setEditingEmployee(prev => (prev ? { ...prev, isActive: e.target.checked } : null))
              }
              className="h-4 w-4 rounded text-amber-500 focus:ring-amber-500"
            />
            <span className="text-sm text-slate-700">Aktiv</span>
          </label>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setEditingEmployee(null)}
              className="flex items-center gap-2 rounded-xl bg-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition-all hover:bg-slate-300"
            >
              <X className="h-4 w-4" />
              Abbrechen
            </button>
            <button
              onClick={onSaveEmployee}
              disabled={saving || !editingEmployee.firstName || !editingEmployee.lastName}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-emerald-600 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Speichern
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {employees.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Users className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p>Keine Mitarbeiter vorhanden</p>
          </div>
        ) : (
          employees.map(emp => (
            <div
              key={emp.id}
              className={`flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 ${!emp.isActive ? 'opacity-50' : ''}`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900">
                    {emp.firstName} {emp.lastName}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      emp.role === 'geschaeftsfuehrer'
                        ? 'bg-purple-100 text-purple-700'
                        : emp.role === 'administration'
                          ? 'bg-blue-100 text-blue-700'
                          : emp.role === 'buchhaltung'
                            ? 'bg-indigo-100 text-indigo-700'
                            : emp.role === 'verkaeufer'
                              ? 'bg-amber-100 text-amber-700'
                              : emp.role === 'monteur'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {emp.role === 'geschaeftsfuehrer'
                      ? 'Geschäftsführer'
                      : emp.role === 'administration'
                        ? 'Administration'
                        : emp.role === 'buchhaltung'
                          ? 'Buchhaltung'
                          : emp.role === 'verkaeufer'
                            ? 'Verkäufer'
                            : emp.role === 'monteur'
                              ? 'Monteur'
                              : 'Unbekannt'}
                  </span>
                  {!emp.isActive && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                      Inaktiv
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  {emp.email || '-'} · {emp.phone || '-'}
                </p>
                {emp.commissionRate && (
                  <p className="text-xs text-slate-400">Provision: {emp.commissionRate}%</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingEmployee(emp)}
                  className="rounded-lg bg-blue-100 p-2 transition-all hover:bg-blue-200"
                >
                  <Pencil className="h-4 w-4 text-blue-600" />
                </button>
                <button
                  onClick={() => onDeleteEmployee(emp.id)}
                  className="rounded-lg bg-red-100 p-2 transition-all hover:bg-red-200"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
