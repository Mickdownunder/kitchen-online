'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  UserPlus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import {
  CustomerProject,
  ProjectStatus,
  ProjectDocument,
} from '@/types'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import { calculateMarginOnlyWithPurchase } from '@/lib/utils/priceCalculations'
import { logger } from '@/lib/utils/logger'
import ProjectModal from '../ProjectModal'
import CustomerDeliveryNoteModal from '../CustomerDeliveryNoteModal'
import MeasurementDateModal from '../MeasurementDateModal'
import InstallationDateModal from '../InstallationDateModal'
import DeliveryDateModal from '../DeliveryDateModal'
import { useProjectFilters } from '@/hooks/useProjectFilters'
import { useGroupedProjects } from '@/hooks/useGroupedProjects'
import { useProjectModals } from '@/hooks/useProjectModals'
import { useProjectData } from '@/hooks/useProjectData'
import { useProjectWorkflow } from '@/hooks/useProjectWorkflow'
import { ProjectRow } from '@/components/projects/ProjectRow'
import { useToast } from '@/components/providers/ToastProvider'
import { useApp } from '@/app/providers'
import { LeadRow, LeadModal } from '@/components/leads'
import { ProjectListToolbar } from '@/components/projects/ProjectListToolbar'
import { ProjectListStats } from '@/components/projects/ProjectListStats'
import { ProjectListTable } from '@/components/projects/ProjectListTable'
import {
  ProjectListFilterType,
  ProjectSortField,
} from '@/components/projects/projectList.types'

interface ProjectListProps {
  projects: CustomerProject[]
  onAddProject: (_project: CustomerProject) => void
  onUpdateProject: (_project: CustomerProject) => void
  onDeleteProject: (_id: string) => void
  initialFilter?: 'all' | 'measurement' | 'order' | 'installation' | 'material_risk'
  initialOpenProjectId?: string | null
}

export const ProjectListContainer: React.FC<ProjectListProps> = ({
  projects,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  initialFilter = 'all',
  initialOpenProjectId = null,
}) => {
  const { success, error, warning } = useToast()
  const { refreshDeliveryNotes } = useApp()

  // Extracted hooks
  const { customers, invoices, complaintsByProject } = useProjectData()
  const { applyOverrides, scheduleUpdate, toggleStep } = useProjectWorkflow({ onUpdateProject: onUpdateProject })
  const modals = useProjectModals()
  const { openProjectModal } = modals

  // ==========================================================================
  // UI State
  // ==========================================================================
  const [activeTab, setActiveTab] = useState<'leads' | 'orders'>('orders')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<ProjectListFilterType>(
    initialFilter,
  )
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(new Date().getMonth() + 1)
  const [isScanning, setIsScanning] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [visibleRows, setVisibleRows] = useState(200)
  const [sortField, setSortField] = useState<ProjectSortField>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (initialFilter) {
      setFilterType(initialFilter)
    }
  }, [initialFilter])

  // Deep-link support
  useEffect(() => {
    if (!initialOpenProjectId) return
    const p = projects.find(pr => pr.id === initialOpenProjectId)
    if (p) {
      openProjectModal(p)
    }
  }, [initialOpenProjectId, projects, openProjectModal])

  // ==========================================================================
  // Memoized project counts and filtering (performance optimization)
  // ==========================================================================
  const { leadsCount, ordersCount } = useMemo(() => {
    let leads = 0
    let orders = 0
    projects.forEach(p => {
      const statusStr = String(p.status)
      const isLead = statusStr === ProjectStatus.LEAD || statusStr === 'Lead'
      if (isLead) {
        leads++
      } else {
        orders++
      }
    })
    return { leadsCount: leads, ordersCount: orders }
  }, [projects])

  // Filter by tab (Leads vs Orders) - memoized to avoid recalculation on every render
  const tabFilteredProjects = useMemo(() => {
    return projects.filter(p => {
      const statusStr = String(p.status)
      const isLead = statusStr === ProjectStatus.LEAD || statusStr === 'Lead'
      return activeTab === 'leads' ? isLead : !isLead
    })
  }, [projects, activeTab])

  const { filteredProjects, availableYears } = useProjectFilters({
    projects: tabFilteredProjects,
    searchTerm,
    filterType,
    selectedYear,
    selectedMonth,
  })

  // Für Monats-Tab-Counts: Projekte nur nach Jahr filtern (nicht nach Monat)
  const { filteredProjects: projectsForMonthCounts } = useProjectFilters({
    projects: tabFilteredProjects,
    searchTerm,
    filterType,
    selectedYear,
    selectedMonth: 'all', // Immer alle Monate für die Zählung
  })

  const handleSort = (field: ProjectSortField) => {
    if (sortField === field) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedProjects = useMemo(() => {
    const sorted = [...filteredProjects]
    const getProjectDate = (p: CustomerProject) =>
      p.orderDate || p.measurementDate || p.offerDate || p.createdAt || ''
    sorted.sort((a, b) => {
      let cmp = 0
      if (sortField === 'customerName') {
        cmp = (a.customerName || '').localeCompare(b.customerName || '')
      } else if (sortField === 'orderNumber') {
        cmp = (a.orderNumber || '').localeCompare(b.orderNumber || '')
      } else if (sortField === 'date') {
        const da = new Date(getProjectDate(a)).getTime()
        const db = new Date(getProjectDate(b)).getTime()
        cmp = da - db
      } else if (sortField === 'totalAmount') {
        cmp = (a.totalAmount || 0) - (b.totalAmount || 0)
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [filteredProjects, sortField, sortDirection])

  // Keep rendering fast with large datasets: paginate rendered rows
  useEffect(() => {
    setVisibleRows(200)
  }, [searchTerm, filterType, selectedYear, selectedMonth, sortField, sortDirection])

  // Gruppiere nach Monat für die horizontalen Tabs (immer alle Monate zählen, unabhängig von selectedMonth)
  const projectsByMonth = useMemo(() => {
    const months: Map<number, CustomerProject[]> = new Map()
    for (let i = 1; i <= 12; i++) {
      months.set(i, [])
    }
    if (selectedYear !== 'all') {
      projectsForMonthCounts.forEach(project => {
        const projectDate = project.orderDate || project.measurementDate || project.offerDate || project.createdAt
        const date = projectDate ? new Date(projectDate) : new Date()
        if (date.getFullYear() === selectedYear) {
          const month = date.getMonth() + 1
          months.get(month)!.push(project)
        }
      })
    }
    return months
  }, [projectsForMonthCounts, selectedYear])

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Reset pagination when month changes
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedMonth, selectedYear])

  // Projekte für den aktuellen Monat mit Pagination
  const currentMonthProjects = useMemo(() => {
    if (selectedYear === 'all') return sortedProjects
    if (selectedMonth === 'all') return sortedProjects
    return projectsByMonth.get(selectedMonth as number) || []
  }, [projectsByMonth, selectedMonth, selectedYear, sortedProjects])

  const totalPages = Math.ceil(currentMonthProjects.length / itemsPerPage)
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return currentMonthProjects.slice(start, start + itemsPerPage)
  }, [currentMonthProjects, currentPage, itemsPerPage])

  // Legacy grouped projects for "all" mode
  const { groupedProjects, expandedGroups, toggleGroup } = useGroupedProjects(sortedProjects)

  // ==========================================================================
  // Memoized stats calculations for Stats Cards (performance optimization)
  // ==========================================================================
  const statsData = useMemo(() => {
    const totalRevenue = filteredProjects.reduce((sum, p) => sum + (p.totalAmount || 0), 0)
    let marginSum = 0
    let netWithPurchaseSum = 0
    filteredProjects.forEach(p => {
      const { margin, netWithPurchase, marginPercent } = calculateMarginOnlyWithPurchase(
        p.items || []
      )
      if (marginPercent != null) {
        marginSum += margin
        netWithPurchaseSum += netWithPurchase
      }
    })
    const margin = marginSum
    const marginPercent =
      netWithPurchaseSum > 0 ? (margin / netWithPurchaseSum) * 100 : null
    const completedCount = filteredProjects.filter(p => p.status === ProjectStatus.COMPLETED).length
    const completedPercent = filteredProjects.length > 0
      ? Math.round((completedCount / filteredProjects.length) * 100)
      : 0
    const averageAmount = filteredProjects.length > 0
      ? totalRevenue / filteredProjects.length
      : 0

    return {
      totalRevenue,
      margin,
      marginPercent: marginPercent ?? null,
      completedCount,
      completedPercent,
      averageAmount,
      projectCount: filteredProjects.length,
    }
  }, [filteredProjects])

  // Maps for invoice/delivery note status indicators (AN/SC)
  const invoicesByProject = useMemo(() => {
    const map = new Map<string, { hasPartial: boolean; hasFinal: boolean }>()
    for (const inv of invoices) {
      const existing = map.get(inv.projectId) || { hasPartial: false, hasFinal: false }
      if (inv.type === 'partial') existing.hasPartial = true
      if (inv.type === 'final') existing.hasFinal = true
      map.set(inv.projectId, existing)
    }
    return map
  }, [invoices])

  const quickUpdateStatus = (project: CustomerProject, updates: Partial<CustomerProject>) => {
    scheduleUpdate(project, updates)
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

          modals.openProjectModal(newProject as CustomerProject)
          success('Dokument erfolgreich gescannt')
        } catch (fetchError: unknown) {
          logger.error('KI-Scan Fehler', { component: 'ProjectList' }, fetchError as Error)
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
      logger.error('File upload error', { component: 'ProjectList' }, uploadError as Error)
      error(
        `Fehler beim Hochladen: ${uploadError instanceof Error ? uploadError.message : 'Unbekannter Fehler'}`
      )
      setIsScanning(false)
      event.target.value = ''
    }
  }

  // Lead-specific handlers
  const handleOpenLead = (lead: CustomerProject) => {
    modals.openLeadModal(lead)
  }

  const handleConvertLeadToOrder = (lead: CustomerProject) => {
    // Change status from Lead to Planung
    onUpdateProject({ ...lead, status: ProjectStatus.PLANNING })
    modals.closeLeadModal()
    success('Lead wurde zum Auftrag umgewandelt!')
    // Switch to orders tab to show the new order
    setActiveTab('orders')
  }

  const handleDeleteLead = (lead: CustomerProject) => {
    onDeleteProject(lead.id)
    modals.closeLeadModal()
    success('Lead wurde gelöscht')
  }

  const handleUpdateLeadNotes = (lead: CustomerProject, notes: string) => {
    onUpdateProject({ ...lead, notes })
  }

  return (
    <div className="animate-in slide-in-from-bottom-4 space-y-6 duration-700">
      <ProjectListToolbar
        isScanning={isScanning}
        state={{
          activeTab,
          filterType,
          searchTerm,
          selectedYear,
          selectedMonth,
        }}
        availableYears={availableYears}
        leadsCount={leadsCount}
        ordersCount={ordersCount}
        projectsByMonth={projectsByMonth}
        onFileUpload={handleFileUpload}
        onAddProject={() => modals.openAddProjectModal()}
        onShowLeads={() => {
          setActiveTab('leads')
          setSelectedYear('all')
          setSelectedMonth('all')
          setFilterType('all')
        }}
        onShowOrders={() => setActiveTab('orders')}
        onSearchTermChange={setSearchTerm}
        onYearChange={(value) => {
          setSelectedYear(value)
          if (value !== 'all') {
            setSelectedMonth('all')
          }
        }}
        onMonthChange={setSelectedMonth}
        onFilterTypeChange={setFilterType}
      />

      <ProjectListStats activeTab={activeTab} statsData={statsData} />

      {/* Leads Table - only shown when activeTab is 'leads' */}
      {activeTab === 'leads' && (
        <ProjectListTable>
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
        </ProjectListTable>
      )}

      {/* Lead Modal */}
      {modals.lead.lead && (
        <LeadModal
          lead={modals.lead.lead}
          isOpen={modals.lead.isOpen}
          onClose={modals.closeLeadModal}
          onConvertToOrder={() => handleConvertLeadToOrder(modals.lead.lead!)}
          onDelete={() => handleDeleteLead(modals.lead.lead!)}
          onUpdateNotes={(notes) => handleUpdateLeadNotes(modals.lead.lead!, notes)}
        />
      )}

      {/* Projects Table - only shown when activeTab is 'orders' */}
      {activeTab === 'orders' && (
      <ProjectListTable>
        {(selectedYear !== 'all' && selectedMonth !== 'all') ? (
          /* Einzelner Monat ausgewählt - Einfache Tabelle mit Pagination */
          currentMonthProjects.length > 0 ? (
            <div>
              {/* Header mit Monatszusammenfassung */}
              <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      {new Date(2000, (selectedMonth as number) - 1).toLocaleDateString('de-DE', { month: 'long' })} {selectedYear}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {currentMonthProjects.length} Auftrag{currentMonthProjects.length !== 1 ? 'e' : ''} • {formatCurrency(currentMonthProjects.reduce((sum, p) => sum + p.totalAmount, 0))} €
                    </p>
                  </div>
                  {totalPages > 1 && (
                    <div className="text-sm text-slate-500">
                      Seite {currentPage} von {totalPages}
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b-2 border-slate-200 bg-slate-50/50">
                    <tr>
                      <th
                        className="cursor-pointer px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100/50"
                        onClick={() => handleSort('customerName')}
                      >
                        <div className="flex items-center gap-2">
                          Kunde
                          {sortField === 'customerName' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-500" /> : <ArrowDown className="h-3 w-3 text-amber-500" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-400" />
                          )}
                        </div>
                      </th>
                      <th
                        className="cursor-pointer px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100/50"
                        onClick={() => handleSort('orderNumber')}
                      >
                        <div className="flex items-center gap-2">
                          Auftragsnummer
                          {sortField === 'orderNumber' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-500" /> : <ArrowDown className="h-3 w-3 text-amber-500" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-400" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">Status</th>
                      <th
                        className="cursor-pointer px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100/50"
                        onClick={() => handleSort('date')}
                      >
                        <div className="flex items-center gap-2">
                          Datum
                          {sortField === 'date' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-500" /> : <ArrowDown className="h-3 w-3 text-amber-500" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-400" />
                          )}
                        </div>
                      </th>
                      <th
                        className="cursor-pointer px-6 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100/50"
                        onClick={() => handleSort('totalAmount')}
                      >
                        <div className="flex items-end justify-end gap-2">
                          Betrag
                          {sortField === 'totalAmount' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-500" /> : <ArrowDown className="h-3 w-3 text-amber-500" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-400" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">Workflow</th>
                      <th className="px-6 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProjects.map((project, idx) => {
                      const p = applyOverrides(project)
                      return (
                        <ProjectRow
                          key={project.id}
                          project={p}
                          isDropdownOpen={openDropdownId === project.id}
                          onOpen={() => modals.openProjectModal(project)}
                          onEdit={e => { e.stopPropagation(); modals.openProjectModal(project) }}
                          onToggleDropdown={e => { e.stopPropagation(); setOpenDropdownId(openDropdownId === project.id ? null : project.id) }}
                          onSelectStatus={(e, s) => { e.stopPropagation(); quickUpdateStatus(project, { status: s }); setOpenDropdownId(null) }}
                          onOpenMeasurementModal={e => {
                            e.stopPropagation()
                            const currentProject = applyOverrides(project)
                            if (currentProject.measurementDate) toggleStep(project, 'measured', e)
                            else modals.openMeasurementModal(project)
                          }}
                          onToggleOrdered={e => toggleStep(project, 'ordered', e)}
                          onOpenDeliveryNote={async e => { e.stopPropagation(); await modals.openDeliveryNoteModal(project) }}
                          onOpenInstallationModal={e => {
                            e.stopPropagation()
                            const currentProject = applyOverrides(project)
                            if (currentProject.installationDate) toggleStep(project, 'installation', e)
                            else modals.openInstallationModal(project)
                          }}
                          onOpenAbholungModal={p.deliveryType === 'pickup' ? e => { e.stopPropagation(); modals.openAbholungModal(project) } : undefined}
                          onToggleCompleted={e => toggleStep(project, 'completed', e)}
                          formatCurrency={formatCurrency}
                          formatDate={formatDate}
                          getStatusColor={getStatusColor}
                          complaintCount={complaintsByProject.get(project.id)}
                          hasPartialInvoice={invoicesByProject.get(project.id)?.hasPartial}
                          hasFinalInvoice={invoicesByProject.get(project.id)?.hasFinal}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                          rowSeparator
                        />
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t-2 border-slate-200 bg-slate-50/80 px-6 py-4">
                  <div className="text-sm text-slate-600">
                    Zeige {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, currentMonthProjects.length)} von {currentMonthProjects.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ««
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      «
                    </button>
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`rounded-lg px-3 py-2 text-sm font-bold transition-all ${
                            currentPage === pageNum
                              ? 'bg-amber-500 text-white shadow-md'
                              : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      »
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      »»
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 text-center">
              <AlertCircle className="mx-auto mb-4 h-16 w-16 text-slate-200" />
              <h3 className="text-xl font-black uppercase tracking-tighter text-slate-300">
                Keine Aufträge in {new Date(2000, (selectedMonth as number) - 1).toLocaleDateString('de-DE', { month: 'long' })}
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Wählen Sie einen anderen Monat oder erstellen Sie einen neuen Auftrag
              </p>
            </div>
          )
        ) : groupedProjects.length > 0 ? (
          /* "Alle" ausgewählt - Gruppierte Ansicht mit Akkordeons */
          <div className="divide-y divide-slate-100">
            {(() => {
              let remaining = visibleRows
              return groupedProjects.map(([groupKey, groupProjects]) => {
                const [year, month] = groupKey.split('-')
                const monthName = new Date(2000, parseInt(month) - 1).toLocaleDateString('de-DE', { month: 'long' })
                const isExpanded = expandedGroups.has(groupKey)
                const totalAmount = groupProjects.reduce((sum, p) => sum + p.totalAmount, 0)
                const renderCount = isExpanded ? Math.min(groupProjects.length, Math.max(0, remaining)) : 0
                const groupProjectsToRender = isExpanded ? groupProjects.slice(0, renderCount) : []
                remaining -= renderCount

                return (
                  <div key={groupKey} className="bg-white/50">
                    <button
                      onClick={() => toggleGroup(groupKey)}
                      className="flex w-full items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50/50"
                    >
                      <div className="flex items-center gap-4">
                        {isExpanded ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                        <div className="text-left">
                          <h3 className="text-lg font-black text-slate-900">{monthName} {year}</h3>
                          <p className="text-xs text-slate-500">
                            {groupProjects.length} Auftrag{groupProjects.length !== 1 ? 'e' : ''} • {formatCurrency(totalAmount)} €
                          </p>
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="border-y-2 border-slate-200 bg-slate-50/50">
                            <tr>
                              <th className="cursor-pointer px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100/50" onClick={() => handleSort('customerName')}>
                                <div className="flex items-center gap-2">
                                  Kunde
                                  {sortField === 'customerName' ? (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-500" /> : <ArrowDown className="h-3 w-3 text-amber-500" />) : <ArrowUpDown className="h-3 w-3 text-slate-400" />}
                                </div>
                              </th>
                              <th className="cursor-pointer px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100/50" onClick={() => handleSort('orderNumber')}>
                                <div className="flex items-center gap-2">
                                  Auftragsnummer
                                  {sortField === 'orderNumber' ? (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-500" /> : <ArrowDown className="h-3 w-3 text-amber-500" />) : <ArrowUpDown className="h-3 w-3 text-slate-400" />}
                                </div>
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">Status</th>
                              <th className="cursor-pointer px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100/50" onClick={() => handleSort('date')}>
                                <div className="flex items-center gap-2">
                                  Datum
                                  {sortField === 'date' ? (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-500" /> : <ArrowDown className="h-3 w-3 text-amber-500" />) : <ArrowUpDown className="h-3 w-3 text-slate-400" />}
                                </div>
                              </th>
                              <th className="cursor-pointer px-6 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100/50" onClick={() => handleSort('totalAmount')}>
                                <div className="flex items-end justify-end gap-2">
                                  Betrag
                                  {sortField === 'totalAmount' ? (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-500" /> : <ArrowDown className="h-3 w-3 text-amber-500" />) : <ArrowUpDown className="h-3 w-3 text-slate-400" />}
                                </div>
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">Workflow</th>
                              <th className="px-6 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">Aktionen</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupProjectsToRender.map((project, idx) => {
                              const p = applyOverrides(project)
                              return (
                                <ProjectRow
                                  key={project.id}
                                  project={p}
                                  isDropdownOpen={openDropdownId === project.id}
                                  onOpen={() => modals.openProjectModal(project)}
                                  onEdit={e => { e.stopPropagation(); modals.openProjectModal(project) }}
                                  onToggleDropdown={e => { e.stopPropagation(); setOpenDropdownId(openDropdownId === project.id ? null : project.id) }}
                                  onSelectStatus={(e, s) => { e.stopPropagation(); quickUpdateStatus(project, { status: s }); setOpenDropdownId(null) }}
                                  onOpenMeasurementModal={e => {
                                    e.stopPropagation()
                                    const currentProject = applyOverrides(project)
                                    if (currentProject.measurementDate) toggleStep(project, 'measured', e)
                                    else modals.openMeasurementModal(project)
                                  }}
                                  onToggleOrdered={e => toggleStep(project, 'ordered', e)}
                                  onOpenDeliveryNote={async e => { e.stopPropagation(); await modals.openDeliveryNoteModal(project) }}
                                  onOpenInstallationModal={e => {
                                    e.stopPropagation()
                                    const currentProject = applyOverrides(project)
                                    if (currentProject.installationDate) toggleStep(project, 'installation', e)
                                    else modals.openInstallationModal(project)
                                  }}
                                  onOpenAbholungModal={p.deliveryType === 'pickup' ? e => { e.stopPropagation(); modals.openAbholungModal(project) } : undefined}
                                  onToggleCompleted={e => toggleStep(project, 'completed', e)}
                                  formatCurrency={formatCurrency}
                                  formatDate={formatDate}
                                  getStatusColor={getStatusColor}
                                  complaintCount={complaintsByProject.get(project.id)}
                                  hasPartialInvoice={invoicesByProject.get(project.id)?.hasPartial}
                                  hasFinalInvoice={invoicesByProject.get(project.id)?.hasFinal}
                                  className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                                  rowSeparator
                                />
                              )
                            })}

                            {groupProjects.length > groupProjectsToRender.length && (
                              <tr>
                                <td colSpan={7} className="px-6 py-4">
                                  <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                                    <div className="text-sm text-slate-600">
                                      Noch <span className="font-black text-slate-900">{groupProjects.length - groupProjectsToRender.length}</span> weitere in {monthName} {year}
                                    </div>
                                    <button
                                      onClick={e => { e.stopPropagation(); setVisibleRows(v => v + 200) }}
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
            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-300">Keine Aufträge gefunden</h3>
            <p className="mt-2 text-sm text-slate-400">Passen Sie die Filter an oder erstellen Sie einen neuen Auftrag</p>
          </div>
        )}
      </ProjectListTable>
      )}


      {/* Modal */}
      {(modals.project.editingProject || modals.project.isAdding) && (
        <ProjectModal
          project={modals.project.editingProject || undefined}
          existingProjects={projects}
          existingCustomers={customers}
          onClose={modals.closeProjectModal}
          onSave={p => {
            if (modals.project.editingProject?.id) {
              onUpdateProject(p)
              success('Projekt erfolgreich aktualisiert')
            } else {
              onAddProject(p)
              success('Projekt erfolgreich erstellt')
            }
            modals.closeProjectModal()
          }}
          onDelete={id => {
            onDeleteProject(id)
            success('Projekt erfolgreich gelöscht')
            modals.closeProjectModal()
          }}
        />
      )}

      {/* Customer Delivery Note Modal */}
      {modals.deliveryNote.isOpen && modals.deliveryNote.project && (
        <CustomerDeliveryNoteModal
          project={modals.deliveryNote.project}
          existingDeliveryNote={modals.deliveryNote.existingNote ?? undefined}
          onClose={modals.closeDeliveryNoteModal}
          onSuccess={async () => {
            onUpdateProject(modals.deliveryNote.project!)
            // Aktualisiere die Delivery Notes Liste, damit der neue Lieferschein sofort sichtbar ist
            await refreshDeliveryNotes()
            success('Lieferschein erfolgreich erstellt')
            modals.closeDeliveryNoteModal()
          }}
        />
      )}

      {/* Measurement Date Modal */}
      {modals.measurement.isOpen && modals.measurement.project && (
        <MeasurementDateModal
          project={modals.measurement.project}
          onUpdateProject={onUpdateProject}
          onClose={modals.closeMeasurementModal}
          onSuccess={() => {
            success('Aufmaß-Datum erfolgreich gespeichert')
            modals.closeMeasurementModal()
          }}
        />
      )}

      {/* Installation Date Modal */}
      {modals.installation.isOpen && modals.installation.project && (
        <InstallationDateModal
          project={modals.installation.project}
          onUpdateProject={onUpdateProject}
          onClose={modals.closeInstallationModal}
          onSuccess={() => {
            success('Montage-Datum erfolgreich gespeichert')
            modals.closeInstallationModal()
          }}
        />
      )}

      {/* Abholung Date Modal (für Abholer) */}
      {modals.abholung.isOpen && modals.abholung.project && (
        <DeliveryDateModal
          project={modals.abholung.project}
          onUpdateProject={onUpdateProject}
          onClose={modals.closeAbholungModal}
          onSuccess={() => {
            success('Abholung-Datum gespeichert')
            modals.closeAbholungModal()
          }}
        />
      )}
    </div>
  )
}

export default ProjectListContainer
