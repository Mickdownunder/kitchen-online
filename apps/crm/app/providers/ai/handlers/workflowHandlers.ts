import { monthlyInstallationDeliveryWorkflow, invoiceWorkflow } from '@/lib/ai/workflows'
import { getProjects } from '@/lib/supabase/services'
import {
  getAllowedEmailRecipients,
  isEmailAllowed,
  formatWhitelistError,
} from '@/lib/ai/emailWhitelist'
import type { HandlerContext } from '../utils/handlerTypes'

export async function handleExecuteWorkflow(ctx: HandlerContext): Promise<string> {
  const { args } = ctx

  try {
    const workflowType = args.workflowType as string
    const workflowRecipientEmail = args.recipientEmail as string | undefined
    const workflowProjectIds = args.projectIds as string[] | undefined

    if (workflowType === 'monthlyInstallationDelivery') {
      if (!workflowRecipientEmail) {
        return '❌ recipientEmail ist erforderlich für monthlyInstallationDelivery Workflow'
      }

      // Whitelist: recipientEmail muss Projekt- oder Mitarbeiter-E-Mail sein
      const allProjects = await getProjects()
      const allowedEmails = await getAllowedEmailRecipients({
        projects: allProjects,
        includeEmployees: true,
      })
      const { allowed, disallowed } = isEmailAllowed(
        workflowRecipientEmail,
        allowedEmails
      )
      if (!allowed) {
        return formatWhitelistError(disallowed)
      }

      const result = await monthlyInstallationDeliveryWorkflow(workflowRecipientEmail)

      if (result.success) {
        return `✅ Workflow erfolgreich abgeschlossen. ${result.steps.filter(s => s.success).length}/${result.steps.length} Schritte erfolgreich.`
      } else {
        const failedSteps = result.steps.filter(s => !s.success)
        return `⚠️ Workflow teilweise fehlgeschlagen. ${failedSteps.length} Schritte fehlgeschlagen: ${failedSteps.map(s => s.name).join(', ')}`
      }
    } else if (workflowType === 'invoiceWorkflow') {
      if (!workflowRecipientEmail) {
        return '❌ recipientEmail ist erforderlich für invoiceWorkflow'
      }
      if (
        !workflowProjectIds ||
        !Array.isArray(workflowProjectIds) ||
        workflowProjectIds.length === 0
      ) {
        return '❌ projectIds ist erforderlich für invoiceWorkflow'
      }

      // Whitelist: recipientEmail muss aus betroffenen Projekten oder Mitarbeiter sein
      const allProjects = await getProjects()
      const workflowProjects = allProjects.filter(p =>
        workflowProjectIds.includes(p.id)
      )
      const allowedEmails = await getAllowedEmailRecipients({
        projects: workflowProjects,
        includeEmployees: true,
      })
      const { allowed, disallowed } = isEmailAllowed(
        workflowRecipientEmail,
        allowedEmails
      )
      if (!allowed) {
        return formatWhitelistError(disallowed)
      }

      const result = await invoiceWorkflow(workflowProjectIds, workflowRecipientEmail)

      if (result.success) {
        return `✅ Workflow erfolgreich abgeschlossen. ${result.steps.filter(s => s.success).length}/${result.steps.length} Schritte erfolgreich.`
      } else {
        const failedSteps = result.steps.filter(s => !s.success)
        return `⚠️ Workflow teilweise fehlgeschlagen. ${failedSteps.length} Schritte fehlgeschlagen: ${failedSteps.map(s => s.name).join(', ')}`
      }
    } else {
      return `❌ Unbekannter Workflow-Typ: ${workflowType}`
    }
  } catch (error: unknown) {
    console.error('Error executing workflow:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return `❌ Fehler beim Ausführen des Workflows: ${errorMessage}`
  }
}

export async function handleFindProjectsByCriteria(ctx: HandlerContext): Promise<string> {
  const { args } = ctx

  try {
    const statusFilter = args.status as string | undefined
    const installationDateFrom = args.installationDateFrom as string | undefined
    const installationDateTo = args.installationDateTo as string | undefined
    const customerNameFilter = args.customerName as string | undefined

    const allProjects = await getProjects()
    let filteredProjects = allProjects

    if (statusFilter) {
      filteredProjects = filteredProjects.filter(p => p.status === statusFilter)
    }

    if (installationDateFrom) {
      const fromDate = new Date(installationDateFrom)
      filteredProjects = filteredProjects.filter(p => {
        if (!p.installationDate) return false
        return new Date(p.installationDate) >= fromDate
      })
    }

    if (installationDateTo) {
      const toDate = new Date(installationDateTo)
      filteredProjects = filteredProjects.filter(p => {
        if (!p.installationDate) return false
        return new Date(p.installationDate) <= toDate
      })
    }

    if (customerNameFilter) {
      const customerNameLower = customerNameFilter.toLowerCase()
      filteredProjects = filteredProjects.filter(
        p =>
          p.customerName?.toLowerCase().includes(customerNameLower) ||
          p.orderNumber?.toLowerCase().includes(customerNameLower)
      )
    }

    return `✅ ${filteredProjects.length} Projekt(e) gefunden: ${filteredProjects.map(p => `${p.customerName} (${p.orderNumber})`).join(', ')}`
  } catch (error: unknown) {
    console.error('Error finding projects:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return `❌ Fehler beim Suchen von Projekten: ${errorMessage}`
  }
}
