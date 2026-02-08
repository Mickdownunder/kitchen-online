'use client'

import React, { useState, useMemo, useEffect, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, AlertTriangle, Search } from 'lucide-react'
import { useApp } from '../providers'
import ComplaintCreateModal from '@/components/ComplaintCreateModal'
import ComplaintDetailModal from '@/components/ComplaintDetailModal'
import ComplaintKanbanBoard from '@/components/ComplaintKanbanBoard'
import { Complaint } from '@/types'
import AIAgentButton from '@/components/AIAgentButton'
import { getComplaints, createComplaint, updateComplaint } from '@/lib/supabase/services'
import { createAppointment } from '@/lib/supabase/services/appointments'
import { useToast } from '@/components/providers/ToastProvider'
import { logger } from '@/lib/utils/logger'

function ComplaintsPageContent() {
  const { projects } = useApp()
  const { success, error: showError } = useToast()
  const searchParams = useSearchParams()
  const projectIdParam = searchParams.get('projectId')

  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<
    'all' | 'low' | 'medium' | 'high' | 'urgent'
  >('all')
  const [supplierFilter, setSupplierFilter] = useState<string>('all')

  const loadComplaints = useCallback(async () => {
    try {
      setLoading(true)
      // Wenn projectIdParam vorhanden ist, zeige ALLE (auch resolved) für Projekt-Context
      // Sonst nur offene (excludeResolved = true) - erledigte verschwinden automatisch
      const excludeResolved = !projectIdParam
      const data = await getComplaints(undefined, excludeResolved)
      setComplaints(data)
    } catch (err) {
      logger.error('Error loading complaints', { component: 'ComplaintsClient' }, err instanceof Error ? err : new Error(String(err)))
      showError('Fehler beim Laden der Reklamationen')
    } finally {
      setLoading(false)
    }
  }, [projectIdParam, showError])

  // Lade Reklamationen - neu laden wenn projectIdParam sich ändert
  useEffect(() => {
    loadComplaints()
  }, [loadComplaints])

  // Deep-Link: Öffne Reklamation wenn projectId übergeben wird
  useEffect(() => {
    if (projectIdParam && complaints.length > 0) {
      const projectComplaints = complaints.filter(c => c.projectId === projectIdParam)
      if (projectComplaints.length > 0) {
        setSelectedComplaint(projectComplaints[0])
      }
    }
  }, [projectIdParam, complaints])

  // Gefilterte Reklamationen
  const filteredComplaints = useMemo(() => {
    let filtered = complaints

    // Filter nach projectId wenn übergeben
    if (projectIdParam) {
      filtered = filtered.filter(c => c.projectId === projectIdParam)
    }

    return filtered.filter(complaint => {
      const project = projects.find(p => p.id === complaint.projectId)
      const matchesSearch =
        complaint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project?.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project?.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.originalOrderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.supplierName?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesPriority = priorityFilter === 'all' || complaint.priority === priorityFilter
      const matchesSupplier = supplierFilter === 'all' || complaint.supplierName === supplierFilter

      return matchesSearch && matchesPriority && matchesSupplier
    })
  }, [complaints, projects, searchTerm, priorityFilter, supplierFilter, projectIdParam])

  // Statistiken - nur für offene Reklamationen (resolved werden nicht mehr geladen)
  const stats = useMemo(() => {
    const total = complaints.length // Alle geladenen sind offen (resolved werden nicht geladen)
    const byStatus = {
      draft: complaints.filter(c => c.status === 'draft').length,
      reported: complaints.filter(c => c.status === 'reported').length,
      ab_confirmed: complaints.filter(c => c.status === 'ab_confirmed').length,
      delivered: complaints.filter(c => c.status === 'delivered').length,
      installed: complaints.filter(c => c.status === 'installed').length,
      resolved: 0, // Resolved werden nicht mehr geladen/angezeigt
    }
    const open = total // Alle sind offen, da resolved ausgefiltert
    const byPriority = {
      urgent: complaints.filter(c => c.priority === 'urgent').length,
      high: complaints.filter(c => c.priority === 'high').length,
      medium: complaints.filter(c => c.priority === 'medium').length,
      low: complaints.filter(c => c.priority === 'low').length,
    }

    // Lieferanten-Statistik
    const supplierStats = complaints.reduce(
      (acc, c) => {
        if (c.supplierName) {
          acc[c.supplierName] = (acc[c.supplierName] || 0) + 1
        }
        return acc
      },
      {} as Record<string, number>
    )

    return { total, open, byStatus, byPriority, supplierStats }
  }, [complaints])

  // Eindeutige Lieferanten für Filter
  const uniqueSuppliers = useMemo(() => {
    const suppliers = new Set<string>()
    complaints.forEach(c => {
      if (c.supplierName) suppliers.add(c.supplierName)
    })
    return Array.from(suppliers).sort()
  }, [complaints])

  // Handle Status Change (vom Kanban-Board)
  const handleStatusChange = async (complaintId: string, newStatus: Complaint['status']) => {
    try {
      const updates: Partial<Complaint> = { status: newStatus }

      // Automatisch Timestamps setzen
      const complaint = complaints.find(c => c.id === complaintId)
      if (complaint) {
        if (newStatus === 'reported' && !complaint.reportedAt) {
          updates.reportedAt = new Date().toISOString()
        }
        if (newStatus === 'ab_confirmed' && !complaint.abConfirmedAt) {
          updates.abConfirmedAt = new Date().toISOString()
        }
        if (newStatus === 'delivered' && !complaint.deliveredAt) {
          updates.deliveredAt = new Date().toISOString()
        }
        if (newStatus === 'installed' && !complaint.installedAt) {
          updates.installedAt = new Date().toISOString()
        }
        if (newStatus === 'resolved' && !complaint.resolvedAt) {
          updates.resolvedAt = new Date().toISOString()
        }
      }

      await updateComplaint(complaintId, updates)
      await loadComplaints()
      success('Status aktualisiert')
    } catch (err) {
      logger.error('Error updating complaint status', { component: 'ComplaintsClient' }, err instanceof Error ? err : new Error(String(err)))
      showError('Fehler beim Aktualisieren des Status')
    }
  }

  // Handle Create Complaint
  const handleCreateComplaint = async (
    complaint: Omit<Complaint, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      await createComplaint(complaint)
      await loadComplaints()
      success('Reklamation erfasst')
      setIsCreateModalOpen(false)
    } catch (err: unknown) {
      const errObj = err as Error & { code?: string; details?: string; hint?: string }
      logger.error('Error creating complaint', {
        component: 'ComplaintsClient',
        message: errObj?.message,
        code: errObj?.code,
        details: errObj?.details,
        hint: errObj?.hint,
      }, errObj instanceof Error ? errObj : new Error(String(errObj)))

      // Show user-friendly error message
      const errorMessage =
        (err instanceof Error ? err.message : (err as { message?: string }).message) ||
        'Unbekannter Fehler'
      const errorCode = (err as { code?: string }).code

      if (
        errorCode === 'PGRST116' ||
        errorMessage.includes('relation') ||
        errorMessage.includes('does not exist')
      ) {
        showError(
          'Fehler: Die Datenbank-Tabelle existiert nicht. Bitte führe die SQL-Migration aus: supabase/migrations/create_complaints_table.sql'
        )
      } else if (errorMessage.includes('foreign key') || errorMessage.includes('project')) {
        showError('Projekt nicht gefunden oder gelöscht. Bitte wähle ein anderes Projekt.')
      } else if (errorMessage.includes('permission') || errorMessage.includes('RLS')) {
        showError('Keine Berechtigung zum Erstellen von Reklamationen')
      } else if (errorMessage.includes('company')) {
        showError(
          'Keine Firma zugewiesen. Bitte stelle sicher, dass du einer Firma zugeordnet bist.'
        )
      } else {
        showError(`Fehler beim Erfassen der Reklamation: ${errorMessage}`)
      }
    }
  }

  // Handle Update Complaint
  const handleUpdateComplaint = async (updates: Partial<Complaint>) => {
    if (!selectedComplaint) return
    try {
      // Update Complaint und erhalte aktualisierte Version
      const updatedComplaint = await updateComplaint(selectedComplaint.id, updates)

      // Wenn Status auf "resolved" gesetzt wurde, schließe Modal (Reklamation verschwindet aus Liste)
      const isNowResolved = updatedComplaint.status === 'resolved'

      // Aktualisiere selectedComplaint sofort für sofortiges UI-Update
      setSelectedComplaint(updatedComplaint)

      // Lade alle Complaints neu (für Liste/Kanban)
      await loadComplaints()

      if (isNowResolved) {
        // Modal schließen, da Reklamation nicht mehr in der Liste sichtbar ist
        setSelectedComplaint(null)
        success('Reklamation als erledigt markiert und aus der Liste entfernt')
      } else {
        success('Reklamation aktualisiert')
      }
    } catch (err) {
      logger.error('Error updating complaint', { component: 'ComplaintsClient' }, err instanceof Error ? err : new Error(String(err)))
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler'
      showError(`Fehler beim Aktualisieren: ${errorMessage}`)
    }
  }

  // Handle Create Installation Appointment
  const handleCreateAppointment = async (complaintId: string) => {
    const complaint = complaints.find(c => c.id === complaintId)
    if (!complaint) return

    const project = projects.find(p => p.id === complaint.projectId)
    if (!project) return

    try {
      const appointment = await createAppointment({
        customerName: project.customerName,
        date: new Date().toISOString().split('T')[0], // Heute als Standard
        type: 'Installation',
        notes: `Nachmontage für Reklamation: ${complaint.description}`,
      })

      await updateComplaint(complaintId, {
        installationAppointmentId: appointment.id,
      })

      await loadComplaints()
      success('Nachmontage-Termin erstellt')
    } catch (err) {
      logger.error('Error creating appointment', { component: 'ComplaintsClient' }, err instanceof Error ? err : new Error(String(err)))
      showError('Fehler beim Erstellen des Termins')
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <div className="animate-in fade-in space-y-8 duration-700">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="mb-2 text-5xl font-black tracking-tighter text-slate-900">
              Reklamations-Zentrale
            </h2>
            <p className="font-medium text-slate-500">
              Professionelles Reklamations-Management mit Workflow-Tracking
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-3 rounded-2xl bg-red-500 px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-red-600 active:scale-95"
          >
            <Plus className="h-5 w-5" /> Reklamation erfassen
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-lg">
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-400">
              Gesamt
            </p>
            <p className="text-2xl font-black text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-lg">
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-red-400">Offen</p>
            <p className="text-2xl font-black text-red-600">{stats.open}</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-lg">
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-blue-400">
              Gemeldet
            </p>
            <p className="text-2xl font-black text-blue-600">{stats.byStatus.reported}</p>
          </div>
          <div className="rounded-2xl border border-purple-100 bg-white p-4 shadow-lg">
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-purple-400">
              AB bestätigt
            </p>
            <p className="text-2xl font-black text-purple-600">{stats.byStatus.ab_confirmed}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-lg">
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-amber-400">
              Geliefert
            </p>
            <p className="text-2xl font-black text-amber-600">{stats.byStatus.delivered}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
            <input
              type="text"
              placeholder="Suche nach Kunde, Auftrag, AB-Nummer, Lieferant..."
              className="w-full rounded-2xl border border-slate-100 bg-white py-4 pl-12 pr-4 font-medium outline-none focus:ring-2 focus:ring-red-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={priorityFilter}
              onChange={e =>
                setPriorityFilter(e.target.value as 'all' | 'low' | 'medium' | 'high' | 'urgent')
              }
              className="rounded-2xl border border-slate-100 bg-white px-4 py-4 text-xs font-black uppercase tracking-widest text-slate-700 outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">Alle Prioritäten</option>
              <option value="urgent">Dringend</option>
              <option value="high">Hoch</option>
              <option value="medium">Mittel</option>
              <option value="low">Niedrig</option>
            </select>
            {uniqueSuppliers.length > 0 && (
              <select
                value={supplierFilter}
                onChange={e => setSupplierFilter(e.target.value)}
                className="rounded-2xl border border-slate-100 bg-white px-4 py-4 text-xs font-black uppercase tracking-widest text-slate-700 outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">Alle Lieferanten</option>
                {uniqueSuppliers.map(supplier => (
                  <option key={supplier} value={supplier}>
                    {supplier}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Kanban Board */}
        {filteredComplaints.length > 0 ? (
          <ComplaintKanbanBoard
            complaints={filteredComplaints}
            projects={projects}
            onComplaintClick={setSelectedComplaint}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <div className="rounded-3xl border border-slate-100 bg-white p-16 text-center shadow-lg">
            <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-slate-300" />
            <h3 className="mb-2 text-xl font-black text-slate-900">
              {complaints.length === 0 ? 'Keine Reklamationen' : 'Keine Reklamationen gefunden'}
            </h3>
            <p className="text-slate-500">
              {complaints.length === 0
                ? 'Alle Projekte sind mängelfrei! 🎉'
                : 'Versuchen Sie eine andere Suche oder einen anderen Filter.'}
            </p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <ComplaintCreateModal
          projects={projects}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleCreateComplaint}
        />
      )}

      {/* Detail Modal */}
      {selectedComplaint && (
        <ComplaintDetailModal
          complaint={selectedComplaint}
          project={projects.find(p => p.id === selectedComplaint.projectId) || null}
          onClose={() => setSelectedComplaint(null)}
          onUpdate={handleUpdateComplaint}
          onCreateAppointment={handleCreateAppointment}
        />
      )}

      <AIAgentButton />
    </>
  )
}

export default function ComplaintsClient() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
        </div>
      }
    >
      <ComplaintsPageContent />
    </Suspense>
  )
}
