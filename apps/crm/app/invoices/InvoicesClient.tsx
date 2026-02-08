'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useApp } from '../providers'
import InvoiceList from '@/components/InvoiceList'
import InvoiceView from '@/components/InvoiceView'
import AIAgentButton from '@/components/AIAgentButton'
import { getInvoice } from '@/lib/supabase/services/invoices'
import { ListInvoice, toListInvoice } from '@/hooks/useInvoiceFilters'

function InvoicesPageContent() {
  const { projects, refreshProjects, isLoading } = useApp()
  const searchParams = useSearchParams()
  const invoiceId = searchParams.get('invoiceId')

  const [directInvoice, setDirectInvoice] = useState<ListInvoice | null>(null)
  const [loadingInvoice, setLoadingInvoice] = useState(false)

  // Lade Rechnung direkt aus DB wenn invoiceId angegeben
  useEffect(() => {
    if (invoiceId) {
      setLoadingInvoice(true)
      getInvoice(invoiceId).then(result => {
        if (result.ok) {
          const invoice = result.data
          if (invoice) {
            const project = projects.find(p => p.id === invoice.projectId)
            if (project) {
              setDirectInvoice(toListInvoice(invoice, project))
            }
          }
        }
        setLoadingInvoice(false)
      })
    } else {
      setDirectInvoice(null)
    }
  }, [invoiceId, projects])

  // Show loading state
  if (isLoading || loadingInvoice) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
      </div>
    )
  }

  // Direkte Invoice-Ansicht wenn invoiceId vorhanden
  if (directInvoice) {
    return (
      <div className="min-h-screen bg-slate-100 p-4">
        <InvoiceView
          invoice={directInvoice}
          onBack={() => (window.location.href = '/invoices')}
          onPrint={() => setTimeout(() => window.print(), 500)}
        />
        <AIAgentButton />
      </div>
    )
  }

  // Standard: Rechnungsliste anzeigen
  return (
    <>
      <InvoiceList
        projects={projects}
        onProjectUpdate={() => refreshProjects(true, true)}
      />
      <AIAgentButton />
    </>
  )
}

export default function InvoicesClient() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
        </div>
      }
    >
      <InvoicesPageContent />
    </Suspense>
  )
}
