import {
  createComplaint,
  getComplaints,
  updateComplaint,
  updateProject,
} from '@/lib/supabase/services'
import type { HandlerContext } from '../utils/handlerTypes'

export async function handleCreateComplaint(ctx: HandlerContext): Promise<string> {
  const { args, findProject, setProjects } = ctx

  const project = findProject(args.projectId as string)
  if (!project) return '❌ Projekt nicht gefunden.'

  try {
    const complaintDescription = args.description as string
    const priority = (args.priority as string) || 'medium'
    const newComplaint = await createComplaint({
      projectId: project.id,
      description: complaintDescription,
      status: 'reported',
      priority: priority as 'low' | 'medium' | 'high' | 'urgent',
      affectedItemIds: (args.affectedItemIds as string[]) || [],
      supplierId: args.supplierId as string | undefined,
      supplierName: args.supplierName as string | undefined,
      originalOrderNumber: args.originalOrderNumber as string | undefined,
      complaintOrderNumber: args.complaintOrderNumber as string | undefined,
      reportedAt: new Date().toISOString(),
      internalNotes: args.internalNotes as string | undefined,
    })

    const noteDate = new Date().toLocaleDateString('de-DE')
    await updateProject(project.id, {
      notes: `${project.notes || ''}\n${noteDate}: KI erfasste Reklamation: ${complaintDescription}`,
    })

    setProjects(prev =>
      prev.map(p =>
        p.id === project.id
          ? {
              ...p,
              notes: `${p.notes || ''}\n${noteDate}: KI erfasste Reklamation: ${complaintDescription}`,
            }
          : p
      )
    )

    return `✅ Reklamation erfasst: "${complaintDescription}" (ID: ${newComplaint.id})`
  } catch (error: unknown) {
    console.error('Error creating complaint:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return `❌ Fehler beim Erfassen der Reklamation: ${errorMessage}`
  }
}

export async function handleUpdateComplaintStatus(ctx: HandlerContext): Promise<string> {
  const { args, findProject, setProjects } = ctx

  try {
    // Hole Complaint aus DB
    const complaints = await getComplaints(args.projectId as string)
    const complaint = complaints.find(c => c.id === (args.complaintId as string))

    if (!complaint) {
      return '❌ Reklamation nicht gefunden.'
    }

    // Status-Mapping: Alte Status-Namen zu neuen
    const statusMap: Record<
      string,
      'draft' | 'reported' | 'ab_confirmed' | 'delivered' | 'installed' | 'resolved'
    > = {
      Open: 'reported',
      InProgress: 'ab_confirmed',
      Resolved: 'resolved',
    }

    const statusArg = args.status as string
    const newStatus =
      statusMap[statusArg] ||
      (statusArg as 'draft' | 'reported' | 'ab_confirmed' | 'delivered' | 'installed' | 'resolved')

    await updateComplaint(args.complaintId as string, {
      status: newStatus,
    })

    const project = findProject(args.projectId as string)
    if (project) {
      const noteDate = new Date().toLocaleDateString('de-DE')
      await updateProject(project.id, {
        notes: `${project.notes || ''}\n${noteDate}: KI setzte Reklamationsstatus auf ${newStatus}`,
      })
      setProjects(prev =>
        prev.map(p =>
          p.id === project.id
            ? {
                ...p,
                notes: `${p.notes || ''}\n${noteDate}: KI setzte Reklamationsstatus auf ${newStatus}`,
              }
            : p
        )
      )
    }

    return `✅ Reklamationsstatus auf "${newStatus}" gesetzt.`
  } catch (error: unknown) {
    console.error('Error updating complaint:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return `❌ Fehler beim Aktualisieren: ${errorMessage}`
  }
}
