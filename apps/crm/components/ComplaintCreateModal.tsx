'use client'

import React, { useState, useMemo } from 'react'
import { X, Save, AlertCircle, Search, Building2, FileText, Check } from 'lucide-react'
import { CustomerProject, Complaint } from '@/types'

interface ComplaintCreateModalProps {
  projects: CustomerProject[]
  onClose: () => void
  onSave: (complaint: Omit<Complaint, 'id' | 'createdAt' | 'updatedAt'>) => void
}

const ComplaintCreateModal: React.FC<ComplaintCreateModalProps> = ({
  projects,
  onClose,
  onSave,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [supplierName, setSupplierName] = useState('')
  const [originalOrderNumber, setOriginalOrderNumber] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [projectSearchTerm, setProjectSearchTerm] = useState('')
  const [itemSearchTerm, setItemSearchTerm] = useState('')

  const selectedProject = useMemo(
    () => projects.find(p => p.id === selectedProjectId),
    [projects, selectedProjectId]
  )

  // Automatisch Lieferant und AB-Nummer aus Projekt setzen
  React.useEffect(() => {
    if (selectedProject) {
      // AB-Nummer automatisch setzen
      if (!originalOrderNumber && selectedProject.orderNumber) {
        setOriginalOrderNumber(selectedProject.orderNumber)
      }

      // Lieferant aus Items extrahieren (häufigster Lieferant)
      if (!supplierName && selectedProject.items && selectedProject.items.length > 0) {
        const suppliers = selectedProject.items
          .map(item => item.manufacturer)
          .filter(Boolean) as string[]

        if (suppliers.length > 0) {
          // Häufigster Lieferant
          const supplierCounts = suppliers.reduce(
            (acc, s) => {
              acc[s] = (acc[s] || 0) + 1
              return acc
            },
            {} as Record<string, number>
          )

          const mostCommonSupplier = Object.entries(supplierCounts).sort(
            (a, b) => b[1] - a[1]
          )[0]?.[0]

          if (mostCommonSupplier) {
            setSupplierName(mostCommonSupplier)
          }
        }
      }
    }
  }, [selectedProject, originalOrderNumber, supplierName])

  // Gefilterte Projekte für Suche
  const filteredProjects = useMemo(() => {
    if (!projectSearchTerm) return projects
    const term = projectSearchTerm.toLowerCase()
    return projects.filter(
      p =>
        p.customerName.toLowerCase().includes(term) ||
        p.orderNumber?.toLowerCase().includes(term) ||
        p.invoiceNumber?.toLowerCase().includes(term)
    )
  }, [projects, projectSearchTerm])

  // Verfügbare Items aus dem ausgewählten Projekt
  const availableItems = useMemo(() => {
    if (!selectedProject) return []
    return selectedProject.items || []
  }, [selectedProject])

  // Gefilterte Items für Suche
  const filteredItems = useMemo(() => {
    if (!itemSearchTerm) return availableItems
    const term = itemSearchTerm.toLowerCase()
    return availableItems.filter(
      item =>
        item.description.toLowerCase().includes(term) ||
        item.modelNumber?.toLowerCase().includes(term) ||
        item.manufacturer?.toLowerCase().includes(term)
    )
  }, [availableItems, itemSearchTerm])

  // Toggle Item-Auswahl
  const toggleItem = (itemId: string) => {
    setSelectedItemIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    )
  }

  // Beschreibungs-Vorlagen
  const descriptionTemplates = [
    {
      label: 'Kratzer in Verpackung',
      template:
        'Front von AB Pos {position} hat einen Kratzer in der Verpackung. Bitte erneut zusenden.',
    },
    {
      label: 'Beschädigung',
      template: 'Artikel {description} (Pos {position}) ist beschädigt. Bitte Ersatz liefern.',
    },
    {
      label: 'Fehlteil',
      template: 'Artikel {description} (Pos {position}) fehlt. Bitte nachliefern.',
    },
    {
      label: 'Falscher Artikel',
      template:
        'Falscher Artikel geliefert. Erwartet: {description} (Pos {position}). Bitte korrigieren.',
    },
  ]

  const applyTemplate = (template: string) => {
    if (selectedItemIds.length === 0) {
      setDescription(template.replace('{position}', 'X').replace('{description}', 'Artikel'))
      return
    }

    const firstItem = availableItems.find(item => selectedItemIds.includes(item.id))
    if (firstItem) {
      const filled = template
        .replace('{position}', String(firstItem.position))
        .replace('{description}', firstItem.description)
      setDescription(filled)
    } else {
      setDescription(template.replace('{position}', 'X').replace('{description}', 'Artikel'))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProjectId || !description) return

    const newComplaint: Omit<Complaint, 'id' | 'createdAt' | 'updatedAt'> = {
      projectId: selectedProjectId,
      description,
      status: 'draft',
      priority,
      affectedItemIds: selectedItemIds,
      supplierName: supplierName || undefined,
      originalOrderNumber: originalOrderNumber || undefined,
      internalNotes: internalNotes || undefined,
      reportedAt: new Date().toISOString(),
    }

    onSave(newComplaint)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-red-50 p-6">
          <h3 className="flex items-center gap-2 text-xl font-bold text-red-900">
            <AlertCircle className="h-6 w-6" />
            Reklamation erfassen
          </h3>
          <button onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-red-100">
            <X className="h-6 w-6 text-red-900" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-6 overflow-y-auto p-8">
          {/* Projekt-Auswahl */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">
              Projekt auswählen *
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
              <input
                type="text"
                placeholder="Suche nach Kunde oder Auftragsnummer..."
                className="w-full rounded-xl border-none bg-slate-50 px-12 py-3 font-medium outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-red-500"
                value={projectSearchTerm}
                onChange={e => setProjectSearchTerm(e.target.value)}
                onFocus={() => setProjectSearchTerm('')}
              />
            </div>
            <select
              required
              className="w-full rounded-xl border-none bg-slate-50 px-4 py-3 font-medium outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-red-500"
              value={selectedProjectId}
              onChange={e => {
                setSelectedProjectId(e.target.value)
                setProjectSearchTerm('')
              }}
            >
              <option value="">Bitte wählen...</option>
              {(projectSearchTerm ? filteredProjects : projects).map(p => (
                <option key={p.id} value={p.id}>
                  {p.customerName} (#{p.orderNumber})
                  {p.invoiceNumber ? ` - Rechnung: ${p.invoiceNumber}` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedProject && (
            <>
              {/* AB-Nummer */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                    AB-Nummer (ursprüngliche Bestellung)
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
                    <input
                      type="text"
                      placeholder="z.B. AB-2025-001"
                      className="w-full rounded-xl border-none bg-slate-50 px-12 py-3 font-medium outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-red-500"
                      value={originalOrderNumber}
                      onChange={e => setOriginalOrderNumber(e.target.value)}
                    />
                  </div>
                </div>

                {/* Lieferant */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Lieferant
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
                    <input
                      type="text"
                      placeholder="z.B. Schüller, Nolte..."
                      className="w-full rounded-xl border-none bg-slate-50 px-12 py-3 font-medium outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-red-500"
                      value={supplierName}
                      onChange={e => setSupplierName(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Item-Auswahl */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Betroffene Artikel (optional)
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
                  <input
                    type="text"
                    placeholder="Suche nach Artikel..."
                    className="w-full rounded-xl border-none bg-slate-50 px-12 py-3 font-medium outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-red-500"
                    value={itemSearchTerm}
                    onChange={e => setItemSearchTerm(e.target.value)}
                  />
                </div>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                  {filteredItems.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {filteredItems.map(item => (
                        <label
                          key={item.id}
                          className="flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedItemIds.includes(item.id)}
                            onChange={() => toggleItem(item.id)}
                            className="h-5 w-5 rounded text-red-500 focus:ring-red-500"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-slate-900">
                              Pos {item.position}: {item.description}
                            </div>
                            {item.manufacturer && (
                              <div className="text-xs text-slate-500">{item.manufacturer}</div>
                            )}
                          </div>
                          {selectedItemIds.includes(item.id) && (
                            <Check className="h-5 w-5 text-red-500" />
                          )}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-slate-500">
                      Keine Artikel gefunden
                    </div>
                  )}
                </div>
                {selectedItemIds.length > 0 && (
                  <div className="text-xs text-slate-500">
                    {selectedItemIds.length} Artikel ausgewählt
                  </div>
                )}
              </div>

              {/* Beschreibungs-Vorlagen */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Beschreibungs-Vorlagen
                </label>
                <div className="flex flex-wrap gap-2">
                  {descriptionTemplates.map((template, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyTemplate(template.template)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-red-300 hover:bg-slate-50"
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Beschreibung */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">
              Beschreibung des Mangels *
            </label>
            <textarea
              required
              placeholder="Was genau muss korrigiert werden?"
              className="h-32 w-full resize-none rounded-xl border-none bg-slate-50 px-4 py-3 font-medium outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-red-500"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Priorität */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">
              Priorität
            </label>
            <select
              className="w-full rounded-xl border-none bg-slate-50 px-4 py-3 font-medium outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-red-500"
              value={priority}
              onChange={e => setPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')}
            >
              <option value="low">Niedrig</option>
              <option value="medium">Mittel</option>
              <option value="high">Hoch</option>
              <option value="urgent">Dringend</option>
            </select>
          </div>

          {/* Interne Notizen */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">
              Interne Notizen (optional)
            </label>
            <textarea
              placeholder="Interne Notizen für das Team..."
              className="h-24 w-full resize-none rounded-xl border-none bg-slate-50 px-4 py-3 font-medium outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-red-500"
              value={internalNotes}
              onChange={e => setInternalNotes(e.target.value)}
            />
          </div>

          {/* Buttons */}
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
              disabled={!selectedProjectId || !description}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 px-6 py-3 font-bold text-white shadow-lg shadow-red-100 transition-all hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              Reklamation speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ComplaintCreateModal
