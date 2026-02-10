'use client'

import React, { useState, useEffect } from 'react'
import { DeliveryNote, CustomerProject } from '@/types'
import { getDeliveryNotes, getProjects } from '@/lib/supabase/services'
import { logger } from '@/lib/utils/logger'
import { Package, Search, Upload, CheckCircle2, AlertCircle, Clock, FileText, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import DeliveryNoteDetail from './DeliveryNoteDetail'
import DeliveryNoteUpload from './DeliveryNoteUpload'

export default function DeliveryNoteList() {
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([])
  const [projects, setProjects] = useState<CustomerProject[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNote, setSelectedNote] = useState<DeliveryNote | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<'date' | 'supplierName' | 'number' | 'status'>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const handleSort = (field: 'date' | 'supplierName' | 'number' | 'status') => {
    setSortField(field)
    setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [notesResult, projectsResult] = await Promise.all([getDeliveryNotes(), getProjects()])
      setDeliveryNotes(notesResult.ok ? notesResult.data : [])
      setProjects(projectsResult.ok ? projectsResult.data : [])

      if (!notesResult.ok) {
        logger.error(
          'Error loading delivery notes',
          { component: 'DeliveryNoteList', code: notesResult.code },
          new Error(notesResult.message),
        )
      }

      if (!projectsResult.ok) {
        logger.error(
          'Error loading projects',
          { component: 'DeliveryNoteList', code: projectsResult.code },
          new Error(projectsResult.message),
        )
      }
    } catch (error) {
      logger.error('Error loading delivery notes', { component: 'DeliveryNoteList' }, error as Error)
    } finally {
      setLoading(false)
    }
  }

  const filteredNotes = deliveryNotes.filter(note => {
    const matchesSearch =
      note.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.supplierDeliveryNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.matchedProjectId &&
        projects
          .find(p => p.id === note.matchedProjectId)
          ?.customerName.toLowerCase()
          .includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter === 'all' || note.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    let cmp = 0
    if (sortField === 'supplierName') {
      cmp = (a.supplierName || '').localeCompare(b.supplierName || '')
    } else if (sortField === 'number') {
      cmp = (a.supplierDeliveryNoteNumber || '').localeCompare(b.supplierDeliveryNoteNumber || '')
    } else if (sortField === 'date') {
      cmp = new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime()
    } else {
      cmp = (a.status || '').localeCompare(b.status || '')
    }
    return sortDirection === 'asc' ? cmp : -cmp
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'matched':
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />
      case 'processed':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'matched':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'processed':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  if (selectedNote) {
    return (
      <DeliveryNoteDetail
        deliveryNote={selectedNote}
        projects={projects}
        onBack={() => setSelectedNote(null)}
        onUpdate={loadData}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-amber-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Lieferscheine</h1>
          <p className="mt-1 text-sm text-slate-500">Verwaltung und Abgleich von Lieferscheinen</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-900 transition-all hover:bg-amber-600"
        >
          <Upload className="h-4 w-4" /> Neuer Lieferschein
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
          <input
            type="text"
            placeholder="Suche nach Lieferant, Lieferschein-Nr. oder Kunde..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="all">Alle Status</option>
          <option value="received">Empfangen</option>
          <option value="matched">Zugeordnet</option>
          <option value="processed">Verarbeitet</option>
          <option value="completed">Abgeschlossen</option>
        </select>
        <div className="flex items-center gap-2">
          {(['date', 'supplierName', 'number', 'status'] as const).map(field => (
            <button
              key={field}
              onClick={() => handleSort(field)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                sortField === field
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              {field === 'date' && 'Datum'}
              {field === 'supplierName' && 'Lieferant'}
              {field === 'number' && 'Nummer'}
              {field === 'status' && 'Status'}
              {sortField === field ? (
                sortDirection === 'asc' ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )
              ) : (
                <ArrowUpDown className="h-3 w-3 text-slate-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {filteredNotes.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <p className="text-slate-500">Keine Lieferscheine gefunden</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sortedNotes.map(note => {
              const project = note.matchedProjectId
                ? projects.find(p => p.id === note.matchedProjectId)
                : null

              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className="cursor-pointer p-6 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <FileText className="h-5 w-5 text-slate-400" />
                        <h3 className="font-black text-slate-900">{note.supplierName}</h3>
                        <span
                          className={`rounded-lg border px-3 py-1 text-xs font-bold ${getStatusColor(note.status)}`}
                        >
                          {getStatusIcon(note.status)}
                          <span className="ml-1 capitalize">{note.status}</span>
                        </span>
                        {note.aiMatched && (
                          <span className="rounded bg-purple-100 px-2 py-1 text-xs font-bold text-purple-700">
                            KI: {Math.round((note.aiConfidence || 0) * 100)}%
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 md:grid-cols-4">
                        <div>
                          <span className="font-bold">Lieferschein-Nr:</span>{' '}
                          {note.supplierDeliveryNoteNumber}
                        </div>
                        <div>
                          <span className="font-bold">Lieferdatum:</span>{' '}
                          {new Date(note.deliveryDate).toLocaleDateString('de-DE')}
                        </div>
                        <div>
                          <span className="font-bold">Empfangen:</span>{' '}
                          {new Date(note.receivedDate).toLocaleDateString('de-DE')}
                        </div>
                        {project && (
                          <div>
                            <span className="font-bold">Auftrag:</span> {project.orderNumber} -{' '}
                            {project.customerName}
                          </div>
                        )}
                      </div>
                      {note.items && note.items.length > 0 && (
                        <div className="mt-3 text-sm text-slate-500">
                          {note.items.length} Position{note.items.length !== 1 ? 'en' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <DeliveryNoteUpload onUploadComplete={loadData} onClose={() => setShowUpload(false)} />
      )}
    </div>
  )
}
