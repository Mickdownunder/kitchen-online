import type { CustomerProject, PlanningAppointment } from '@/types'
import { updateProject } from '@/lib/supabase/services'
import type { HandlerContext } from '../utils/handlerTypes'

export async function handleArchiveDocument(ctx: HandlerContext): Promise<string> {
  const { args, findProject, setProjects, timestamp } = ctx

  const project = findProject(args.projectId as string)
  if (!project) return '❌ Projekt nicht gefunden.'

  try {
    const documentType = args.documentType as string
    const deliveryDateArg = args.deliveryDate as string | undefined
    const updatedItemsArg = args.updatedItems as
      | Array<{ description?: string; purchasePrice?: number }>
      | undefined

    const updates: Partial<CustomerProject> = {
      notes: `${project.notes}\n${timestamp}: KI archivierte ${documentType}`,
    }
    if (deliveryDateArg) updates.deliveryDate = deliveryDateArg

    if (updatedItemsArg && updatedItemsArg.length > 0) {
      const items = project.items || []
      const updatedItems = items.map(item => {
        const match = updatedItemsArg.find(ui =>
          item.description?.toLowerCase().includes(ui.description?.toLowerCase() ?? '')
        )
        if (match && match.purchasePrice)
          return { ...item, purchasePricePerUnit: match.purchasePrice }
        return item
      })
      updates.items = updatedItems
    }

    const updated = await updateProject(project.id, updates)
    setProjects(prev => prev.map(p => (p.id === project.id ? updated : p)))
    return `✅ ${documentType} archiviert und Daten aktualisiert.`
  } catch (error) {
    console.error('Error archiving document:', error)
    return '❌ Fehler beim Archivieren.'
  }
}

export async function handleScheduleAppointment(ctx: HandlerContext): Promise<string> {
  const { args, findProject, setProjects, setAppointments, timestamp } = ctx

  if (!setAppointments) {
    return '❌ Interner Fehler: setAppointments fehlt.'
  }

  const projectIdArg = args.projectId as string | undefined
  const project = projectIdArg ? findProject(projectIdArg) : null

  try {
    const appointmentType = args.appointmentType as string
    const appointmentDate = args.date as string
    const appointmentTime = args.time as string | undefined
    const appointmentNotes = args.notes as string | undefined
    const customerNameArg = args.customerName as string | undefined

    if (
      !project ||
      appointmentType === 'Planung' ||
      appointmentType === 'Beratung' ||
      appointmentType === 'Consultation'
    ) {
      const newAppointment: PlanningAppointment = {
        id: 'appt-' + Date.now(),
        customerName: customerNameArg || project?.customerName || 'Unbekannt',
        date: appointmentDate,
        time: appointmentTime || '10:00',
        type: 'Consultation',
        notes: appointmentNotes || '',
      }

      setAppointments(prev => [...prev, newAppointment])
      return `✅ Planungstermin für "${newAppointment.customerName}" am ${appointmentDate}${appointmentTime ? ' um ' + appointmentTime : ''} erfasst.`
    }

    const updates: Partial<CustomerProject> = {
      notes: `${project.notes}\n${timestamp}: KI plante ${appointmentType} für ${appointmentDate}${appointmentTime ? ' um ' + appointmentTime : ''}`,
    }

    if (appointmentType === 'Aufmaß' || appointmentType === 'Aufmass') {
      updates.measurementDate = appointmentDate
      updates.isMeasured = false
    } else if (appointmentType === 'Montage' || appointmentType === 'Installation') {
      updates.installationDate = appointmentDate
      updates.isInstallationAssigned = true
    } else if (appointmentType === 'Lieferung' || appointmentType === 'Delivery') {
      updates.deliveryDate = appointmentDate
    }

    const updated = await updateProject(project.id, updates)
    setProjects(prev => prev.map(p => (p.id === project.id ? updated : p)))

    const calendarAppointment: PlanningAppointment = {
      id: 'appt-' + Date.now(),
      customerName: project.customerName,
      date: appointmentDate,
      time: appointmentTime || '10:00',
      type: appointmentType === 'Montage' ? 'Installation' : 'Consultation',
      notes: `${appointmentType} für ${project.orderNumber}`,
    }
    setAppointments(prev => [...prev, calendarAppointment])

    return `✅ ${appointmentType}-Termin für ${project.customerName} (${project.orderNumber}) am ${appointmentDate}${appointmentTime ? ' um ' + appointmentTime : ''} geplant.`
  } catch (error) {
    console.error('Error scheduling appointment:', error)
    return '❌ Fehler beim Planen des Termins.'
  }
}
