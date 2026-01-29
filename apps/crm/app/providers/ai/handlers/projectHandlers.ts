import { ProjectStatus, type CustomerProject } from '@/types'
import { createProject, getCustomers, updateProject } from '@/lib/supabase/services'
import type { HandlerContext } from '../utils/handlerTypes'

export async function handleCreateProject(ctx: HandlerContext): Promise<string> {
  const { args, setProjects } = ctx

  try {
    const customerName = args.customerName as string
    const address = args.address as string | undefined
    const phone = args.phone as string | undefined
    const email = args.email as string | undefined
    const totalAmount = (args.totalAmount as number) || 0
    const orderNumber = (args.orderNumber as string) || `K-AUTO-${Date.now().toString().slice(-4)}`
    const salespersonName = args.salespersonName as string | undefined
    const notes = args.notes as string | undefined

    // Dependency Check: Prüfe ob Kunde existiert
    const customers = await getCustomers()
    const customerExists = customers.some(
      c =>
        c.firstName?.toLowerCase() === customerName?.toLowerCase() ||
        c.lastName?.toLowerCase() === customerName?.toLowerCase() ||
        c.companyName?.toLowerCase() === customerName?.toLowerCase() ||
        `${c.firstName} ${c.lastName}`.toLowerCase() === customerName?.toLowerCase()
    )

    if (!customerExists) {
      return `❌ Fehler: Kunde "${customerName}" existiert nicht im Kundenstamm. Bitte zuerst mit createCustomer anlegen.`
    }

    const noteDate = new Date().toLocaleDateString('de-DE')
    const newProject = await createProject({
      customerName,
      address,
      phone,
      email,
      totalAmount,
      netAmount: totalAmount / 1.2,
      taxAmount: totalAmount - totalAmount / 1.2,
      orderNumber,
      salespersonName,
      status: ProjectStatus.PLANNING,
      items: [],
      depositAmount: totalAmount * 0.3,
      isDepositPaid: false,
      isFinalPaid: false,
      isMeasured: false,
      isOrdered: false,
      isInstallationAssigned: false,
      documents: [],
      complaints: [],
      notes: `${noteDate}: Projekt von KI angelegt.${notes ? '\n' + noteDate + ': ' + notes : ''}`,
    })

    // Validation: Prüfe ob Projekt wirklich angelegt wurde
    if (!newProject || newProject.customerName !== customerName) {
      return '❌ Fehler: Projekt wurde nicht korrekt angelegt. Bitte manuell prüfen.'
    }

    setProjects(prev => [newProject, ...prev])
    return `✅ Projekt für "${customerName}" angelegt (Auftragsnummer: ${newProject.orderNumber}). Projekt-ID: ${newProject.id}`
  } catch (error: unknown) {
    console.error('Error creating project:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return `❌ Fehler beim Erstellen des Projekts: ${errorMessage}`
  }
}

export async function handleUpdateProjectDetails(ctx: HandlerContext): Promise<string> {
  const { args, findProject, setProjects, timestamp } = ctx

  const project = findProject(args.projectId as string)
  if (!project) return '❌ Projekt nicht gefunden.'

  try {
    const updates: Partial<CustomerProject> = {}
    if (args.newStatus) updates.status = args.newStatus as ProjectStatus
    if (args.deliveryDate) updates.deliveryDate = args.deliveryDate as string
    if (args.installationDate) updates.installationDate = args.installationDate as string
    if (args.salespersonName) updates.salespersonName = args.salespersonName as string
    updates.notes = `${project.notes}\n${timestamp}: KI aktualisierte Projektdetails.`

    const updated = await updateProject(project.id, updates)
    setProjects(prev => prev.map(p => (p.id === project.id ? updated : p)))
    return '✅ Projektdetails aktualisiert.'
  } catch (error) {
    console.error('Error updating project details:', error)
    return '❌ Fehler beim Aktualisieren.'
  }
}

export async function handleUpdateCustomerInfo(ctx: HandlerContext): Promise<string> {
  const { args, findProject, setProjects, timestamp } = ctx

  const project = findProject(args.projectId as string)
  if (!project) return '❌ Projekt nicht gefunden.'

  try {
    const updates: Partial<CustomerProject> = {
      notes: `${project.notes}\n${timestamp}: KI aktualisierte Kundendaten.`,
    }
    if (args.customerName) updates.customerName = args.customerName as string
    if (args.address) updates.address = args.address as string
    if (args.phone) updates.phone = args.phone as string
    if (args.email) updates.email = args.email as string

    const updated = await updateProject(project.id, updates)
    setProjects(prev => prev.map(p => (p.id === project.id ? updated : p)))
    return '✅ Kundendaten aktualisiert.'
  } catch (error) {
    console.error('Error updating customer info:', error)
    return '❌ Fehler beim Aktualisieren.'
  }
}

export async function handleUpdateWorkflowStatus(ctx: HandlerContext): Promise<string> {
  const { args, findProject, setProjects, timestamp } = ctx

  const project = findProject(args.projectId as string)
  if (!project) return '❌ Projekt nicht gefunden.'

  try {
    const updates: Partial<CustomerProject> = {
      notes: `${project.notes}\n${timestamp}: KI aktualisierte Workflow-Status.`,
    }
    if (args.isMeasured !== undefined) updates.isMeasured = args.isMeasured as boolean
    if (args.measurementDate) updates.measurementDate = args.measurementDate as string
    if (args.isOrdered !== undefined) updates.isOrdered = args.isOrdered as boolean
    if (args.orderDate) updates.orderDate = args.orderDate as string
    if (args.isInstallationAssigned !== undefined)
      updates.isInstallationAssigned = args.isInstallationAssigned as boolean
    if (args.installationDate) updates.installationDate = args.installationDate as string

    const updated = await updateProject(project.id, updates)
    setProjects(prev => prev.map(p => (p.id === project.id ? updated : p)))
    return '✅ Workflow-Status aktualisiert.'
  } catch (error) {
    console.error('Error updating workflow:', error)
    return '❌ Fehler beim Aktualisieren.'
  }
}

export async function handleAddProjectNote(ctx: HandlerContext): Promise<string> {
  const { args, findProject, setProjects } = ctx

  const project = findProject(args.projectId as string)
  if (!project) return '❌ Projekt nicht gefunden.'

  const noteText = args.note as string | undefined
  if (!noteText || noteText.trim() === '') return '❌ Notiz-Text fehlt.'

  try {
    const noteDate = new Date().toLocaleDateString('de-DE')
    const noteContent = noteText.trim()

    const updated = await updateProject(project.id, {
      notes: `${project.notes || ''}\n${noteDate}: ${noteContent}`,
    })
    setProjects(prev => prev.map(p => (p.id === project.id ? updated : p)))
    return `✅ Notiz hinzugefügt: "${noteContent}"`
  } catch (error) {
    console.error('Error adding note:', error)
    return '❌ Fehler beim Hinzufügen der Notiz.'
  }
}

export async function handleUpdateFinancialAmounts(ctx: HandlerContext): Promise<string> {
  const { args, findProject, setProjects, timestamp } = ctx

  const project = findProject(args.projectId as string)
  if (!project) return '❌ Projekt nicht gefunden.'

  try {
    const totalAmount = args.totalAmount as number | undefined
    const depositAmount = args.depositAmount as number | undefined
    const updates: Partial<CustomerProject> = {
      notes: `${project.notes}\n${timestamp}: KI aktualisierte Finanzbeträge.`,
    }
    if (totalAmount !== undefined) {
      updates.totalAmount = totalAmount
      updates.netAmount = totalAmount / 1.2
      updates.taxAmount = totalAmount - totalAmount / 1.2
    }
    if (depositAmount !== undefined) updates.depositAmount = depositAmount

    const updated = await updateProject(project.id, updates)
    setProjects(prev => prev.map(p => (p.id === project.id ? updated : p)))
    return '✅ Finanzbeträge aktualisiert.'
  } catch (error) {
    console.error('Error updating amounts:', error)
    return '❌ Fehler beim Aktualisieren.'
  }
}

export async function handleUpdatePaymentStatus(ctx: HandlerContext): Promise<string> {
  const { args, findProject, setProjects, timestamp } = ctx

  const project = findProject(args.projectId as string)
  if (!project) return '❌ Projekt nicht gefunden.'

  try {
    const depositPaid = args.depositPaid as boolean | undefined
    const finalPaid = args.finalPaid as boolean | undefined
    const updates: Partial<CustomerProject> = {
      notes: `${project.notes}\n${timestamp}: KI aktualisierte Zahlungsstatus.`,
    }

    if (depositPaid !== undefined) {
      updates.isDepositPaid = depositPaid
      if (project.partialPayments && project.partialPayments.length > 0) {
        const updatedPayments = [...project.partialPayments]
        updatedPayments[0] = {
          ...updatedPayments[0],
          isPaid: depositPaid,
          paidDate: depositPaid ? new Date().toISOString().split('T')[0] : undefined,
        }
        updates.partialPayments = updatedPayments
      }
    }

    if (finalPaid !== undefined) {
      updates.isFinalPaid = finalPaid
      if (project.finalInvoice) {
        updates.finalInvoice = {
          ...project.finalInvoice,
          isPaid: finalPaid,
          paidDate: finalPaid ? new Date().toISOString().split('T')[0] : undefined,
        }
      }
    }

    const updated = await updateProject(project.id, updates)
    setProjects(prev => prev.map(p => (p.id === project.id ? updated : p)))
    return '✅ Zahlungsstatus aktualisiert.'
  } catch (error) {
    console.error('Error updating payment status:', error)
    return '❌ Fehler beim Aktualisieren.'
  }
}

export async function handleUpdateInvoiceNumber(ctx: HandlerContext): Promise<string> {
  const { args, findProject, setProjects, timestamp } = ctx

  const project = findProject(args.projectId as string)
  if (!project) return '❌ Projekt nicht gefunden.'

  try {
    const invoiceNumber = args.invoiceNumber as string
    const updated = await updateProject(project.id, {
      invoiceNumber,
      notes: `${project.notes}\n${timestamp}: KI setzte Rechnungsnummer auf ${invoiceNumber}.`,
    })
    setProjects(prev => prev.map(p => (p.id === project.id ? updated : p)))
    return '✅ Rechnungsnummer aktualisiert.'
  } catch (error) {
    console.error('Error updating invoice number:', error)
    return '❌ Fehler beim Aktualisieren.'
  }
}
