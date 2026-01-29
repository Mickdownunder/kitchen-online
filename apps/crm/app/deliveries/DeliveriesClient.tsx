'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Package,
  Truck,
  Search,
  Filter,
  ArrowUpDown,
  FolderOpen,
  Upload,
  Eye,
  RefreshCw,
} from 'lucide-react'
import { DeliveryNote, CustomerDeliveryNote, CustomerProject } from '@/types'
import { useApp } from '../providers'
import DeliveryNoteUpload from '@/components/DeliveryNoteUpload'
import DeliveryNoteDetail from '@/components/DeliveryNoteDetail'
import CustomerDeliveryNoteViewModal from '@/components/CustomerDeliveryNoteViewModal'

export default function DeliveriesClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Use global state from AppProvider - NO separate fetches!
  const {
    projects,
    supplierDeliveryNotes,
    customerDeliveryNotes,
    refreshDeliveryNotes,
    isLoadingDeliveryNotes,
    isLoading: isLoadingProjects,
  } = useApp()

  const initialTab = (searchParams.get('type') as 'supplier' | 'customer' | null) || 'supplier'
  const [activeTab, setActiveTab] = useState<'supplier' | 'customer'>(initialTab)

  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(new Date().getMonth() + 1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<
    'date_desc' | 'date_asc' | 'number_asc' | 'number_desc' | 'status_asc' | 'status_desc'
  >('date_desc')

  const [showUpload, setShowUpload] = useState(false)
  const [visibleCount, setVisibleCount] = useState(120)
  const [expandedYears, setExpandedYears] = useState<Set<number>>(
    () => new Set([new Date().getFullYear()])
  )

  const [selectedSupplierNote, setSelectedSupplierNote] = useState<DeliveryNote | null>(null)
  const [selectedCustomerNote, setSelectedCustomerNote] = useState<CustomerDeliveryNote | null>(
    null
  )

  // Create project index for quick lookup - memoized
  const projectsIndex = useMemo(() => {
    const map = new Map<string, CustomerProject>()
    projects.forEach(p => map.set(p.id, p))
    return map
  }, [projects])

  useEffect(() => {
    // Keep URL in sync for sharing / deep linking
    const params = new URLSearchParams(searchParams.toString())
    params.set('type', activeTab)
    router.replace(`/deliveries?${params.toString()}`)
  }, [activeTab, router, searchParams])

  // Reset pagination when switching tabs or filters
  useEffect(() => {
    setVisibleCount(120)
  }, [activeTab, selectedYear, selectedMonth, statusFilter, sort, search])

  const yearsAvailable = useMemo(() => {
    const years = new Set<number>()
    const allDates: string[] = []
    supplierDeliveryNotes.forEach((n: { deliveryDate: string }) => allDates.push(n.deliveryDate))
    customerDeliveryNotes.forEach((n: { deliveryDate: string }) => allDates.push(n.deliveryDate))
    allDates.forEach(d => {
      if (!d) return
      years.add(new Date(d).getFullYear())
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [supplierDeliveryNotes, customerDeliveryNotes])

  const monthOptions = useMemo(() => {
    return [
      { value: 1, label: 'Jänner' },
      { value: 2, label: 'Februar' },
      { value: 3, label: 'März' },
      { value: 4, label: 'April' },
      { value: 5, label: 'Mai' },
      { value: 6, label: 'Juni' },
      { value: 7, label: 'Juli' },
      { value: 8, label: 'August' },
      { value: 9, label: 'September' },
      { value: 10, label: 'Oktober' },
      { value: 11, label: 'November' },
      { value: 12, label: 'Dezember' },
    ]
  }, [])

  const supplierStatuses = [
    { value: 'all', label: 'Alle Status' },
    { value: 'received', label: 'Erhalten' },
    { value: 'matched', label: 'Zugeordnet' },
    { value: 'processed', label: 'Verarbeitet' },
    { value: 'completed', label: 'Abgeschlossen' },
  ]

  const customerStatuses = [
    { value: 'all', label: 'Alle Status' },
    { value: 'draft', label: 'Entwurf' },
    { value: 'sent', label: 'Versendet' },
    { value: 'delivered', label: 'Geliefert' },
    { value: 'completed', label: 'Abgeschlossen' },
  ]

  const filteredSupplier = useMemo(() => {
    const q = search.trim().toLowerCase()
    return supplierDeliveryNotes
      .filter(n => {
        const d = new Date(n.deliveryDate)
        if (selectedYear !== 'all' && d.getFullYear() !== selectedYear) return false
        if (selectedMonth !== 'all' && d.getMonth() + 1 !== selectedMonth) return false
        if (statusFilter !== 'all' && n.status !== statusFilter) return false
        if (!q) return true
        return (
          n.supplierName?.toLowerCase().includes(q) ||
          n.supplierDeliveryNoteNumber?.toLowerCase().includes(q) ||
          (n.matchedProjectId || '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) =>
        sortNotes(
          sort,
          a.deliveryDate,
          b.deliveryDate,
          a.supplierDeliveryNoteNumber,
          b.supplierDeliveryNoteNumber,
          a.status,
          b.status
        )
      )
  }, [supplierDeliveryNotes, search, selectedYear, selectedMonth, statusFilter, sort])

  const filteredCustomer = useMemo(() => {
    const q = search.trim().toLowerCase()
    return customerDeliveryNotes
      .filter(n => {
        const d = new Date(n.deliveryDate)
        if (selectedYear !== 'all' && d.getFullYear() !== selectedYear) return false
        if (selectedMonth !== 'all' && d.getMonth() + 1 !== selectedMonth) return false
        if (statusFilter !== 'all' && n.status !== statusFilter) return false
        if (!q) return true
        // Also search by customer name from project
        const project = projectsIndex.get(n.projectId)
        const customerName = project?.customerName?.toLowerCase() || ''
        return (
          n.deliveryNoteNumber?.toLowerCase().includes(q) ||
          (n.projectId || '').toLowerCase().includes(q) ||
          customerName.includes(q)
        )
      })
      .sort((a, b) =>
        sortNotes(
          sort,
          a.deliveryDate,
          b.deliveryDate,
          a.deliveryNoteNumber,
          b.deliveryNoteNumber,
          a.status,
          b.status
        )
      )
  }, [
    customerDeliveryNotes,
    search,
    selectedYear,
    selectedMonth,
    statusFilter,
    sort,
    projectsIndex,
  ])

  const grouped = useMemo(() => {
    const list = (activeTab === 'supplier' ? filteredSupplier : filteredCustomer).slice(
      0,
      visibleCount
    )
    const byYear = new Map<number, Map<string, (DeliveryNote | CustomerDeliveryNote)[]>>()

    list.forEach((n: DeliveryNote | CustomerDeliveryNote) => {
      const d = new Date(n.deliveryDate)
      const year = d.getFullYear()
      const monthKey = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!byYear.has(year)) byYear.set(year, new Map())
      const m = byYear.get(year)!
      if (!m.has(monthKey)) m.set(monthKey, [])
      m.get(monthKey)!.push(n)
    })

    const years = Array.from(byYear.keys()).sort((a, b) => b - a)
    return years.map(year => {
      const monthMap = byYear.get(year)!
      const months = Array.from(monthMap.entries())
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .map(([key, items]) => ({ key, items }))
      const count = months.reduce((sum, m) => sum + m.items.length, 0)
      return { year, months, count }
    })
  }, [activeTab, filteredSupplier, filteredCustomer, visibleCount])

  const totalFilteredCount =
    activeTab === 'supplier' ? filteredSupplier.length : filteredCustomer.length

  const openProject = (projectId?: string | null) => {
    if (!projectId) return
    router.push(`/projects?projectId=${projectId}`)
  }

  const loading = isLoadingProjects || isLoadingDeliveryNotes

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
          onClick={() => {
            setActiveTab('supplier')
            setStatusFilter('all')
          }}
          className={`flex items-center gap-2 rounded-xl px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'supplier'
              ? 'bg-amber-500 text-slate-900 shadow-lg'
              : 'text-slate-400 hover:text-slate-900'
          }`}
        >
          <Package className="h-3 w-3" /> Lieferanten ({supplierDeliveryNotes.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('customer')
            setStatusFilter('all')
          }}
          className={`flex items-center gap-2 rounded-xl px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'customer'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-900'
          }`}
        >
          <Truck className="h-3 w-3" /> Kunden ({customerDeliveryNotes.length})
        </button>
      </div>

      {/* Stats Cards - Only for filtered delivery notes */}
      {(filteredSupplier.length > 0 || filteredCustomer.length > 0) && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-amber-50/30 p-6 shadow-lg">
            <div className="mb-2 flex items-center gap-3">
              <Package className="h-6 w-6 text-amber-600" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                Lieferanten-Lieferscheine
              </p>
            </div>
            <p className="text-3xl font-black text-slate-900">{filteredSupplier.length}</p>
            <p className="mt-1 text-xs text-slate-500">
              {(() => {
                const matched = filteredSupplier.filter(n => n.matchedProjectId).length
                return `${matched} zugeordnet`
              })()}
            </p>
          </div>

          <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-blue-50/30 p-6 shadow-lg">
            <div className="mb-2 flex items-center gap-3">
              <Truck className="h-6 w-6 text-blue-600" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                Kunden-Lieferscheine
              </p>
            </div>
            <p className="text-3xl font-black text-slate-900">{filteredCustomer.length}</p>
            <p className="mt-1 text-xs text-slate-500">
              {(() => {
                const completed = filteredCustomer.filter(
                  n => n.status === 'completed' || n.status === 'signed'
                ).length
                return `${completed} abgeschlossen`
              })()}
            </p>
          </div>

          <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-slate-50/30 p-6 shadow-lg">
            <div className="mb-2 flex items-center gap-3">
              <FolderOpen className="h-6 w-6 text-slate-600" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Gesamt</p>
            </div>
            <p className="text-3xl font-black text-slate-900">
              {filteredSupplier.length + filteredCustomer.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {activeTab === 'supplier' ? 'Lieferanten' : 'Kunden'} gefiltert
            </p>
          </div>

          <div className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white to-emerald-50/30 p-6 shadow-lg">
            <div className="mb-2 flex items-center gap-3">
              <Eye className="h-6 w-6 text-emerald-600" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                Status-Verteilung
              </p>
            </div>
            <p className="text-3xl font-black text-slate-900">
              {(() => {
                const currentList = activeTab === 'supplier' ? filteredSupplier : filteredCustomer
                const completed = currentList.filter(
                  n =>
                    (activeTab === 'supplier' && n.status === 'completed') ||
                    (activeTab === 'customer' &&
                      (n.status === 'completed' || n.status === 'signed'))
                ).length
                return completed
              })()}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {(() => {
                const currentList = activeTab === 'supplier' ? filteredSupplier : filteredCustomer
                const total = currentList.length
                const completed = currentList.filter(
                  n =>
                    (activeTab === 'supplier' && n.status === 'completed') ||
                    (activeTab === 'customer' &&
                      (n.status === 'completed' || n.status === 'signed'))
                ).length
                return total > 0 ? `${Math.round((completed / total) * 100)}% abgeschlossen` : '0%'
              })()}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={
              activeTab === 'supplier'
                ? 'Suche: Lieferant, Nummer, Projekt-ID…'
                : 'Suche: Kunde, Nummer, Projekt-ID…'
            }
            className="w-full rounded-xl border-2 border-slate-200 py-3 pl-12 pr-4 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-slate-400" />
          <select
            value={selectedYear}
            onChange={e =>
              setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
          >
            <option value="all">Alle Jahre</option>
            {yearsAvailable.map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={e =>
              setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
          >
            <option value="all">Alle Monate</option>
            {monthOptions.map(m => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
          >
            {(activeTab === 'supplier' ? supplierStatuses : customerStatuses).map(s => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-slate-400" />
            <select
              value={sort}
              onChange={e =>
                setSort(
                  e.target.value as
                    | 'date_desc'
                    | 'date_asc'
                    | 'number_asc'
                    | 'number_desc'
                    | 'status_asc'
                    | 'status_desc'
                )
              }
              className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
              title="Sortierung"
            >
              <option value="date_desc">Datum: neu → alt</option>
              <option value="date_asc">Datum: alt → neu</option>
              <option value="number_asc">Nummer: A → Z</option>
              <option value="number_desc">Nummer: Z → A</option>
              <option value="status_asc">Status: A → Z</option>
              <option value="status_desc">Status: Z → A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        </div>
      ) : (
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
                    <div className="text-sm font-black tracking-tight text-slate-900">
                      {yearGroup.year}
                    </div>
                    <div className="text-xs font-bold text-slate-600">
                      {yearGroup.count} Einträge · {isExpanded ? 'Zuklappen' : 'Aufklappen'}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="space-y-6">
                      {yearGroup.months.map(group => (
                        <div key={group.key} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">
                              {formatGroupLabel(group.key)}
                            </h2>
                            <span className="text-xs font-bold text-slate-400">
                              {group.items.length} Einträge
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                            {activeTab === 'supplier'
                              ? (group.items as DeliveryNote[]).map(n => (
                                  <div
                                    key={n.id}
                                    className="rounded-2xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-amber-300"
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex items-start gap-4">
                                        <div className="rounded-xl border border-amber-200 bg-amber-100 p-3 text-amber-700">
                                          <Package className="h-5 w-5" />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-3">
                                            <div className="text-lg font-black text-slate-900">
                                              {n.supplierDeliveryNoteNumber}
                                            </div>
                                            <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black uppercase tracking-wider text-slate-700">
                                              {n.status}
                                            </span>
                                          </div>
                                          <div className="mt-1 text-sm text-slate-600">
                                            <strong>{n.supplierName}</strong> ·{' '}
                                            {new Date(n.deliveryDate).toLocaleDateString('de-DE')}
                                          </div>
                                          <div className="mt-1 text-xs text-slate-500">
                                            Projekt:{' '}
                                            {n.matchedProjectId ? (
                                              <button
                                                onClick={() => openProject(n.matchedProjectId)}
                                                className="font-bold text-blue-600 underline underline-offset-2 hover:text-blue-700"
                                                title="Auftrag öffnen"
                                              >
                                                {projectsIndex.get(n.matchedProjectId)?.customerName
                                                  ? `${projectsIndex.get(n.matchedProjectId)!.customerName} öffnen`
                                                  : 'öffnen'}
                                              </button>
                                            ) : (
                                              <span className="text-slate-400">
                                                nicht zugeordnet
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => setSelectedSupplierNote(n)}
                                          className="rounded-xl bg-slate-100 p-2 text-slate-700 transition-all hover:bg-slate-200"
                                          title="Ansehen"
                                        >
                                          <Eye className="h-5 w-5" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              : (group.items as CustomerDeliveryNote[]).map(n => (
                                  <div
                                    key={n.id}
                                    className="rounded-2xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-blue-300"
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex items-start gap-4">
                                        <div className="rounded-xl border border-blue-200 bg-blue-100 p-3 text-blue-700">
                                          <Truck className="h-5 w-5" />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-3">
                                            <div className="text-lg font-black text-slate-900">
                                              {n.deliveryNoteNumber}
                                            </div>
                                            <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black uppercase tracking-wider text-slate-700">
                                              {n.status}
                                            </span>
                                          </div>
                                          <div className="mt-1 text-sm text-slate-600">
                                            <strong>
                                              {projectsIndex.get(n.projectId)?.customerName ||
                                                'Kunde'}
                                            </strong>
                                            {' · '}
                                            {new Date(n.deliveryDate).toLocaleDateString('de-DE')}
                                          </div>
                                          <div className="mt-1 text-xs text-slate-500">
                                            Auftrag:{' '}
                                            {n.projectId ? (
                                              <button
                                                onClick={() => openProject(n.projectId)}
                                                className="font-bold text-blue-600 underline underline-offset-2 hover:text-blue-700"
                                                title="Auftrag öffnen"
                                              >
                                                {projectsIndex.get(n.projectId)?.orderNumber
                                                  ? `${projectsIndex.get(n.projectId)!.orderNumber} öffnen`
                                                  : 'öffnen'}
                                              </button>
                                            ) : (
                                              <span className="text-slate-400">unbekannt</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => setSelectedCustomerNote(n)}
                                          className="rounded-xl bg-slate-100 p-2 text-slate-700 transition-all hover:bg-slate-200"
                                          title="Ansehen"
                                        >
                                          <Eye className="h-5 w-5" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
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

      {/* Upload Modal for supplier notes */}
      {showUpload && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-lg font-black text-slate-900">
                Lieferanten-Lieferschein hochladen
              </div>
              <button
                onClick={() => setShowUpload(false)}
                className="rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-700 hover:bg-slate-200"
              >
                Schließen
              </button>
            </div>
            <DeliveryNoteUpload
              onUploadComplete={() => {
                refreshDeliveryNotes()
              }}
              onClose={() => {
                setShowUpload(false)
              }}
            />
          </div>
        </div>
      )}

      {selectedSupplierNote && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <DeliveryNoteDetail
              deliveryNote={selectedSupplierNote}
              projects={projects}
              onBack={() => setSelectedSupplierNote(null)}
              onUpdate={() => refreshDeliveryNotes()}
            />
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

function sortNotes(
  mode: 'date_desc' | 'date_asc' | 'number_asc' | 'number_desc' | 'status_asc' | 'status_desc',
  dateA: string,
  dateB: string,
  numA?: string,
  numB?: string,
  statusA?: string,
  statusB?: string
) {
  const dA = new Date(dateA).getTime()
  const dB = new Date(dateB).getTime()
  const nA = (numA || '').toLowerCase()
  const nB = (numB || '').toLowerCase()
  const sA = (statusA || '').toLowerCase()
  const sB = (statusB || '').toLowerCase()

  if (mode === 'date_desc') return dB - dA
  if (mode === 'date_asc') return dA - dB
  if (mode === 'number_asc') return nA.localeCompare(nB)
  if (mode === 'number_desc') return nB.localeCompare(nA)
  if (mode === 'status_asc') return sA.localeCompare(sB)
  return sB.localeCompare(sA)
}

function formatGroupLabel(key: string) {
  const [y, m] = key.split('-')
  const month = Number(m)
  const monthNames = [
    'Jänner',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
  ]
  return `${monthNames[month - 1]} ${y}`
}
