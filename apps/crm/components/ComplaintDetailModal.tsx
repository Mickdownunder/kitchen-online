'use client'

import React, { useState, useMemo } from 'react'
import {
  X,
  Clock,
  CheckCircle2,
  Mail,
  FileText,
  Calendar,
  Package,
  Building2,
  Upload,
  ExternalLink,
  AlertCircle,
} from 'lucide-react'
import { Complaint, CustomerProject } from '@/types'
import { useRouter } from 'next/navigation'
import ComplaintEmailGenerator from './ComplaintEmailGenerator'

interface ComplaintDetailModalProps {
  complaint: Complaint
  project: CustomerProject | null
  onClose: () => void
  onUpdate: (updates: Partial<Complaint>) => Promise<void>
  onCreateAppointment?: (complaintId: string) => Promise<void>
}

const ComplaintDetailModal: React.FC<ComplaintDetailModalProps> = ({
  complaint,
  project,
  onClose,
  onUpdate,
  onCreateAppointment,
}) => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'email' | 'documents'>('overview')

  // Betroffene Items aus Projekt
  const affectedItems = useMemo(() => {
    if (!project || !complaint.affectedItemIds || complaint.affectedItemIds.length === 0) {
      return []
    }
    return (project.items || []).filter(item => complaint.affectedItemIds?.includes(item.id))
  }, [project, complaint.affectedItemIds])

  // Workflow-Timeline Daten
  const timelineSteps = useMemo(() => {
    const steps = [
      {
        id: 'draft',
        label: 'Erfasst',
        date: complaint.createdAt,
        completed: true,
        icon: CheckCircle2,
      },
      {
        id: 'reported',
        label: 'Gemeldet',
        date: complaint.reportedAt,
        completed: complaint.status !== 'draft',
        icon: Mail,
      },
      {
        id: 'ab_confirmed',
        label: 'AB bestätigt',
        date: complaint.abConfirmedAt,
        completed: ['ab_confirmed', 'delivered', 'installed', 'resolved'].includes(
          complaint.status
        ),
        icon: FileText,
      },
      {
        id: 'delivered',
        label: 'Geliefert',
        date: complaint.deliveredAt,
        completed: ['delivered', 'installed', 'resolved'].includes(complaint.status),
        icon: Package,
      },
      {
        id: 'installed',
        label: 'Nachmontiert',
        date: complaint.installedAt,
        completed: ['installed', 'resolved'].includes(complaint.status),
        icon: Calendar,
      },
      {
        id: 'resolved',
        label: 'Erledigt',
        date: complaint.resolvedAt,
        completed: complaint.status === 'resolved',
        icon: CheckCircle2,
      },
    ]
    return steps
  }, [complaint])

  const handleStatusChange = async (newStatus: Complaint['status']) => {
    const updates: Partial<Complaint> = { status: newStatus }

    // Automatisch Timestamps setzen
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
      // Automatisch Nachmontage-Termin erstellen
      if (onCreateAppointment) {
        await onCreateAppointment(complaint.id)
      }
    }
    if (newStatus === 'resolved' && !complaint.resolvedAt) {
      updates.resolvedAt = new Date().toISOString()
    }

    await onUpdate(updates)
  }

  const handleOpenProject = () => {
    if (project) {
      router.push(`/projects?projectId=${project.id}`)
      onClose()
    }
  }

  const handleUploadAB = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // NOTE: File upload to Supabase Storage for complaint attachments not yet implemented
    // Datei wird aktuell nicht gespeichert

    // Status automatisch auf 'ab_confirmed' setzen wenn noch nicht gesetzt
    if (complaint.status === 'reported') {
      await handleStatusChange('ab_confirmed')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-red-50 p-6">
          <div>
            <h3 className="flex items-center gap-2 text-xl font-bold text-red-900">
              <AlertCircle className="h-6 w-6" />
              Reklamation #{complaint.id.slice(0, 8)}
            </h3>
            {project && (
              <p className="mt-1 text-sm text-red-700">
                Projekt: {project.customerName} (#{project.orderNumber})
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-red-100">
            <X className="h-6 w-6 text-red-900" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 text-sm font-bold transition-colors ${
              activeTab === 'overview'
                ? 'border-b-2 border-red-500 text-red-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Übersicht
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`px-6 py-3 text-sm font-bold transition-colors ${
              activeTab === 'email'
                ? 'border-b-2 border-red-500 text-red-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Email
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-6 py-3 text-sm font-bold transition-colors ${
              activeTab === 'documents'
                ? 'border-b-2 border-red-500 text-red-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Dokumente
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Workflow-Timeline */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h4 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                  <Clock className="h-5 w-5 text-red-500" />
                  Workflow-Status
                </h4>
                <div className="relative">
                  <div className="absolute bottom-0 left-6 top-0 w-0.5 bg-slate-200" />
                  <div className="space-y-6">
                    {timelineSteps.map((step, idx) => {
                      const Icon = step.icon
                      const isActive = step.completed || (idx === 0 && complaint.status === 'draft')
                      const isCurrent = complaint.status === step.id

                      return (
                        <div key={step.id} className="relative flex items-start gap-4">
                          <div
                            className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                              isActive
                                ? 'border-red-500 bg-red-500 text-white'
                                : 'border-slate-300 bg-white text-slate-400'
                            } ${isCurrent ? 'ring-4 ring-red-200' : ''}`}
                          >
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1 pt-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p
                                  className={`font-bold ${
                                    isActive ? 'text-slate-900' : 'text-slate-400'
                                  }`}
                                >
                                  {step.label}
                                </p>
                                {step.date && (
                                  <p className="text-xs text-slate-500">
                                    {new Date(step.date).toLocaleDateString('de-DE', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                )}
                              </div>
                              {isCurrent && (
                                <button
                                  onClick={() => {
                                    const nextStatus = timelineSteps[idx + 1]
                                      ?.id as Complaint['status']
                                    if (nextStatus) {
                                      handleStatusChange(nextStatus)
                                    }
                                  }}
                                  className="rounded-lg bg-red-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-red-600"
                                >
                                  Weiter →
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Beschreibung & Details */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h4 className="mb-4 text-lg font-bold text-slate-900">Beschreibung</h4>
                  <p className="text-slate-700">{complaint.description}</p>
                  {complaint.priority && (
                    <div className="mt-4">
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                        Priorität:{' '}
                        {complaint.priority === 'urgent'
                          ? 'Dringend'
                          : complaint.priority === 'high'
                            ? 'Hoch'
                            : complaint.priority === 'medium'
                              ? 'Mittel'
                              : 'Niedrig'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h4 className="mb-4 text-lg font-bold text-slate-900">Verknüpfungen</h4>
                  <div className="space-y-3">
                    {project && (
                      <button
                        onClick={handleOpenProject}
                        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 transition-colors hover:bg-slate-100"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-slate-500" />
                          <span className="text-sm font-medium text-slate-900">
                            {project.customerName}
                          </span>
                        </div>
                        <ExternalLink className="h-4 w-4 text-slate-400" />
                      </button>
                    )}
                    {complaint.supplierName && (
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <Building2 className="h-5 w-5 text-slate-500" />
                        <span className="text-sm font-medium text-slate-900">
                          {complaint.supplierName}
                        </span>
                      </div>
                    )}
                    {complaint.originalOrderNumber && (
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <FileText className="h-5 w-5 text-slate-500" />
                        <span className="text-sm font-medium text-slate-900">
                          AB: {complaint.originalOrderNumber}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Betroffene Items */}
              {affectedItems.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h4 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                    <Package className="h-5 w-5 text-red-500" />
                    Betroffene Artikel ({affectedItems.length})
                  </h4>
                  <div className="space-y-2">
                    {affectedItems.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            Pos {item.position}: {item.description}
                          </p>
                          {item.manufacturer && (
                            <p className="text-xs text-slate-500">{item.manufacturer}</p>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notizen */}
              {(complaint.internalNotes || complaint.supplierNotes || complaint.customerNotes) && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h4 className="mb-4 text-lg font-bold text-slate-900">Notizen</h4>
                  <div className="space-y-4">
                    {complaint.internalNotes && (
                      <div>
                        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                          Intern
                        </p>
                        <p className="text-slate-700">{complaint.internalNotes}</p>
                      </div>
                    )}
                    {complaint.supplierNotes && (
                      <div>
                        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                          Lieferant
                        </p>
                        <p className="text-slate-700">{complaint.supplierNotes}</p>
                      </div>
                    )}
                    {complaint.customerNotes && (
                      <div>
                        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                          Kunde
                        </p>
                        <p className="text-slate-700">{complaint.customerNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'email' && (
            <ComplaintEmailGenerator
              complaint={complaint}
              project={project}
              affectedItems={affectedItems}
              onEmailSent={async (emailContent: string) => {
                await onUpdate({
                  emailContent,
                  emailSentAt: new Date().toISOString(),
                  status: 'reported',
                })
              }}
            />
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Reklamations-AB Upload */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h4 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                  <FileText className="h-5 w-5 text-red-500" />
                  Reklamations-AB
                </h4>
                {complaint.abDocumentUrl ? (
                  <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">AB hochgeladen</p>
                        <p className="text-xs text-green-700">
                          {complaint.abConfirmedAt
                            ? new Date(complaint.abConfirmedAt).toLocaleDateString('de-DE')
                            : ''}
                        </p>
                      </div>
                    </div>
                    <a
                      href={complaint.abDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-green-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-green-600"
                    >
                      Öffnen
                    </a>
                  </div>
                ) : (
                  <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <Upload className="mx-auto mb-3 h-12 w-12 text-slate-400" />
                    <p className="mb-2 font-medium text-slate-900">Reklamations-AB hochladen</p>
                    <p className="mb-4 text-sm text-slate-500">
                      Laden Sie die AB des Lieferanten hoch
                    </p>
                    <label className="inline-block cursor-pointer rounded-lg bg-red-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-red-600">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={handleUploadAB}
                      />
                      Datei auswählen
                    </label>
                  </div>
                )}
              </div>

              {/* Ursprüngliche AB */}
              {complaint.originalOrderNumber && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h4 className="mb-4 text-lg font-bold text-slate-900">Ursprüngliche AB</h4>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <p className="font-medium text-slate-900">
                        AB-Nummer: {complaint.originalOrderNumber}
                      </p>
                      {project && (
                        <p className="text-xs text-slate-500">Projekt: {project.orderNumber}</p>
                      )}
                    </div>
                    {project && (
                      <button
                        onClick={handleOpenProject}
                        className="rounded-lg bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-300"
                      >
                        Zum Projekt
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ComplaintDetailModal
