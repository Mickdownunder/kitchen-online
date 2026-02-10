'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getInvoices } from '@/lib/supabase/services'
import type { CustomerProject, Invoice } from '@/types'
import type { ProjectCalculations } from '@/hooks/payments.types'

interface UsePaymentProjectDataOptions {
  projects: CustomerProject[]
  projectIdParam: string | null
}

interface UsePaymentProjectDataResult {
  selectedProject: CustomerProject | null
  setSelectedProject: (project: CustomerProject | null) => void
  invoices: Invoice[]
  loadingInvoices: boolean
  loadProjectInvoices: (projectId: string) => Promise<void>
  calculations: ProjectCalculations
  partialPayments: Invoice[]
  finalInvoice: Invoice | undefined
  showProjectList: boolean
}

export function usePaymentProjectData({
  projects,
  projectIdParam,
}: UsePaymentProjectDataOptions): UsePaymentProjectDataResult {
  const [selectedProject, setSelectedProject] = useState<CustomerProject | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)

  const loadProjectInvoices = useCallback(async (projectId: string): Promise<void> => {
    setLoadingInvoices(true)
    try {
      const result = await getInvoices(projectId)
      if (result.ok) {
        setInvoices(result.data)
      } else {
        alert('Fehler beim Laden der Rechnungen')
      }
    } finally {
      setLoadingInvoices(false)
    }
  }, [])

  useEffect(() => {
    let isActive = true

    if (selectedProject?.id) {
      const timer = window.setTimeout(() => {
        if (isActive) {
          void loadProjectInvoices(selectedProject.id)
        }
      }, 0)

      return () => {
        isActive = false
        window.clearTimeout(timer)
      }
    }

    const timer = window.setTimeout(() => {
      if (isActive) {
        setInvoices([])
      }
    }, 0)

    return () => {
      isActive = false
      window.clearTimeout(timer)
    }
  }, [loadProjectInvoices, selectedProject?.id])

  useEffect(() => {
    if (!projectIdParam || projects.length === 0) {
      return
    }

    const project = projects.find((projectItem) => projectItem.id === projectIdParam)
    if (!project || project.id === selectedProject?.id) {
      return
    }

    const timer = window.setTimeout(() => {
      setSelectedProject(project)
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [projectIdParam, projects, selectedProject?.id])

  const calculations = useMemo<ProjectCalculations>(() => {
    if (!selectedProject) {
      return { grossTotal: 0, netTotal: 0, taxTotal: 0 }
    }

    return {
      grossTotal: selectedProject.totalAmount || 0,
      netTotal: selectedProject.netAmount || 0,
      taxTotal: selectedProject.taxAmount || 0,
    }
  }, [selectedProject])

  const partialPayments = useMemo(
    () => invoices.filter((invoice) => invoice.type === 'partial'),
    [invoices],
  )
  const finalInvoice = useMemo(
    () => invoices.find((invoice) => invoice.type === 'final'),
    [invoices],
  )

  return {
    selectedProject,
    setSelectedProject,
    invoices,
    loadingInvoices,
    loadProjectInvoices,
    calculations,
    partialPayments,
    finalInvoice,
    showProjectList: !projectIdParam,
  }
}
