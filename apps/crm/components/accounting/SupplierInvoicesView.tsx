'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Trash2,
  Edit,
  X,
  Save,
  Euro,
  Building2,
  Upload,
  FileCheck,
  ExternalLink,
} from 'lucide-react'
import { SupplierInvoice, SupplierInvoiceCategory, PaymentMethod, CustomerProject } from '@/types'
import {
  getSupplierInvoices,
  createSupplierInvoice,
  updateSupplierInvoice,
  deleteSupplierInvoice,
  markSupplierInvoicePaid,
  markSupplierInvoiceUnpaid,
  getSupplierInvoiceCustomCategories,
  addSupplierInvoiceCustomCategory,
  CreateSupplierInvoiceInput,
} from '@/lib/supabase/services/supplierInvoices'

// Kategorie-Labels
const CATEGORY_LABELS: Record<SupplierInvoiceCategory, string> = {
  material: 'Wareneinkauf',
  subcontractor: 'Subunternehmer',
  tools: 'Werkzeuge/Maschinen',
  rent: 'Miete',
  insurance: 'Versicherungen',
  vehicle: 'Fahrzeugkosten',
  office: 'Bürobedarf',
  marketing: 'Marketing/Werbung',
  other: 'Sonstiges',
}

const CATEGORY_COLORS: Record<SupplierInvoiceCategory, string> = {
  material: 'bg-blue-100 text-blue-700',
  subcontractor: 'bg-purple-100 text-purple-700',
  tools: 'bg-orange-100 text-orange-700',
  rent: 'bg-green-100 text-green-700',
  insurance: 'bg-cyan-100 text-cyan-700',
  vehicle: 'bg-yellow-100 text-yellow-700',
  office: 'bg-pink-100 text-pink-700',
  marketing: 'bg-indigo-100 text-indigo-700',
  other: 'bg-slate-100 text-slate-700',
}

function getCategoryLabel(category: string): string {
  return (CATEGORY_LABELS as Record<string, string>)[category] ?? category
}

function getCategoryColor(category: string): string {
  return (CATEGORY_COLORS as Record<string, string>)[category] ?? 'bg-slate-100 text-slate-700'
}

interface SupplierInvoicesViewProps {
  projects?: CustomerProject[]
  onStatsChange?: (stats: { totalTax: number; count: number }) => void
}

export default function SupplierInvoicesView({ projects = [], onStatsChange }: SupplierInvoicesViewProps) {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string | 'all'>('all')
  const [customCategories, setCustomCategories] = useState<{ id: string; name: string }[]>([])
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'open' | 'overdue'>('all')

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<SupplierInvoice | null>(null)
  const [formData, setFormData] = useState<CreateSupplierInvoiceInput>({
    supplierName: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    netAmount: 0,
    taxRate: 20,
    category: 'material',
    projectId: undefined,
  })
  const [saving, setSaving] = useState(false)
  const [scanStatus, setScanStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'done' | 'error'>('idle')
  const [scanError, setScanError] = useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Payment modal
  const [payingInvoice, setPayingInvoice] = useState<SupplierInvoice | null>(null)
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank')

  // Use ref to store onStatsChange to avoid dependency issues
  const onStatsChangeRef = React.useRef(onStatsChange)
  onStatsChangeRef.current = onStatsChange

  const loadCustomCategories = useCallback(async () => {
    try {
      const data = await getSupplierInvoiceCustomCategories()
      setCustomCategories(data.map(c => ({ id: c.id, name: c.name })))
    } catch {
      setCustomCategories([])
    }
  }, [])

  const loadInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const [data] = await Promise.all([getSupplierInvoices(), loadCustomCategories()])
      setInvoices(data)

      // Stats für Parent-Komponente (use ref to avoid dependency)
      if (onStatsChangeRef.current) {
        const totalTax = data.reduce((sum, inv) => sum + inv.taxAmount, 0)
        onStatsChangeRef.current({ totalTax, count: data.length })
      }
    } catch (error) {
      console.error('Fehler beim Laden der Eingangsrechnungen:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  // Filter logic
  const filteredInvoices = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]

    return invoices.filter(inv => {
      // Search
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        if (
          !inv.supplierName.toLowerCase().includes(search) &&
          !inv.invoiceNumber.toLowerCase().includes(search)
        ) {
          return false
        }
      }

      // Category filter (category is string: standard code or custom name)
      if (filterCategory !== 'all' && inv.category !== filterCategory) return false

      // Status filter
      if (filterStatus === 'paid' && !inv.isPaid) return false
      if (filterStatus === 'open' && inv.isPaid) return false
      if (filterStatus === 'overdue') {
        if (inv.isPaid) return false
        if (!inv.dueDate || inv.dueDate >= today) return false
      }

      return true
    })
  }, [invoices, searchTerm, filterCategory, filterStatus])

  // Summary stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const paid = filteredInvoices.filter(inv => inv.isPaid)
    const open = filteredInvoices.filter(inv => !inv.isPaid)
    const overdue = open.filter(inv => inv.dueDate && inv.dueDate < today)

    return {
      total: filteredInvoices.reduce((sum, inv) => sum + inv.grossAmount, 0),
      totalTax: filteredInvoices.reduce((sum, inv) => sum + inv.taxAmount, 0),
      totalSkonto: filteredInvoices.reduce((sum, inv) => sum + (inv.skontoAmount ?? 0), 0),
      paidAmount: paid.reduce((sum, inv) => sum + inv.grossAmount, 0),
      openAmount: open.reduce((sum, inv) => sum + inv.grossAmount, 0),
      overdueAmount: overdue.reduce((sum, inv) => sum + inv.grossAmount, 0),
      count: filteredInvoices.length,
      openCount: open.length,
      overdueCount: overdue.length,
    }
  }, [filteredInvoices])

  const formatCurrency = (value: number) => {
    return value.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const projectMap = useMemo(
    () => new Map(projects.map(p => [p.id, p])),
    [projects]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (editingInvoice) {
        await updateSupplierInvoice(editingInvoice.id, formData)
      } else {
        await createSupplierInvoice(formData)
      }
      await loadInvoices()
      setShowForm(false)
      setEditingInvoice(null)
      resetForm()
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      alert('Fehler beim Speichern der Rechnung')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      supplierName: '',
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      netAmount: 0,
      taxRate: 20,
      category: 'material',
      projectId: undefined,
      skontoPercent: undefined,
      skontoAmount: undefined,
    })
    setScanStatus('idle')
    setScanError(null)
  }

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.includes(',') ? result.split(',')[1] : result
        resolve(base64 || '')
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const processScannedFile = async (file: File) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setScanError('Bitte PDF oder Bild (JPG, PNG, WebP) wählen.')
      setScanStatus('error')
      return
    }
    setScanError(null)
    setScanStatus('uploading')

    try {
      const [uploadRes, analyzeRes] = await Promise.all([
        (async () => {
          const form = new FormData()
          form.append('file', file)
          const r = await fetch('/api/accounting/supplier-invoices/upload', {
            method: 'POST',
            body: form,
          })
          if (!r.ok) {
            const err = await r.json().catch(() => ({}))
            throw new Error(err.error || 'Hochladen fehlgeschlagen')
          }
          return r.json() as Promise<{ documentUrl: string; documentName: string }>
        })(),
        (async () => {
          setScanStatus('analyzing')
          const base64 = await fileToBase64(file)
          const r = await fetch('/api/accounting/supplier-invoices/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Data: base64, mimeType: file.type }),
          })
          if (!r.ok) {
            const err = await r.json().catch(() => ({}))
            throw new Error(err.error || 'Auslesen fehlgeschlagen')
          }
          return r.json() as Promise<{
            supplierName?: string
            supplierUid?: string | null
            invoiceNumber?: string
            invoiceDate?: string
            dueDate?: string | null
            netAmount?: number
            taxRate?: number
            category?: string
          }>
        })(),
      ])

      setFormData(prev => ({
        ...prev,
        supplierName: analyzeRes.supplierName ?? prev.supplierName,
        supplierUid: analyzeRes.supplierUid ?? prev.supplierUid,
        invoiceNumber: analyzeRes.invoiceNumber ?? prev.invoiceNumber,
        invoiceDate: analyzeRes.invoiceDate ?? prev.invoiceDate,
        dueDate: analyzeRes.dueDate ?? prev.dueDate,
        netAmount: analyzeRes.netAmount ?? prev.netAmount,
        taxRate: analyzeRes.taxRate ?? prev.taxRate,
        category: (analyzeRes.category as SupplierInvoiceCategory) ?? prev.category,
        documentUrl: uploadRes.documentUrl,
        documentName: uploadRes.documentName,
      }))
      setScanStatus('done')
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Fehler beim Verarbeiten')
      setScanStatus('error')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) processScannedFile(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processScannedFile(file)
    e.target.value = ''
  }

  const handleEdit = (invoice: SupplierInvoice) => {
    setEditingInvoice(invoice)
    setFormData({
      supplierName: invoice.supplierName,
      supplierUid: invoice.supplierUid,
      supplierAddress: invoice.supplierAddress,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      netAmount: invoice.netAmount,
      taxRate: invoice.taxRate,
      category: invoice.category,
      projectId: invoice.projectId,
      skontoPercent: invoice.skontoPercent,
      skontoAmount: invoice.skontoAmount,
      notes: invoice.notes,
      documentUrl: invoice.documentUrl,
      documentName: invoice.documentName,
    })
    setScanStatus('idle')
    setScanError(null)
    setShowForm(true)
  }

  const handleAddCustomCategory = async () => {
    const name = window.prompt('Neue Kategorie eingeben (z. B. „Beratung“, „Schulung“):')
    if (!name?.trim()) return
    try {
      const added = await addSupplierInvoiceCustomCategory(name.trim())
      await loadCustomCategories()
      setFormData(prev => ({ ...prev, category: added.name }))
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Kategorie konnte nicht hinzugefügt werden.')
    }
  }

  const handleDelete = async (invoice: SupplierInvoice) => {
    if (
      !confirm(`Rechnung "${invoice.invoiceNumber}" von ${invoice.supplierName} wirklich löschen?`)
    ) {
      return
    }
    try {
      await deleteSupplierInvoice(invoice.id)
      await loadInvoices()
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
      alert('Fehler beim Löschen der Rechnung')
    }
  }

  const handleMarkPaid = async () => {
    if (!payingInvoice) return
    try {
      await markSupplierInvoicePaid(payingInvoice.id, paidDate, paymentMethod)
      await loadInvoices()
      setPayingInvoice(null)
    } catch (error) {
      console.error('Fehler:', error)
      alert('Fehler beim Markieren als bezahlt')
    }
  }

  const handleMarkUnpaid = async (invoice: SupplierInvoice) => {
    try {
      await markSupplierInvoiceUnpaid(invoice.id)
      await loadInvoices()
    } catch (error) {
      console.error('Fehler:', error)
      alert('Fehler beim Zurücksetzen')
    }
  }

  // Auto-calculate amounts when netAmount or taxRate changes
  const calculatedAmounts = useMemo(() => {
    const net = formData.netAmount || 0
    const rate = formData.taxRate || 20
    const tax = Math.round(net * (rate / 100) * 100) / 100
    const gross = Math.round((net + tax) * 100) / 100
    return { tax, gross }
  }, [formData.netAmount, formData.taxRate])

  // Skonto-Betrag neu berechnen – ab 5 aufrunden, bis 4 abrunden (456,657 → 456,66; 456,654 → 456,65)
  React.useEffect(() => {
    const pct = formData.skontoPercent
    const gross = calculatedAmounts.gross
    if (pct != null && pct > 0 && gross > 0) {
      const amount = Math.round(gross * (pct / 100) * 100) / 100
      setFormData(prev => (prev.skontoAmount === amount ? prev : { ...prev, skontoAmount: amount }))
    }
  }, [calculatedAmounts.gross, formData.skontoPercent])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-900">Eingangsrechnungen</h3>
          <p className="text-sm text-slate-500">Lieferanten-Rechnungen für Vorsteuerabzug</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setEditingInvoice(null)
            setShowForm(true)
          }}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-white shadow-lg transition-all hover:bg-amber-600"
        >
          <Plus className="h-5 w-5" />
          Neue Rechnung
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Gesamt</p>
          <p className="text-2xl font-black text-slate-900">{formatCurrency(stats.total)} €</p>
          <p className="text-xs text-slate-500">{stats.count} Rechnungen</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Vorsteuer</p>
          <p className="text-2xl font-black text-emerald-700">{formatCurrency(stats.totalTax)} €</p>
          <p className="text-xs text-emerald-600">Abzugsfähig</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Skonto gesamt</p>
          <p className="text-2xl font-black text-blue-700">{formatCurrency(stats.totalSkonto)} €</p>
          <p className="text-xs text-blue-600">Für Steuerberater</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Offen</p>
          <p className="text-2xl font-black text-amber-700">{formatCurrency(stats.openAmount)} €</p>
          <p className="text-xs text-amber-600">{stats.openCount} Rechnungen</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-red-600">Überfällig</p>
          <p className="text-2xl font-black text-red-700">
            {formatCurrency(stats.overdueAmount)} €
          </p>
          <p className="text-xs text-red-600">{stats.overdueCount} Rechnungen</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
          <input
            type="text"
            placeholder="Suche nach Lieferant oder Rechnungsnummer..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 transform rounded p-1 hover:bg-slate-100"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="all">Alle Kategorien</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
          {customCategories.map(c => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as 'all' | 'paid' | 'open' | 'overdue')}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="all">Alle Status</option>
          <option value="paid">Bezahlt</option>
          <option value="open">Offen</option>
          <option value="overdue">Überfällig</option>
        </select>
      </div>

      {/* Invoice List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-100">
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                  Lieferant
                </th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                  Rechnungsnr.
                </th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                  Datum
                </th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                  Kategorie
                </th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                  Auftrag
                </th>
                <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-500">
                  Netto
                </th>
                <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-500">
                  MwSt
                </th>
                <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-500">
                  Brutto
                </th>
                <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider text-slate-500">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                    {invoices.length === 0
                      ? 'Noch keine Eingangsrechnungen erfasst'
                      : 'Keine Rechnungen gefunden'}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(invoice => {
                  const today = new Date().toISOString().split('T')[0]
                  const isOverdue = !invoice.isPaid && invoice.dueDate && invoice.dueDate < today

                  return (
                    <tr key={invoice.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                            <Building2 className="h-5 w-5 text-slate-600" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{invoice.supplierName}</p>
                            {invoice.supplierUid && (
                              <p className="text-xs text-slate-500">UID: {invoice.supplierUid}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-700">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-slate-700">
                            {new Date(invoice.invoiceDate).toLocaleDateString('de-AT')}
                          </p>
                          {invoice.dueDate && (
                            <p
                              className={`text-xs ${isOverdue ? 'font-bold text-red-600' : 'text-slate-500'}`}
                            >
                              Fällig: {new Date(invoice.dueDate).toLocaleDateString('de-AT')}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getCategoryColor(invoice.category)}`}
                        >
                          {getCategoryLabel(invoice.category)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {invoice.projectId ? (
                          <span className="text-xs font-medium text-slate-600">
                            {projectMap.get(invoice.projectId)?.orderNumber ?? '—'}{' '}
                            <span className="text-slate-400">
                              ({projectMap.get(invoice.projectId)?.customerName ?? ''})
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-700">
                        {formatCurrency(invoice.netAmount)} €
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-500">
                        {formatCurrency(invoice.taxAmount)} €
                        <span className="ml-1 text-xs">({invoice.taxRate}%)</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div>
                          <span className="font-black text-slate-900">
                            {formatCurrency(invoice.grossAmount)} €
                          </span>
                          {invoice.skontoAmount != null && invoice.skontoAmount > 0 && (
                            <p className="text-xs text-slate-500">
                              nach Skonto: {formatCurrency(invoice.grossAmount - invoice.skontoAmount)} €
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {invoice.isPaid ? (
                          <button
                            onClick={() => handleMarkUnpaid(invoice)}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-200"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Bezahlt
                          </button>
                        ) : isOverdue ? (
                          <button
                            onClick={() => setPayingInvoice(invoice)}
                            className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 transition-colors hover:bg-red-200"
                          >
                            <AlertCircle className="h-3 w-3" />
                            Überfällig
                          </button>
                        ) : (
                          <button
                            onClick={() => setPayingInvoice(invoice)}
                            className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-200"
                          >
                            <Clock className="h-3 w-3" />
                            Offen
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {invoice.documentUrl && (
                            <a
                              href={`/api/accounting/supplier-invoices/${invoice.id}/document`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-amber-600"
                              title="Beleg anzeigen"
                            >
                              <FileText className="h-4 w-4" />
                            </a>
                          )}
                          <button
                            onClick={() => handleEdit(invoice)}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(invoice)}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900">
                {editingInvoice ? 'Rechnung bearbeiten' : 'Neue Eingangsrechnung'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingInvoice(null)
                }}
                className="rounded-lg p-2 transition-colors hover:bg-slate-100"
              >
                <X className="h-6 w-6 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Rechnung scannen / hochladen – so einfach wie möglich */}
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/80 p-6 transition-colors hover:border-amber-400 hover:bg-amber-50"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-3 py-4 text-left"
                >
                  {scanStatus === 'uploading' || scanStatus === 'analyzing' ? (
                    <>
                      <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
                      <span className="font-medium text-slate-700">
                        {scanStatus === 'uploading'
                          ? 'Wird hochgeladen…'
                          : 'Rechnung wird ausgelesen…'}
                      </span>
                    </>
                  ) : scanStatus === 'done' ? (
                    <>
                      <FileCheck className="h-12 w-12 text-emerald-500" />
                      <span className="font-medium text-emerald-700">
                        Felder wurden vorausgefüllt – bitte prüfen Sie die Daten unten.
                      </span>
                    </>
                  ) : scanStatus === 'error' ? (
                    <>
                      <AlertCircle className="h-12 w-12 text-red-500" />
                      <span className="font-medium text-red-700">{scanError}</span>
                      <span className="text-sm text-slate-600">
                        Klicken Sie hier, um es erneut zu versuchen.
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-amber-500" />
                      <span className="text-lg font-bold text-slate-800">
                        Rechnung hier ablegen oder Foto/PDF auswählen
                      </span>
                      <span className="text-sm text-slate-500">
                        PDF oder Bild (JPG, PNG) – die KI füllt die Felder vor.
                      </span>
                    </>
                  )}
                </button>
                {(formData.documentName || formData.documentUrl) && (
                  <p className="mt-2 text-center text-sm text-slate-600">
                    Beleg: <span className="font-medium">{formData.documentName || 'Datei'}</span>
                    {editingInvoice?.id && editingInvoice.documentUrl && (
                      <>
                        {' · '}
                        <a
                          href={`/api/accounting/supplier-invoices/${editingInvoice.id}/document`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-amber-600 hover:underline"
                        >
                          Beleg anzeigen
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* Lieferant */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h4 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
                  <Building2 className="h-5 w-5 text-amber-500" />
                  Lieferant
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.supplierName}
                      onChange={e => setFormData({ ...formData, supplierName: e.target.value })}
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
                      placeholder="Lieferantenname"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      UID-Nummer
                    </label>
                    <input
                      type="text"
                      value={formData.supplierUid || ''}
                      onChange={e => setFormData({ ...formData, supplierUid: e.target.value })}
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
                      placeholder="ATU12345678"
                    />
                  </div>
                </div>
              </div>

              {/* Rechnungsdetails */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h4 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
                  <FileText className="h-5 w-5 text-amber-500" />
                  Rechnungsdetails
                </h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Rechnungsnummer *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.invoiceNumber}
                      onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
                      placeholder="R-2026-001"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Rechnungsdatum *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.invoiceDate}
                      onChange={e => setFormData({ ...formData, invoiceDate: e.target.value })}
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Fälligkeitsdatum
                    </label>
                    <input
                      type="date"
                      value={formData.dueDate || ''}
                      onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Beträge */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h4 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
                  <Euro className="h-5 w-5 text-amber-500" />
                  Beträge
                </h4>
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Netto-Betrag *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.netAmount || ''}
                      onChange={e =>
                        setFormData({ ...formData, netAmount: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">MwSt-Satz</label>
                    <select
                      value={formData.taxRate}
                      onChange={e =>
                        setFormData({ ...formData, taxRate: parseInt(e.target.value) })
                      }
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
                    >
                      <option value={20}>20%</option>
                      <option value={13}>13%</option>
                      <option value={10}>10%</option>
                      <option value={0}>0%</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">Vorsteuer</label>
                    <div className="rounded-xl border-2 border-slate-200 bg-slate-100 px-4 py-3 font-bold text-emerald-600">
                      {formatCurrency(calculatedAmounts.tax)} €
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">Brutto</label>
                    <div className="rounded-xl border-2 border-amber-500 bg-amber-50 px-4 py-3 font-black text-slate-900">
                      {formatCurrency(calculatedAmounts.gross)} €
                    </div>
                  </div>
                </div>
              </div>

              {/* Kategorie (Standard + benutzerdefiniert) */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Kategorie</label>
                <div className="flex gap-2">
                  <select
                    value={formData.category}
                    onChange={e =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                    {customCategories.map(c => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddCustomCategory}
                    className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 transition-colors hover:bg-amber-100"
                  >
                    + Kategorie
                  </button>
                </div>
              </div>

              {/* Auftrag (für Marge-Berechnung) */}
              {projects.length > 0 && (
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Auftrag zuordnen
                  </label>
                  <select
                    value={formData.projectId ?? ''}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        projectId: e.target.value || undefined,
                      })
                    }
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">Kein Auftrag</option>
                    {projects
                      .slice()
                      .sort((a, b) =>
                        (b.orderDate || b.createdAt || '').localeCompare(
                          a.orderDate || a.createdAt || ''
                        )
                      )
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.orderNumber} – {p.customerName}
                        </option>
                      ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Verknüpfung ermöglicht automatische Marge-Berechnung aus Wareneinsatz
                  </p>
                </div>
              )}

              {/* Skonto (für Steuerberater separat) */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h4 className="mb-2 font-bold text-slate-900">Skonto (optional)</h4>
                <p className="mb-4 text-xs text-slate-500">
                  Wird beim Steuerberater separat angegeben – Vorsteuer bezieht sich auf den tatsächlich gezahlten Betrag.
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">Skonto %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.skontoPercent ?? ''}
                      onChange={e => {
                        const pct = e.target.value ? parseFloat(e.target.value) : undefined
                        const gross = calculatedAmounts.gross
                        const amount =
                          pct != null && gross > 0
                            ? Math.round(gross * (pct / 100) * 100) / 100
                            : undefined
                        setFormData({
                          ...formData,
                          skontoPercent: pct,
                          skontoAmount: amount,
                        })
                      }}
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
                      placeholder="z. B. 6"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">Skontobetrag €</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.skontoAmount ?? ''}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          skontoAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">Zahlungsbetrag</label>
                    <div className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-medium text-slate-700">
                      {formatCurrency(calculatedAmounts.gross - (formData.skontoAmount ?? 0))} €
                    </div>
                  </div>
                </div>
              </div>

              {/* Notizen */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Notizen</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
                  placeholder="Optionale Notizen..."
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingInvoice(null)
                  }}
                  className="flex-1 rounded-xl border-2 border-slate-200 px-6 py-3 font-bold text-slate-600 transition-all hover:bg-slate-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-white shadow-lg transition-all hover:bg-amber-600 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Speichern...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Speichern
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <h3 className="mb-6 text-xl font-black text-slate-900">Als bezahlt markieren</h3>
            <p className="mb-4 text-sm text-slate-600">
              Rechnung {payingInvoice.invoiceNumber} von {payingInvoice.supplierName}
            </p>
            <p className="mb-6 text-2xl font-black text-slate-900">
              {formatCurrency(payingInvoice.grossAmount)} €
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Bezahlt am</label>
                <input
                  type="date"
                  value={paidDate}
                  onChange={e => setPaidDate(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Zahlungsart</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
                >
                  <option value="bank">Überweisung</option>
                  <option value="cash">Bar</option>
                  <option value="credit_card">Kreditkarte</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => setPayingInvoice(null)}
                className="flex-1 rounded-xl border-2 border-slate-200 px-6 py-3 font-bold text-slate-600 transition-all hover:bg-slate-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleMarkPaid}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white shadow-lg transition-all hover:bg-emerald-600"
              >
                <CheckCircle2 className="h-5 w-5" />
                Bezahlt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
