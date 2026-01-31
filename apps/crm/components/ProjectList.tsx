'use client'

import React, { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Ruler,
  ShoppingCart,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Truck,
  ChevronDown,
  ChevronRight,
  Calendar,
  DollarSign,
  Percent,
  Package,
  UserPlus,
  Briefcase,
} from 'lucide-react'
import {
  CustomerProject,
  ProjectStatus,
  ProjectDocument,
  Customer,
  CustomerDeliveryNote,
} from '@/types'
import ProjectModal from './ProjectModal'
import { getCustomers, getComplaints } from '@/lib/supabase/services'
import CustomerDeliveryNoteModal from './CustomerDeliveryNoteModal'
import MeasurementDateModal from './MeasurementDateModal'
import InstallationDateModal from './InstallationDateModal'
import DeliveryDateModal from './DeliveryDateModal'
import { getCustomerDeliveryNotes } from '@/lib/supabase/services'
import { useProjectFilters } from '@/hooks/useProjectFilters'
import { useGroupedProjects } from '@/hooks/useGroupedProjects'
import { ProjectRow } from '@/components/projects/ProjectRow'
import { useToast } from '@/components/providers/ToastProvider'
import { useApp } from '@/app/providers'
import { LeadRow, LeadModal } from '@/components/leads'

interface ProjectListProps {
  projects: CustomerProject[]
  onAddProject: (_project: CustomerProject) => void
  onUpdateProject: (_project: CustomerProject) => void
  onDeleteProject: (_id: string) => void
  initialFilter?: 'all' | 'measurement' | 'order' | 'installation'
  initialOpenProjectId?: string | null
}

const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  initialFilter = 'all',
  initialOpenProjectId = null,
}) => {
  const { success, error, warning } = useToast()
  const { refreshDeliveryNotes } = useApp()
  const [activeTab, setActiveTab] = useState<'leads' | 'orders'>('orders')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'measurement' | 'order' | 'installation'>(
    initialFilter
  )
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(new Date().getMonth() + 1)
  const [isScanning, setIsScanning] = useState(false)
  const [editingProject, setEditingProject] = useState<CustomerProject | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  // expandedGroups is managed by useGroupedProjects(filteredProjects)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [showDeliveryNoteModal, setShowDeliveryNoteModal] = useState(false)
  const [selectedProjectForDeliveryNote, setSelectedProjectForDeliveryNote] =
    useState<CustomerProject | null>(null)
  const [existingDeliveryNote, setExistingDeliveryNote] = useState<CustomerDeliveryNote | null>(
    null
  )
  const [showMeasurementModal, setShowMeasurementModal] = useState(false)
  const [selectedProjectForMeasurement, setSelectedProjectForMeasurement] =
    useState<CustomerProject | null>(null)
  const [showInstallationModal, setShowInstallationModal] = useState(false)
  const [selectedProjectForInstallation, setSelectedProjectForInstallation] =
    useState<CustomerProject | null>(null)
  const [showAbholungModal, setShowAbholungModal] = useState(false)
  const [selectedProjectForAbholung, setSelectedProjectForAbholung] =
    useState<CustomerProject | null>(null)
  const [visibleRows, setVisibleRows] = useState(200)
  const [complaintsByProject, setComplaintsByProject] = useState<Map<string, number>>(new Map())
  
  // Lead-specific state
  const [selectedLead, setSelectedLead] = useState<CustomerProject | null>(null)
  const [showLeadModal, setShowLeadModal] = useState(false)

  useEffect(() => {
    loadCustomers()
    loadComplaints()
  }, [])

  const loadComplaints = async () => {
    try {
      // Performance: Nur offene Reklamationen laden (excludeResolved = true)
      // Resolved werden nicht mehr gezählt, da sie nicht mehr im aktiven Workflow sind
      const allComplaints = await getComplaints(undefined, true)
      const map = new Map<string, number>()
      allComplaints.forEach(c => {
        const count = map.get(c.projectId) || 0
        map.set(c.projectId, count + 1)
      })
      setComplaintsByProject(map)
    } catch (error: unknown) {
      // Ignore aborted requests (normal during page navigation)
      const errMessage = error instanceof Error ? error.message : ''
      const errName = error instanceof Error ? error.name : ''
      if (errMessage.includes('aborted') || errName === 'AbortError') {
        return
      }
      console.error('Error loading complaints:', error)
    }
  }

  useEffect(() => {
    if (initialFilter) {
      setFilterType(initialFilter)
    }
  }, [initialFilter])

  // Deep-link support: open a specific project when passed via URL (e.g. /projects?projectId=...)
  useEffect(() => {
    if (!initialOpenProjectId) return
    const p = projects.find(pr => pr.id === initialOpenProjectId)
    if (p) {
      setEditingProject(p)
      setIsAdding(false)
    }
  }, [initialOpenProjectId, projects])

  const loadCustomers = async () => {
    try {
      const data = await getCustomers()
      setCustomers(data)
    } catch (error: unknown) {
      // Ignore aborted requests (normal during page navigation)
      const errMessage = error instanceof Error ? error.message : ''
      const errName = error instanceof Error ? error.name : ''
      if (errMessage.includes('aborted') || errName === 'AbortError') {
        return
      }
      console.error('Error loading customers:', error)
    }
  }

  // Filter by tab first (Leads vs Orders)
  // Compare as string to handle both enum and raw DB values
  const tabFilteredProjects = projects.filter(p => {
    const statusStr = String(p.status)
    const isLead = statusStr === ProjectStatus.LEAD || statusStr === 'Lead'
    if (activeTab === 'leads') {
      return isLead
    } else {
      return !isLead
    }
  })

  // Count leads for badge
  const leadsCount = projects.filter(p => {
    const statusStr = String(p.status)
    return statusStr === ProjectStatus.LEAD || statusStr === 'Lead'
  }).length
  const ordersCount = projects.filter(p => {
    const statusStr = String(p.status)
    return statusStr !== ProjectStatus.LEAD && statusStr !== 'Lead'
  }).length

  const { filteredProjects, availableYears } = useProjectFilters({
    projects: tabFilteredProjects,
    searchTerm,
    filterType,
    selectedYear,
    selectedMonth,
  })

  // Keep rendering fast with large datasets: paginate rendered rows
  useEffect(() => {
    setVisibleRows(200)
  }, [searchTerm, filterType, selectedYear, selectedMonth])

  const { groupedProjects, expandedGroups, toggleGroup } = useGroupedProjects(filteredProjects)

  // Lokaler State für sofortige UI-Updates
  const [localProjects, setLocalProjects] = useState<Map<string, Partial<CustomerProject>>>(
    new Map()
  )
  const [updateTimeouts, setUpdateTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map())

  const getProjectWithLocalUpdates = (project: CustomerProject): CustomerProject => {
    const localUpdates = localProjects.get(project.id)
    return localUpdates ? { ...project, ...localUpdates } : project
  }

  // Debounced Update - speichert nur nach 500ms Pause
  const debouncedUpdate = (project: CustomerProject, updates: Partial<CustomerProject>) => {
    // Sofort lokalen State aktualisieren
    setLocalProjects(prev => {
      const newMap = new Map(prev)
      const existing = prev.get(project.id) || {}
      newMap.set(project.id, { ...existing, ...updates })
      return newMap
    })

    // Alten Timeout löschen falls vorhanden
    const existingTimeout = updateTimeouts.get(project.id)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Neuen Timeout setzen für DB-Update
    const timeout = setTimeout(() => {
      // Nur existierende DB-Felder updaten
      const dbUpdates: Partial<CustomerProject> = {}
      if (updates.isMeasured !== undefined) dbUpdates.isMeasured = updates.isMeasured
      if (updates.isOrdered !== undefined) dbUpdates.isOrdered = updates.isOrdered
      if (updates.isInstallationAssigned !== undefined)
        dbUpdates.isInstallationAssigned = updates.isInstallationAssigned
      if (updates.status !== undefined) dbUpdates.status = updates.status
      if (updates.measurementDate !== undefined) dbUpdates.measurementDate = updates.measurementDate
      if (updates.orderDate !== undefined) dbUpdates.orderDate = updates.orderDate
      if (updates.installationDate !== undefined)
        dbUpdates.installationDate = updates.installationDate

      if (Object.keys(dbUpdates).length > 0) {
        onUpdateProject({ ...project, ...dbUpdates })
      }

      // Timeout aus Map entfernen
      setUpdateTimeouts(prev => {
        const newMap = new Map(prev)
        newMap.delete(project.id)
        return newMap
      })
    }, 500)

    setUpdateTimeouts(prev => {
      const newMap = new Map(prev)
      newMap.set(project.id, timeout)
      return newMap
    })
  }

  const quickUpdateStatus = (project: CustomerProject, updates: Partial<CustomerProject>) => {
    debouncedUpdate(project, updates)
  }

  const toggleStep = (
    project: CustomerProject,
    step: 'measured' | 'ordered' | 'delivered' | 'installation' | 'completed',
    e: React.MouseEvent
  ) => {
    e.stopPropagation()

    const currentProject = getProjectWithLocalUpdates(project)
    const today = new Date().toISOString().split('T')[0]
    let updates: Partial<CustomerProject> = {}

    if (step === 'measured') {
      const newState = !currentProject.isMeasured
      updates = {
        isMeasured: newState,
        measurementDate: newState ? currentProject.measurementDate || today : undefined,
        status: newState ? ProjectStatus.MEASURING : ProjectStatus.PLANNING,
      }
    } else if (step === 'ordered') {
      const newState = !currentProject.isOrdered
      updates = {
        isOrdered: newState,
        orderDate: newState ? currentProject.orderDate || today : undefined,
        isMeasured: newState ? true : currentProject.isMeasured,
        status: newState ? ProjectStatus.ORDERED : ProjectStatus.MEASURING,
      }
    } else if (step === 'delivered') {
      const newState = !currentProject.isDelivered
      updates = {
        isDelivered: newState,
        deliveryDate: newState ? currentProject.deliveryDate || today : undefined,
        isOrdered: newState ? true : currentProject.isOrdered,
        isMeasured: newState ? true : currentProject.isMeasured,
        status: newState ? ProjectStatus.DELIVERY : ProjectStatus.ORDERED,
      }
    } else if (step === 'installation') {
      const newState = !currentProject.isInstallationAssigned
      updates = {
        isInstallationAssigned: newState,
        installationDate: newState ? currentProject.installationDate || today : undefined,
        isDelivered: newState ? true : currentProject.isDelivered,
        isOrdered: newState ? true : currentProject.isOrdered,
        isMeasured: newState ? true : currentProject.isMeasured,
        status: newState ? ProjectStatus.INSTALLATION : ProjectStatus.DELIVERY,
      }
    } else if (step === 'completed') {
      const newState = !currentProject.isCompleted
      updates = {
        isCompleted: newState,
        completionDate: newState ? currentProject.completionDate || today : undefined,
        isInstallationAssigned: newState ? true : currentProject.isInstallationAssigned,
        status: newState ? ProjectStatus.COMPLETED : ProjectStatus.INSTALLATION,
      }
    }

    // SOFORT lokalen State aktualisieren (instant!)
    setLocalProjects(prev => {
      const newMap = new Map(prev)
      const existing = prev.get(project.id) || {}
      newMap.set(project.id, { ...existing, ...updates })
      return newMap
    })

    // Debounced DB-Update (nur existierende Felder)
    const dbUpdates: Partial<CustomerProject> = {}
    if (updates.isMeasured !== undefined) dbUpdates.isMeasured = updates.isMeasured
    if (updates.isOrdered !== undefined) dbUpdates.isOrdered = updates.isOrdered
    if (updates.isInstallationAssigned !== undefined)
      dbUpdates.isInstallationAssigned = updates.isInstallationAssigned
    if (updates.status !== undefined) dbUpdates.status = updates.status
    if (updates.measurementDate !== undefined) dbUpdates.measurementDate = updates.measurementDate
    if (updates.orderDate !== undefined) dbUpdates.orderDate = updates.orderDate
    if (updates.installationDate !== undefined)
      dbUpdates.installationDate = updates.installationDate

    if (Object.keys(dbUpdates).length > 0) {
      debouncedUpdate(project, dbUpdates)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Dateigröße prüfen (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      warning('Datei ist zu groß. Maximale Größe: 20MB')
      event.target.value = ''
      return
    }

    setIsScanning(true)
    try {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = async () => {
        try {
          const result = reader.result as string
          const mimeType = result.split(',')[0].split(':')[1].split(';')[0]
          const base64 = result.split(',')[1]

          if (!base64) {
            throw new Error('Fehler beim Konvertieren der Datei')
          }

          const res = await fetch('/api/extract-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Data: base64, mimeType }),
          })

          if (!res.ok) {
            const errorData = await res.json()
            throw new Error(errorData.error || `API-Fehler: ${res.status}`)
          }

          const extracted = await res.json()

          // Prüfe ob ein Fehler in der Response ist
          if (extracted.error) {
            throw new Error(extracted.error)
          }

          const sourceDoc: ProjectDocument = {
            id: 'scan-' + Date.now(),
            name: `Scan_${file.name}`,
            mimeType: file.type,
            data: result,
            uploadedAt: new Date().toLocaleDateString('de-DE'),
          }

          const newProject: Partial<CustomerProject> = {
            ...extracted,
            id: undefined,
            status: ProjectStatus.PLANNING,
            complaints: [],
            documents: [sourceDoc],
            items: [],
            totalAmount: extracted.totalAmount || 0,
            netAmount: 0,
            taxAmount: 0,
            depositAmount: 0,
            isDepositPaid: false,
            isFinalPaid: false,
            isMeasured: false,
            isOrdered: false,
            isInstallationAssigned: false,
          }

          setEditingProject(newProject as CustomerProject)
          success('Dokument erfolgreich gescannt')
        } catch (fetchError: unknown) {
          console.error('KI-Scan Fehler:', fetchError)
          error(
            `KI-Scan fehlgeschlagen: ${fetchError instanceof Error ? fetchError.message : 'Unbekannter Fehler'}`
          )
        }
      }

      reader.onerror = () => {
        setIsScanning(false)
        error('Fehler beim Lesen der Datei')
        event.target.value = ''
      }
    } catch (uploadError: unknown) {
      console.error('File upload error:', uploadError)
      error(
        `Fehler beim Hochladen: ${uploadError instanceof Error ? uploadError.message : 'Unbekannter Fehler'}`
      )
      setIsScanning(false)
      event.target.value = ''
    }
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  // Lead-specific handlers
  const handleOpenLead = (lead: CustomerProject) => {
    setSelectedLead(lead)
    setShowLeadModal(true)
  }

  const handleConvertLeadToOrder = (lead: CustomerProject) => {
    // Change status from Lead to Planung
    onUpdateProject({ ...lead, status: ProjectStatus.PLANNING })
    setShowLeadModal(false)
    setSelectedLead(null)
    success('Lead wurde zum Auftrag umgewandelt!')
    // Switch to orders tab to show the new order
    setActiveTab('orders')
  }

  const handleDeleteLead = (lead: CustomerProject) => {
    onDeleteProject(lead.id)
    setShowLeadModal(false)
    setSelectedLead(null)
    success('Lead wurde gelöscht')
  }

  const handleUpdateLeadNotes = (lead: CustomerProject, notes: string) => {
    onUpdateProject({ ...lead, notes })
  }

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.LEAD:
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case ProjectStatus.COMPLETED:
        return 'bg-green-100 text-green-700 border-green-200'
      case ProjectStatus.COMPLAINT:
        return 'bg-red-100 text-red-700 border-red-200'
      case ProjectStatus.INSTALLATION:
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case ProjectStatus.ORDERED:
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case ProjectStatus.MEASURING:
        return 'bg-indigo-100 text-indigo-700 border-indigo-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  return (
    <div className="animate-in slide-in-from-bottom-4 space-y-6 duration-700">
      {/* Header */}
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h2 className="mb-2 text-5xl font-black tracking-tighter text-slate-900">Aufträge</h2>
          <p className="font-medium text-slate-500">Übersichtliche Verwaltung aller Projekte</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="group flex cursor-pointer items-center gap-3 rounded-2xl bg-slate-900 px-6 py-3 text-white shadow-lg transition-all hover:bg-slate-800 active:scale-95">
            {isScanning ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <FileText className="h-5 w-5 transition-transform group-hover:rotate-12" />
            )}
            <span className="text-xs font-black uppercase tracking-widest">
              {isScanning ? 'Verarbeite...' : 'KI-Scan'}
            </span>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isScanning}
            />
          </label>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-900 shadow-xl shadow-amber-500/30 transition-all hover:from-amber-600 hover:to-amber-700 active:scale-95"
          >
            <Plus className="h-5 w-5" />
            Neuer Auftrag
          </button>
        </div>
      </div>

      {/* Tabs: Leads vs Aufträge */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setActiveTab('leads')
            // Reset filters for leads - show all leads regardless of date
            setSelectedYear('all')
            setSelectedMonth('all')
            setFilterType('all')
          }}
          className={`flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold transition-all ${
            activeTab === 'leads'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30'
              : 'bg-white text-slate-600 shadow-md hover:bg-slate-50'
          }`}
        >
          <UserPlus className="h-5 w-5" />
          Leads
          {leadsCount > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-black ${
              activeTab === 'leads' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
            }`}>
              {leadsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold transition-all ${
            activeTab === 'orders'
              ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg'
              : 'bg-white text-slate-600 shadow-md hover:bg-slate-50'
          }`}
        >
          <Briefcase className="h-5 w-5" />
          Aufträge
          {ordersCount > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-black ${
              activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {ordersCount}
            </span>
          )}
        </button>
      </div>

      {/* Stats Cards - Only for filtered projects */}
      {filteredProjects.length > 0 && activeTab === 'orders' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-blue-50/30 p-6 shadow-lg">
            <div className="mb-2 flex items-center gap-3">
              <DollarSign className="h-6 w-6 text-blue-600" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                Verkaufter Umsatz
              </p>
            </div>
            <p className="text-3xl font-black text-slate-900">
              {formatCurrency(filteredProjects.reduce((sum, p) => sum + (p.totalAmount || 0), 0))} €
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {filteredProjects.length} Projekt{filteredProjects.length !== 1 ? 'e' : ''}
            </p>
          </div>
          <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-amber-50/30 p-6 shadow-lg">
            <div className="mb-2 flex items-center gap-3">
              <Package className="h-6 w-6 text-amber-600" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                Projekte
              </p>
            </div>
            <p className="text-3xl font-black text-slate-900">{filteredProjects.length}</p>
            <p className="mt-1 text-xs text-slate-500">
              Ø{' '}
              {formatCurrency(
                filteredProjects.length > 0
                  ? filteredProjects.reduce((sum, p) => sum + (p.totalAmount || 0), 0) /
                      filteredProjects.length
                  : 0
              )}{' '}
              €
            </p>
          </div>
          <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-emerald-50/30 p-6 shadow-lg">
            <div className="mb-2 flex items-center gap-3">
              <Percent className="h-6 w-6 text-emerald-600" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                Durchschnittliche Marge
              </p>
            </div>
            {(() => {
              const totalNet = filteredProjects.reduce((sum, p) => sum + (p.netAmount || 0), 0)
              const totalPurchase = filteredProjects.reduce((acc, p) => {
                return (
                  acc +
                  p.items.reduce((sum, item) => {
                    const purchasePrice = item.purchasePricePerUnit || 0
                    const quantity = item.quantity || 1
                    return sum + purchasePrice * quantity
                  }, 0)
                )
              }, 0)
              const margin = totalNet - totalPurchase
              const marginPercent = totalNet > 0 ? (margin / totalNet) * 100 : 0
              return (
                <>
                  <p className="text-3xl font-black text-slate-900">{marginPercent.toFixed(1)}%</p>
                  <p className="mt-1 text-xs text-slate-500">{formatCurrency(margin)} €</p>
                </>
              )
            })()}
          </div>
          <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-purple-50/30 p-6 shadow-lg">
            <div className="mb-2 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-purple-600" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                Abgeschlossen
              </p>
            </div>
            <p className="text-3xl font-black text-slate-900">
              {filteredProjects.filter(p => p.status === ProjectStatus.COMPLETED).length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {filteredProjects.length > 0
                ? `${Math.round((filteredProjects.filter(p => p.status === ProjectStatus.COMPLETED).length / filteredProjects.length) * 100)}%`
                : '0%'}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Search */}
        <div className="glass flex flex-1 items-center rounded-2xl border border-white/50 bg-gradient-to-r from-white to-slate-50/30 p-2 shadow-lg">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Suche nach Kunde oder Auftragsnummer..."
              className="w-full border-none bg-transparent py-3 pl-12 pr-4 text-sm font-medium outline-none transition-colors placeholder:text-slate-400 focus:placeholder:text-slate-300"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Year Filter - only for Orders tab */}
        {activeTab === 'orders' && (
          <div className="glass flex items-center gap-2 rounded-2xl border border-white/50 bg-gradient-to-r from-white to-slate-50/30 p-2 shadow-lg">
            <Calendar className="h-4 w-4 text-slate-400" />
            <select
              value={selectedYear}
              onChange={e => {
                setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))
                if (e.target.value !== 'all') {
                  setSelectedMonth('all')
                }
              }}
              className="cursor-pointer border-none bg-transparent px-3 py-2 text-sm font-bold text-slate-900 outline-none"
            >
              <option value="all">Alle Jahre</option>
              {availableYears.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Month Filter - only for Orders tab and if year selected */}
        {activeTab === 'orders' && selectedYear !== 'all' && (
          <div className="glass flex items-center gap-2 rounded-2xl border border-white/50 bg-gradient-to-r from-white to-slate-50/30 p-2 shadow-lg">
            <select
              value={selectedMonth}
              onChange={e =>
                setSelectedMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))
              }
              className="cursor-pointer border-none bg-transparent px-3 py-2 text-sm font-bold text-slate-900 outline-none"
            >
              <option value="all">Alle Monate</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                <option key={month} value={month}>
                  {new Date(2000, month - 1).toLocaleDateString('de-DE', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status Filter - only for Orders tab */}
        {activeTab === 'orders' && (
          <div className="glass scrollbar-hide flex items-center gap-2 overflow-x-auto rounded-2xl border border-white/50 bg-gradient-to-r from-white to-slate-50/30 p-2 shadow-lg">
            <button
              onClick={() => setFilterType('all')}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${filterType === 'all' ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'}`}
            >
              Alle
            </button>
            <button
              onClick={() => setFilterType('measurement')}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${filterType === 'measurement' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'}`}
            >
              <Ruler className="h-3.5 w-3.5" /> Zu Ausmessen
            </button>
            <button
              onClick={() => setFilterType('order')}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${filterType === 'order' ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'}`}
            >
              <ShoppingCart className="h-3.5 w-3.5" /> Zu Bestellen
            </button>
            <button
              onClick={() => setFilterType('installation')}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${filterType === 'installation' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'}`}
            >
              <Truck className="h-3.5 w-3.5" /> Zu Terminieren
            </button>
          </div>
        )}
      </div>

      {/* Leads Table - only shown when activeTab is 'leads' */}
      {activeTab === 'leads' && (
        <div className="glass overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-br from-white to-slate-50/30 shadow-xl">
          {filteredProjects.length > 0 ? (
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                    Interessent
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                    Kontakt
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                    Termin
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-widest text-slate-500">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map(lead => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    onOpen={() => handleOpenLead(lead)}
                    onConvertToOrder={(e) => {
                      e.stopPropagation()
                      handleConvertLeadToOrder(lead)
                    }}
                    onDelete={(e) => {
                      e.stopPropagation()
                      handleDeleteLead(lead)
                    }}
                  />
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 rounded-full bg-amber-100 p-6">
                <UserPlus className="h-12 w-12 text-amber-500" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-slate-900">Keine Leads vorhanden</h3>
              <p className="max-w-md text-slate-500">
                Leads werden automatisch erstellt, wenn Kunden über Cal.com einen Termin buchen.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Lead Modal */}
      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          isOpen={showLeadModal}
          onClose={() => {
            setShowLeadModal(false)
            setSelectedLead(null)
          }}
          onConvertToOrder={() => handleConvertLeadToOrder(selectedLead)}
          onDelete={() => handleDeleteLead(selectedLead)}
          onUpdateNotes={(notes) => handleUpdateLeadNotes(selectedLead, notes)}
        />
      )}

      {/* Projects Table - only shown when activeTab is 'orders' */}
      {activeTab === 'orders' && (
      <div className="glass overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-br from-white to-slate-50/30 shadow-xl">
        {groupedProjects.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {(() => {
              let remaining = visibleRows
              return groupedProjects.map(([groupKey, groupProjects]) => {
                const [year, month] = groupKey.split('-')
                const monthName = new Date(2000, parseInt(month) - 1).toLocaleDateString('de-DE', {
                  month: 'long',
                })
                const isExpanded = expandedGroups.has(groupKey)
                const totalAmount = groupProjects.reduce((sum, p) => sum + p.totalAmount, 0)
                const renderCount = isExpanded
                  ? Math.min(groupProjects.length, Math.max(0, remaining))
                  : 0
                const groupProjectsToRender = isExpanded ? groupProjects.slice(0, renderCount) : []
                remaining -= renderCount

                return (
                  <div key={groupKey} className="bg-white/50">
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(groupKey)}
                      className="flex w-full items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50/50"
                    >
                      <div className="flex items-center gap-4">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-slate-400" />
                        )}
                        <div className="text-left">
                          <h3 className="text-lg font-black text-slate-900">
                            {monthName} {year}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {groupProjects.length} Auftrag{groupProjects.length !== 1 ? 'e' : ''} •{' '}
                            {formatCurrency(totalAmount)} €
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Group Content */}
                    {isExpanded && (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="border-t border-slate-100 bg-slate-50/50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                                Kunde
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                                Auftragsnummer
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                                Datum
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">
                                Betrag
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                                Workflow
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                                Aktionen
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {groupProjectsToRender.map(project => {
                              const p = getProjectWithLocalUpdates(project)
                              return (
                                <ProjectRow
                                  key={project.id}
                                  project={p}
                                  isDropdownOpen={openDropdownId === project.id}
                                  onOpen={() => setEditingProject(project)}
                                  onEdit={e => {
                                    e.stopPropagation()
                                    setEditingProject(project)
                                  }}
                                  onToggleDropdown={e => {
                                    e.stopPropagation()
                                    setOpenDropdownId(
                                      openDropdownId === project.id ? null : project.id
                                    )
                                  }}
                                  onSelectStatus={(e, s) => {
                                    e.stopPropagation()
                                    quickUpdateStatus(project, { status: s })
                                    setOpenDropdownId(null)
                                  }}
                                  onOpenMeasurementModal={e => {
                                    e.stopPropagation()
                                    const currentProject = getProjectWithLocalUpdates(project)
                                    if (currentProject.measurementDate) {
                                      // If date exists, toggle behavior
                                      toggleStep(project, 'measured', e)
                                    } else {
                                      // If no date, open modal
                                      setSelectedProjectForMeasurement(project)
                                      setShowMeasurementModal(true)
                                    }
                                  }}
                                  onToggleOrdered={e => toggleStep(project, 'ordered', e)}
                                  onOpenDeliveryNote={async e => {
                                    e.stopPropagation()
                                    try {
                                      const notes = await getCustomerDeliveryNotes(project.id)
                                      setExistingDeliveryNote(notes[0] || null)
                                      setSelectedProjectForDeliveryNote(project)
                                      setShowDeliveryNoteModal(true)
                                    } catch (error: unknown) {
                                      // Ignore aborted requests (normal during page navigation)
                                      const errMessage = error instanceof Error ? error.message : ''
                                      const errName = error instanceof Error ? error.name : ''
                                      if (
                                        errMessage.includes('aborted') ||
                                        errName === 'AbortError'
                                      ) {
                                        return
                                      }
                                      console.error('Error loading delivery notes:', error)
                                      setExistingDeliveryNote(null)
                                      setSelectedProjectForDeliveryNote(project)
                                      setShowDeliveryNoteModal(true)
                                    }
                                  }}
                                  onOpenInstallationModal={e => {
                                    e.stopPropagation()
                                    const currentProject = getProjectWithLocalUpdates(project)
                                    if (currentProject.installationDate) {
                                      toggleStep(project, 'installation', e)
                                    } else {
                                      setSelectedProjectForInstallation(project)
                                      setShowInstallationModal(true)
                                    }
                                  }}
                                  onOpenAbholungModal={
                                    p.deliveryType === 'pickup'
                                      ? e => {
                                          e.stopPropagation()
                                          setSelectedProjectForAbholung(project)
                                          setShowAbholungModal(true)
                                        }
                                      : undefined
                                  }
                                  onToggleCompleted={e => toggleStep(project, 'completed', e)}
                                  formatCurrency={formatCurrency}
                                  formatDate={formatDate}
                                  getStatusColor={getStatusColor}
                                  complaintCount={complaintsByProject.get(project.id)}
                                />
                              )
                            })}

                            {groupProjects.length > groupProjectsToRender.length && (
                              <tr>
                                <td colSpan={7} className="px-6 py-4">
                                  <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                                    <div className="text-sm text-slate-600">
                                      Noch{' '}
                                      <span className="font-black text-slate-900">
                                        {groupProjects.length - groupProjectsToRender.length}
                                      </span>{' '}
                                      weitere in {monthName} {year}
                                    </div>
                                    <button
                                      onClick={e => {
                                        e.stopPropagation()
                                        setVisibleRows(v => v + 200)
                                      }}
                                      className="rounded-xl bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-800"
                                    >
                                      Mehr laden
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })
            })()}
          </div>
        ) : (
          <div className="py-20 text-center">
            <AlertCircle className="mx-auto mb-4 h-16 w-16 text-slate-200" />
            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-300">
              Keine Aufträge gefunden
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Passen Sie die Filter an oder erstellen Sie einen neuen Auftrag
            </p>
          </div>
        )}
      </div>
      )}

      {activeTab === 'orders' && filteredProjects.length > visibleRows && (
        <div className="flex items-center justify-center">
          <button
            onClick={() => setVisibleRows(v => v + 400)}
            className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-900 shadow-sm transition-all hover:shadow-md"
          >
            Mehr Aufträge laden ({Math.min(400, filteredProjects.length - visibleRows)} weitere)
          </button>
        </div>
      )}

      {/* Modal */}
      {(editingProject || isAdding) && (
        <ProjectModal
          project={editingProject || undefined}
          existingProjects={projects}
          existingCustomers={customers}
          onClose={() => {
            setEditingProject(null)
            setIsAdding(false)
          }}
          onSave={p => {
            if (editingProject?.id) {
              onUpdateProject(p)
              success('Projekt erfolgreich aktualisiert')
            } else {
              onAddProject(p)
              success('Projekt erfolgreich erstellt')
            }
            setEditingProject(null)
            setIsAdding(false)
          }}
          onDelete={id => {
            onDeleteProject(id)
            success('Projekt erfolgreich gelöscht')
            setEditingProject(null)
          }}
        />
      )}

      {/* Customer Delivery Note Modal */}
      {showDeliveryNoteModal && selectedProjectForDeliveryNote && (
        <CustomerDeliveryNoteModal
          project={selectedProjectForDeliveryNote}
          existingDeliveryNote={existingDeliveryNote ?? undefined}
          onClose={() => {
            setShowDeliveryNoteModal(false)
            setSelectedProjectForDeliveryNote(null)
            setExistingDeliveryNote(null)
          }}
          onSuccess={async () => {
            onUpdateProject(selectedProjectForDeliveryNote)
            // Aktualisiere die Delivery Notes Liste, damit der neue Lieferschein sofort sichtbar ist
            await refreshDeliveryNotes()
            success('Lieferschein erfolgreich erstellt')
            setShowDeliveryNoteModal(false)
            setSelectedProjectForDeliveryNote(null)
            setExistingDeliveryNote(null)
          }}
        />
      )}

      {/* Measurement Date Modal */}
      {showMeasurementModal && selectedProjectForMeasurement && (
        <MeasurementDateModal
          project={selectedProjectForMeasurement}
          onUpdateProject={onUpdateProject}
          onClose={() => {
            setShowMeasurementModal(false)
            setSelectedProjectForMeasurement(null)
          }}
          onSuccess={() => {
            success('Aufmaß-Datum erfolgreich gespeichert')
            setShowMeasurementModal(false)
            setSelectedProjectForMeasurement(null)
          }}
        />
      )}

      {/* Installation Date Modal */}
      {showInstallationModal && selectedProjectForInstallation && (
        <InstallationDateModal
          project={selectedProjectForInstallation}
          onUpdateProject={onUpdateProject}
          onClose={() => {
            setShowInstallationModal(false)
            setSelectedProjectForInstallation(null)
          }}
          onSuccess={() => {
            success('Montage-Datum erfolgreich gespeichert')
            setShowInstallationModal(false)
            setSelectedProjectForInstallation(null)
          }}
        />
      )}

      {/* Abholung Date Modal (für Abholer) */}
      {showAbholungModal && selectedProjectForAbholung && (
        <DeliveryDateModal
          project={selectedProjectForAbholung}
          onUpdateProject={onUpdateProject}
          onClose={() => {
            setShowAbholungModal(false)
            setSelectedProjectForAbholung(null)
          }}
          onSuccess={() => {
            success('Abholung-Datum gespeichert')
            setShowAbholungModal(false)
            setSelectedProjectForAbholung(null)
          }}
        />
      )}
    </div>
  )
}

export default ProjectList
