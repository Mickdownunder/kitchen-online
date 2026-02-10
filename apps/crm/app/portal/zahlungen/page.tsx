'use client'

import { useEffect, useState, useCallback } from 'react'
import { portalSupabase } from '@/lib/supabase/portal-client'
import { 
  CreditCard,
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Download,
  Receipt,
  CircleDollarSign
} from 'lucide-react'
import { useCustomerApi } from '../hooks/useCustomerApi'
import { useProject } from '../context/ProjectContext'

interface Invoice {
  id: string
  invoice_number: string
  type: 'partial' | 'final' | 'credit'
  amount: number
  invoice_date: string
  due_date: string | null
  is_paid: boolean
  paid_date: string | null
  description: string | null
}

interface ProjectPaymentInfo {
  totalAmount: number
  depositAmount: number
  isDepositPaid: boolean
  isFinalPaid: boolean
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '-'
  }
}

function isOverdue(dueDate: string | null, isPaid: boolean): boolean {
  if (isPaid || !dueDate) return false
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}

function InvoiceCard({ 
  invoice,
  onDownload,
}: { 
  invoice: Invoice
  onDownload?: () => Promise<void>
}) {
  const [isDownloading, setIsDownloading] = useState(false)
  const overdue = isOverdue(invoice.due_date, invoice.is_paid)

  const handleDownload = async () => {
    if (!onDownload) return
    setIsDownloading(true)
    try {
      await onDownload()
    } catch (error) {
      console.warn('Download error:', error)
      alert('Fehler beim Download')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className={`group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 transition-all duration-300 hover:shadow-lg ${
      invoice.is_paid 
        ? 'ring-emerald-200/50' 
        : overdue 
          ? 'ring-red-200' 
          : 'ring-slate-200/50 hover:shadow-slate-200/50'
    }`}>
      {/* Status Badge */}
      <div className="absolute right-4 top-4">
        {invoice.is_paid ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Bezahlt
          </span>
        ) : overdue ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
            <AlertCircle className="h-3.5 w-3.5" />
            Überfällig
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
            <Clock className="h-3.5 w-3.5" />
            Offen
          </span>
        )}
      </div>

      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
          invoice.type === 'final' ? 'bg-purple-50' : 'bg-blue-50'
        }`}>
          {invoice.type === 'final' ? (
            <Receipt className={`h-6 w-6 text-purple-600`} />
          ) : (
            <FileText className={`h-6 w-6 text-blue-600`} />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className={`font-semibold ${invoice.type === 'credit' ? 'text-red-600' : 'text-slate-900'}`}>
                {invoice.type === 'credit' ? 'Stornorechnung' : invoice.type === 'final' ? 'Schlussrechnung' : 'Teilrechnung'}
              </h3>
              <p className="text-sm text-slate-500">{invoice.invoice_number}</p>
            </div>
          </div>
          
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(invoice.amount)}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Rechnungsdatum</span>
              <p className="font-medium text-slate-700">{formatDate(invoice.invoice_date)}</p>
            </div>
            <div>
              <span className="text-slate-500">Fällig am</span>
              <p className={`font-medium ${overdue ? 'text-red-600' : 'text-slate-700'}`}>
                {formatDate(invoice.due_date)}
              </p>
            </div>
          </div>

          {invoice.is_paid && invoice.paid_date && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <span className="text-sm text-emerald-600">
                Bezahlt am {formatDate(invoice.paid_date)}
              </span>
            </div>
          )}

          {invoice.description && (
            <p className="mt-3 text-sm text-slate-500 border-t border-slate-100 pt-3">
              {invoice.description}
            </p>
          )}

          {onDownload && (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-200 disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              PDF herunterladen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PortalZahlungenPage() {
  const { accessToken, isReady } = useCustomerApi()
  const { selectedProject, isLoading: projectLoading } = useProject()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [projectInfo, setProjectInfo] = useState<ProjectPaymentInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (projectId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch invoices for the selected project
      const { data: invoicesData, error: invoicesError } = await portalSupabase
        .from('invoices')
        .select('id, invoice_number, type, amount, invoice_date, due_date, is_paid, paid_date, description')
        .eq('project_id', projectId)
        .order('invoice_date', { ascending: false })

      if (invoicesError) throw invoicesError

      // Fetch project payment info for the selected project
      const { data: projectData, error: projectError } = await portalSupabase
        .from('projects')
        .select('id, total_amount, deposit_amount, is_deposit_paid, is_final_paid')
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError

      setInvoices(invoicesData || [])
      setProjectInfo({
        totalAmount: projectData?.total_amount || 0,
        depositAmount: projectData?.deposit_amount || 0,
        isDepositPaid: projectData?.is_deposit_paid || false,
        isFinalPaid: projectData?.is_final_paid || false,
      })
    } catch (err) {
      console.warn('Error loading payment data:', err)
      setError('Zahlungsdaten konnten nicht geladen werden.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isReady && accessToken && selectedProject?.id && !projectLoading) {
      loadData(selectedProject.id)
    } else if (isReady && !accessToken) {
      setIsLoading(false)
      setError('NOT_AUTHENTICATED')
    }
  }, [isReady, accessToken, selectedProject?.id, projectLoading, loadData])

  // Calculate totals
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0)
  const totalPaid = invoices.filter(inv => inv.is_paid).reduce((sum, inv) => sum + inv.amount, 0)
  const totalOpen = totalInvoiced - totalPaid
  const openInvoices = invoices.filter(inv => !inv.is_paid)
  const paidInvoices = invoices.filter(inv => inv.is_paid)

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto h-12 w-12">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-20 animate-ping" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          </div>
          <p className="mt-4 text-slate-500">Zahlungsdaten werden geladen...</p>
        </div>
      </div>
    )
  }

  if (error === 'NOT_AUTHENTICATED') {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-slate-900">Nicht angemeldet</h2>
          <p className="mt-2 text-slate-500">Bitte melden Sie sich erneut an.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Zahlungen</h1>
        <p className="mt-1 text-slate-500">
          Übersicht Ihrer Rechnungen und Zahlungen
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <CircleDollarSign className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Gesamtbetrag</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(projectInfo?.totalAmount || 0)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Bezahlt</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Offen</p>
              <p className="text-xl font-bold text-amber-600">{formatCurrency(totalOpen)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Open Invoices */}
      {openInvoices.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Offene Rechnungen</h2>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              {openInvoices.length}
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {openInvoices.map(invoice => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
              />
            ))}
          </div>
        </div>
      )}

      {/* Paid Invoices */}
      {paidInvoices.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Bezahlte Rechnungen</h2>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              {paidInvoices.length}
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {paidInvoices.map(invoice => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Invoices */}
      {invoices.length === 0 && (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200/50">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <CreditCard className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-slate-900">Keine Rechnungen</h2>
          <p className="mt-2 text-slate-500">
            Sobald Rechnungen erstellt werden, erscheinen sie hier.
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100 p-4 ring-1 ring-slate-200/50">
        <p className="text-sm text-slate-600">
          <strong className="text-slate-700">Hinweis:</strong> PDF-Rechnungen finden Sie auch im
          Bereich &quot;Dokumente&quot;. Bei Fragen zu Zahlungen kontaktieren Sie uns gerne.
        </p>
      </div>
    </div>
  )
}
