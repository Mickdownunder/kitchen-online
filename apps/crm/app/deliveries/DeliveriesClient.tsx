'use client'

import React from 'react'
import {
  Package,
  Truck,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FolderOpen,
  Upload,
  Eye,
  RefreshCw,
} from 'lucide-react'
import { StatCard } from '@/components/ui'
import { DeliveryNote, CustomerDeliveryNote } from '@/types'
import DeliveryNoteUpload from '@/components/DeliveryNoteUpload'
import DeliveryNoteDetail from '@/components/DeliveryNoteDetail'
import CustomerDeliveryNoteViewModal from '@/components/CustomerDeliveryNoteViewModal'
import {
  useDeliveryFilters,
  formatGroupLabel,
  supplierStatuses,
  customerStatuses,
} from './useDeliveryFilters'

export default function DeliveriesClient() {
  const {
    projects,
    supplierDeliveryNotes,
    customerDeliveryNotes,
    refreshDeliveryNotes,
    projectsIndex,
    activeTab,
    setActiveTab,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    yearsAvailable,
    sortField,
    sortDirection,
    handleSort,
    showUpload,
    setShowUpload,
    visibleCount,
    setVisibleCount,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    totalPages,
    expandedYears,
    setExpandedYears,
    selectedSupplierNote,
    setSelectedSupplierNote,
    selectedCustomerNote,
    setSelectedCustomerNote,
    filteredSupplier,
    filteredCustomer,
    deliveriesByMonth,
    currentMonthDeliveries,
    paginatedDeliveries,
    grouped,
    totalFilteredCount,
    openProject,
    loading,
  } = useDeliveryFilters()

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Lieferscheine</h1>
          <p className="mt-1 text-slate-600">
            Getrennt nach <strong>Lieferanten</strong> und <strong>Kunden</strong> — filterbar nach
            Jahr/Monat/Status, ideal bei 400+ Einträgen.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshDeliveryNotes()}
            disabled={loading}
            className="rounded-2xl bg-slate-100 p-3 text-slate-600 transition-all hover:bg-slate-200 disabled:opacity-50"
            title="Daten aktualisieren"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {activeTab === 'supplier' && (
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-slate-800"
            >
              <Upload className="h-4 w-4" /> Upload & Analyse
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex w-fit items-center gap-2 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-inner">
        <button
          onClick={() => { setActiveTab('supplier'); setStatusFilter('all') }}
          className={`flex items-center gap-2 rounded-xl px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'supplier'
              ? 'bg-amber-500 text-slate-900 shadow-lg'
              : 'text-slate-400 hover:text-slate-900'
          }`}
        >
          <Package className="h-3 w-3" /> Lieferanten ({supplierDeliveryNotes.length})
        </button>
        <button
          onClick={() => { setActiveTab('customer'); setStatusFilter('all') }}
          className={`flex items-center gap-2 rounded-xl px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'customer'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-900'
          }`}
        >
          <Truck className="h-3 w-3" /> Kunden ({customerDeliveryNotes.length})
        </button>
      </div>

      {/* Stats */}
      {(filteredSupplier.length > 0 || filteredCustomer.length > 0) && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Package} iconColor="amber" value={filteredSupplier.length} label="Lieferanten-Lieferscheine" subtitle={`${filteredSupplier.filter(n => n.matchedProjectId).length} zugeordnet`} tint="amber" />
          <StatCard icon={Truck} iconColor="blue" value={filteredCustomer.length} label="Kunden-Lieferscheine" subtitle={`${filteredCustomer.filter(n => n.status === 'completed' || n.status === 'signed').length} abgeschlossen`} tint="blue" />
          <StatCard icon={FolderOpen} iconColor="slate" value={filteredSupplier.length + filteredCustomer.length} label="Gesamt" subtitle={`${activeTab === 'supplier' ? 'Lieferanten' : 'Kunden'} gefiltert`} tint="slate" />
          <StatCard
            icon={Eye}
            iconColor="emerald"
            value={(() => {
              const currentList = activeTab === 'supplier' ? filteredSupplier : filteredCustomer
              return currentList.filter(n =>
                (activeTab === 'supplier' && n.status === 'completed') ||
                (activeTab === 'customer' && (n.status === 'completed' || n.status === 'signed'))
              ).length
            })()}
            label="Status-Verteilung"
            subtitle={(() => {
              const currentList = activeTab === 'supplier' ? filteredSupplier : filteredCustomer
              const total = currentList.length
              const completed = currentList.filter(n =>
                (activeTab === 'supplier' && n.status === 'completed') ||
                (activeTab === 'customer' && (n.status === 'completed' || n.status === 'signed'))
              ).length
              return total > 0 ? `${Math.round((completed / total) * 100)}% abgeschlossen` : '0%'
            })()}
            tint="emerald"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={activeTab === 'supplier' ? 'Suche: Lieferant, Nummer, Projekt-ID…' : 'Suche: Kunde, Nummer, Projekt-ID…'}
              className="w-full rounded-xl border-2 border-slate-200 py-3 pl-12 pr-4 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-400" />
            <select
              value={selectedYear}
              onChange={e => {
                setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))
                if (e.target.value === 'all') setSelectedMonth('all')
              }}
              className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
            >
              <option value="all">Alle Jahre</option>
              {yearsAvailable.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
            >
              {(activeTab === 'supplier' ? supplierStatuses : customerStatuses).map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Month tabs */}
        {selectedYear !== 'all' && (
          <div className="grid grid-cols-[auto_1fr] gap-2 rounded-xl border-2 border-slate-200 bg-white p-2">
            <button
              onClick={() => setSelectedMonth('all')}
              className={`flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                selectedMonth === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Alle
            </button>
            <div className="grid grid-cols-6 gap-0.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(monthNum => {
                const monthItems = deliveriesByMonth.get(monthNum) || []
                const count = monthItems.length
                const isSelected = typeof selectedMonth === 'number' && selectedMonth === monthNum
                const monthName = new Date(2000, monthNum - 1).toLocaleDateString('de-DE', { month: 'short' })
                return (
                  <button
                    key={monthNum}
                    onClick={() => setSelectedMonth(monthNum)}
                    className={`flex flex-col items-center rounded-lg px-2 py-1.5 transition-all ${
                      isSelected
                        ? activeTab === 'supplier' ? 'bg-amber-500 shadow-lg' : 'bg-blue-600 shadow-lg'
                        : 'hover:bg-slate-100'
                    }`}
                  >
                    <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>{monthName}</span>
                    <span className={`text-[10px] font-bold ${isSelected ? 'text-white/90' : 'text-slate-500'}`}>{count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Sort buttons */}
        <div className="flex items-center gap-2">
          {(['date', 'number', 'status'] as const).map(field => (
            <button
              key={field}
              onClick={() => handleSort(field)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                sortField === field ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              {field === 'date' && 'Datum'}
              {field === 'number' && 'Nummer'}
              {field === 'status' && 'Status'}
              {sortField === field
                ? sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                : <ArrowUpDown className="h-3 w-3 text-slate-400" />}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        </div>
      ) : selectedYear !== 'all' && selectedMonth !== 'all' ? (
        /* Flat month view with pagination */
        <div className="space-y-6">
          {currentMonthDeliveries.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-16 text-center">
              <FolderOpen className="mx-auto mb-4 h-16 w-16 text-slate-300" />
              <p className="text-lg font-black text-slate-600">
                Keine Lieferscheine in {new Date(2000, (selectedMonth as number) - 1).toLocaleDateString('de-DE', { month: 'long' })} {selectedYear}
              </p>
              <p className="mt-2 text-sm text-slate-400">Wählen Sie einen anderen Monat oder passen Sie die Filter an.</p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/80 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      {new Date(2000, (selectedMonth as number) - 1).toLocaleDateString('de-DE', { month: 'long' })} {selectedYear}
                    </h3>
                    <p className="text-sm text-slate-500">{currentMonthDeliveries.length} Lieferschein{currentMonthDeliveries.length !== 1 ? 'e' : ''}</p>
                  </div>
                  {totalPages > 1 && <div className="text-sm text-slate-500">Seite {currentPage} von {totalPages}</div>}
                </div>
              </div>

              <div className="space-y-0 divide-y-2 divide-slate-200">
                {activeTab === 'supplier'
                  ? (paginatedDeliveries as DeliveryNote[]).map((n, idx) => (
                      <SupplierNoteRow key={n.id} note={n} idx={idx} projectsIndex={projectsIndex} openProject={openProject} onView={setSelectedSupplierNote} />
                    ))
                  : (paginatedDeliveries as CustomerDeliveryNote[]).map((n, idx) => (
                      <CustomerNoteRow key={n.id} note={n} idx={idx} projectsIndex={projectsIndex} openProject={openProject} onView={setSelectedCustomerNote} />
                    ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between rounded-2xl border-2 border-slate-200 bg-slate-50/80 px-6 py-4">
                  <div className="text-sm text-slate-600">
                    Zeige {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, currentMonthDeliveries.length)} von {currentMonthDeliveries.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40">««</button>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40">«</button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) pageNum = i + 1
                      else if (currentPage <= 3) pageNum = i + 1
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                      else pageNum = currentPage - 2 + i
                      return (
                        <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`rounded-lg px-3 py-2 text-sm font-bold transition-all ${currentPage === pageNum ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}>{pageNum}</button>
                      )
                    })}
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40">»</button>
                    <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40">»»</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* Grouped year > month view */
        <div className="space-y-6">
          {grouped.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-16 text-center">
              <FolderOpen className="mx-auto mb-4 h-16 w-16 text-slate-300" />
              <p className="text-lg font-black text-slate-600">Keine Lieferscheine gefunden</p>
              <p className="mt-2 text-sm text-slate-400">Passe Filter oder Suche an.</p>
            </div>
          ) : (
            grouped.map(yearGroup => {
              const isExpanded = expandedYears.has(yearGroup.year)
              return (
                <div key={yearGroup.year} className="space-y-3">
                  <button
                    onClick={() => {
                      setExpandedYears(prev => {
                        const next = new Set(prev)
                        if (next.has(yearGroup.year)) next.delete(yearGroup.year)
                        else next.add(yearGroup.year)
                        return next
                      })
                    }}
                    className="flex w-full items-center justify-between rounded-2xl bg-slate-100 px-5 py-4 transition-all hover:bg-slate-200"
                  >
                    <div className="text-sm font-black tracking-tight text-slate-900">{yearGroup.year}</div>
                    <div className="text-xs font-bold text-slate-600">{yearGroup.count} Einträge · {isExpanded ? 'Zuklappen' : 'Aufklappen'}</div>
                  </button>

                  {isExpanded && (
                    <div className="space-y-6">
                      {yearGroup.months.map(group => (
                        <div key={group.key} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">{formatGroupLabel(group.key)}</h2>
                            <span className="text-xs font-bold text-slate-400">{group.items.length} Einträge</span>
                          </div>
                          <div className="grid grid-cols-1 gap-0 divide-y-2 divide-slate-200">
                            {activeTab === 'supplier'
                              ? (group.items as DeliveryNote[]).map((n, idx) => (
                                  <SupplierNoteRow key={n.id} note={n} idx={idx} projectsIndex={projectsIndex} openProject={openProject} onView={setSelectedSupplierNote} />
                                ))
                              : (group.items as CustomerDeliveryNote[]).map((n, idx) => (
                                  <CustomerNoteRow key={n.id} note={n} idx={idx} projectsIndex={projectsIndex} openProject={openProject} onView={setSelectedCustomerNote} />
                                ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}

          {totalFilteredCount > visibleCount && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setVisibleCount(v => v + 120)}
                className="rounded-2xl bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-slate-800"
              >
                Mehr laden ({Math.min(visibleCount, totalFilteredCount)} / {totalFilteredCount})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-lg font-black text-slate-900">Lieferanten-Lieferschein hochladen</div>
              <button onClick={() => setShowUpload(false)} className="rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-700 hover:bg-slate-200">Schließen</button>
            </div>
            <DeliveryNoteUpload onUploadComplete={() => refreshDeliveryNotes()} onClose={() => setShowUpload(false)} />
          </div>
        </div>
      )}

      {selectedSupplierNote && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <DeliveryNoteDetail deliveryNote={selectedSupplierNote} projects={projects} onBack={() => setSelectedSupplierNote(null)} onUpdate={() => refreshDeliveryNotes()} />
          </div>
        </div>
      )}

      {selectedCustomerNote && (
        <CustomerDeliveryNoteViewModal
          note={selectedCustomerNote}
          project={projectsIndex.get(selectedCustomerNote.projectId) || null}
          projectId={selectedCustomerNote.projectId}
          onClose={() => setSelectedCustomerNote(null)}
          onUpdate={() => refreshDeliveryNotes()}
        />
      )}
    </div>
  )
}

// ============================================
// Sub-components (eliminate duplicate JSX)
// ============================================

import type { CustomerProject } from '@/types'

function SupplierNoteRow({
  note: n,
  idx,
  projectsIndex,
  openProject,
  onView,
}: {
  note: DeliveryNote
  idx: number
  projectsIndex: Map<string, CustomerProject>
  openProject: (id?: string | null) => void
  onView: (note: DeliveryNote) => void
}) {
  return (
    <div className={`rounded-none p-6 transition-all hover:border-amber-300 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="rounded-xl border border-amber-200 bg-amber-100 p-3 text-amber-700">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <div className="text-lg font-black text-slate-900">{n.supplierDeliveryNoteNumber}</div>
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black uppercase tracking-wider text-slate-700">{n.status}</span>
            </div>
            <div className="mt-1 text-sm text-slate-600">
              <strong>{n.supplierName}</strong> · {new Date(n.deliveryDate).toLocaleDateString('de-DE')}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Projekt:{' '}
              {n.matchedProjectId ? (
                <button onClick={() => openProject(n.matchedProjectId)} className="font-bold text-blue-600 underline underline-offset-2 hover:text-blue-700" title="Auftrag öffnen">
                  {projectsIndex.get(n.matchedProjectId)?.customerName ? `${projectsIndex.get(n.matchedProjectId)!.customerName} öffnen` : 'öffnen'}
                </button>
              ) : (
                <span className="text-slate-400">nicht zugeordnet</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onView(n)} className="rounded-xl bg-slate-100 p-2 text-slate-700 transition-all hover:bg-slate-200" title="Ansehen">
            <Eye className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function CustomerNoteRow({
  note: n,
  idx,
  projectsIndex,
  openProject,
  onView,
}: {
  note: CustomerDeliveryNote
  idx: number
  projectsIndex: Map<string, CustomerProject>
  openProject: (id?: string | null) => void
  onView: (note: CustomerDeliveryNote) => void
}) {
  return (
    <div className={`rounded-none p-6 transition-all hover:border-blue-300 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="rounded-xl border border-blue-200 bg-blue-100 p-3 text-blue-700">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <div className="text-lg font-black text-slate-900">{n.deliveryNoteNumber}</div>
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black uppercase tracking-wider text-slate-700">{n.status}</span>
            </div>
            <div className="mt-1 text-sm text-slate-600">
              <strong>{projectsIndex.get(n.projectId)?.customerName || 'Kunde'}</strong>{' · '}{new Date(n.deliveryDate).toLocaleDateString('de-DE')}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Auftrag:{' '}
              {n.projectId ? (
                <button onClick={() => openProject(n.projectId)} className="font-bold text-blue-600 underline underline-offset-2 hover:text-blue-700" title="Auftrag öffnen">
                  {projectsIndex.get(n.projectId)?.orderNumber ? `${projectsIndex.get(n.projectId)!.orderNumber} öffnen` : 'öffnen'}
                </button>
              ) : (
                <span className="text-slate-400">unbekannt</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onView(n)} className="rounded-xl bg-slate-100 p-2 text-slate-700 transition-all hover:bg-slate-200" title="Ansehen">
            <Eye className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
