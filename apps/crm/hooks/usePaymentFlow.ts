'use client'

import { useCallback, useEffect } from 'react'
import { usePaymentFormState } from '@/hooks/usePaymentFormState'
import { usePaymentProjectData } from '@/hooks/usePaymentProjectData'
import {
  deleteFinalInvoice,
  generateFinalInvoice,
  markPaymentAsPaid,
  removePayment,
  savePayment,
  unmarkPaymentAsPaid,
} from '@/hooks/paymentFlow.actions'
import type { CustomerProject } from '@/types'
import type { UsePaymentFlowOptions, UsePaymentFlowResult } from '@/hooks/payments.types'

export function usePaymentFlow({
  projects,
  projectIdParam,
}: UsePaymentFlowOptions): UsePaymentFlowResult {
  const projectData = usePaymentProjectData({
    projects,
    projectIdParam,
  })

  const formState = usePaymentFormState({
    grossTotal: projectData.calculations.grossTotal,
  })

  const {
    editingPaymentId,
    newPaymentForm,
    setNewPaymentForm,
    percentInput,
    editingPercentInput,
    invoiceNumber,
    setInvoiceNumber,
    suggestedInvoiceNumber,
    resetForm,
    handleQuickPercent,
    handlePercentChange,
    handlePercentBlur,
    handleEditingPercentChange,
    handleEditingPercentBlur,
    startNewPayment,
    startEditPayment,
  } = formState

  useEffect(() => {
    if (projectData.selectedProject?.id) {
      resetForm()
    }
  }, [projectData.selectedProject?.id, resetForm])

  const handleSelectProject = useCallback(
    (project: CustomerProject): void => {
      projectData.setSelectedProject(project)
      resetForm()
    },
    [projectData, resetForm],
  )

  const handleSavePayment = useCallback(
    async (projectId: string): Promise<void> => {
      const ok = await savePayment({
        projectId,
        paymentForm: newPaymentForm,
        editingPaymentId,
        invoiceNumber,
      })
      if (!ok) {
        return
      }
      await projectData.loadProjectInvoices(projectId)
      resetForm()
    },
    [editingPaymentId, invoiceNumber, newPaymentForm, projectData, resetForm],
  )

  const handleDeletePayment = useCallback(
    async (projectId: string, paymentId: string): Promise<void> => {
      const ok = await removePayment(paymentId)
      if (!ok) {
        return
      }
      await projectData.loadProjectInvoices(projectId)
    },
    [projectData],
  )

  const handleMarkPaymentPaid = useCallback(
    async (paymentId: string, paidDate: string): Promise<void> => {
      if (!projectData.selectedProject) {
        return
      }
      const ok = await markPaymentAsPaid(paymentId, paidDate)
      if (!ok) {
        return
      }
      await projectData.loadProjectInvoices(projectData.selectedProject.id)
    },
    [projectData],
  )

  const handleUnmarkPaymentPaid = useCallback(
    async (paymentId: string): Promise<void> => {
      if (!projectData.selectedProject) {
        return
      }
      const ok = await unmarkPaymentAsPaid(paymentId)
      if (!ok) {
        return
      }
      await projectData.loadProjectInvoices(projectData.selectedProject.id)
    },
    [projectData],
  )

  const handleGenerateFinalInvoice = useCallback(
    async (invoiceDate: string): Promise<void> => {
      const ok = await generateFinalInvoice({
        selectedProject: projectData.selectedProject,
        projects,
        partialPayments: projectData.partialPayments,
        finalInvoice: projectData.finalInvoice,
        invoiceDate,
      })
      if (!ok || !projectData.selectedProject) {
        return
      }
      await projectData.loadProjectInvoices(projectData.selectedProject.id)
    },
    [projectData, projects],
  )

  const handleMarkFinalInvoicePaid = useCallback(
    async (paidDate: string): Promise<void> => {
      if (!projectData.finalInvoice || !projectData.selectedProject) {
        return
      }
      const ok = await markPaymentAsPaid(projectData.finalInvoice.id, paidDate)
      if (!ok) {
        return
      }
      await projectData.loadProjectInvoices(projectData.selectedProject.id)
    },
    [projectData],
  )

  const handleUnmarkFinalInvoicePaid = useCallback(async (): Promise<void> => {
    if (!projectData.finalInvoice || !projectData.selectedProject) {
      return
    }
    const ok = await unmarkPaymentAsPaid(projectData.finalInvoice.id)
    if (!ok) {
      return
    }
    await projectData.loadProjectInvoices(projectData.selectedProject.id)
  }, [projectData])

  const handleDeleteFinalInvoice = useCallback(async (): Promise<void> => {
    if (!projectData.finalInvoice || !projectData.selectedProject) {
      return
    }
    const ok = await deleteFinalInvoice(projectData.finalInvoice)
    if (!ok) {
      return
    }
    await projectData.loadProjectInvoices(projectData.selectedProject.id)
  }, [projectData])

  return {
    selectedProject: projectData.selectedProject,
    editingPaymentId,
    newPaymentForm,
    setNewPaymentForm,
    percentInput,
    editingPercentInput,
    invoices: projectData.invoices,
    loadingInvoices: projectData.loadingInvoices,
    invoiceNumber,
    setInvoiceNumber,
    suggestedInvoiceNumber,
    partialPayments: projectData.partialPayments,
    finalInvoice: projectData.finalInvoice,
    calculations: projectData.calculations,
    showProjectList: projectData.showProjectList,
    resetForm,
    handleSelectProject,
    handleQuickPercent,
    handlePercentChange,
    handlePercentBlur,
    handleEditingPercentChange,
    handleEditingPercentBlur,
    handleSavePayment,
    handleDeletePayment,
    handleMarkPaymentPaid,
    handleUnmarkPaymentPaid,
    handleGenerateFinalInvoice,
    handleMarkFinalInvoicePaid,
    handleUnmarkFinalInvoicePaid,
    handleDeleteFinalInvoice,
    startNewPayment: () => startNewPayment(Boolean(projectData.selectedProject), projectData.partialPayments.length),
    startEditPayment,
  }
}
