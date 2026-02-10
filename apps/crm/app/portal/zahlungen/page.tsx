'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, CircleDollarSign, Clock, CreditCard, Loader2 } from 'lucide-react'
import { portalSupabase } from '@/lib/supabase/portal-client'
import { useProject } from '../context/ProjectContext'
import { useCustomerApi } from '../hooks/useCustomerApi'
import { formatCurrency, InvoiceCard, type Invoice, type ProjectPaymentInfo } from './zahlungen.ui'

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
      const { data: invoicesData, error: invoicesError } = await portalSupabase
        .from('invoices')
        .select('id, invoice_number, type, amount, invoice_date, due_date, is_paid, paid_date, description')
        .eq('project_id', projectId)
        .order('invoice_date', { ascending: false })

      if (invoicesError) {
        throw invoicesError
      }

      const { data: projectData, error: projectError } = await portalSupabase
        .from('projects')
        .select('id, total_amount, deposit_amount, is_deposit_paid, is_final_paid')
        .eq('id', projectId)
        .single()

      if (projectError) {
        throw projectError
      }

      setInvoices(invoicesData || [])
      setProjectInfo({
        totalAmount: projectData?.total_amount || 0,
        depositAmount: projectData?.deposit_amount || 0,
        isDepositPaid: projectData?.is_deposit_paid || false,
        isFinalPaid: projectData?.is_final_paid || false,
      })
    } catch {
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

  const totalInvoiced = invoices.reduce((sum, invoice) => sum + invoice.amount, 0)
  const totalPaid = invoices.filter((invoice) => invoice.is_paid).reduce((sum, invoice) => sum + invoice.amount, 0)
  const totalOpen = totalInvoiced - totalPaid
  const openInvoices = invoices.filter((invoice) => !invoice.is_paid)
  const paidInvoices = invoices.filter((invoice) => invoice.is_paid)

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto h-12 w-12">
            <div className="absolute inset-0 animate-ping rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-20" />
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Zahlungen</h1>
        <p className="mt-1 text-slate-500">Übersicht Ihrer Rechnungen und Zahlungen</p>
      </div>

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
            {openInvoices.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}
          </div>
        </div>
      )}

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
            {paidInvoices.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}
          </div>
        </div>
      )}

      {invoices.length === 0 && (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200/50">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <CreditCard className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-slate-900">Keine Rechnungen</h2>
          <p className="mt-2 text-slate-500">Sobald Rechnungen erstellt werden, erscheinen sie hier.</p>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100 p-4 ring-1 ring-slate-200/50">
        <p className="text-sm text-slate-600">
          <strong className="text-slate-700">Hinweis:</strong> PDF-Rechnungen finden Sie auch im
          Bereich &quot;Dokumente&quot;. Bei Fragen zu Zahlungen kontaktieren Sie uns gerne.
        </p>
      </div>
    </div>
  )
}
