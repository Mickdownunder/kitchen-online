import type React from 'react'
import type { CustomerDeliveryNote, CustomerProject } from '@/types'
import { updateProject } from '@/lib/supabase/services'
import { logger } from '@/lib/utils/logger'

export function scheduleDeliveryDateBackgroundCheck(opts: {
  projects: CustomerProject[]
  customerDeliveryNotes: CustomerDeliveryNote[]
  setProjects: React.Dispatch<React.SetStateAction<CustomerProject[]>>
}): () => void {
  const timeoutId = setTimeout(async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      let hasUpdates = false

      const notesByProject = new Map<string, CustomerDeliveryNote[]>()
      opts.customerDeliveryNotes.forEach(note => {
        if (!notesByProject.has(note.projectId)) notesByProject.set(note.projectId, [])
        notesByProject.get(note.projectId)!.push(note)
      })

      const updatedProjects = opts.projects.map(project => {
        if (project.isDelivered) return project

        const projectNotes = notesByProject.get(project.id) || []
        const relevantNote = projectNotes.find(
          note => note.deliveryDate && note.deliveryDate <= today && note.status === 'draft'
        )

        if (relevantNote) {
          hasUpdates = true
          return { ...project, isDelivered: true, deliveryDate: relevantNote.deliveryDate }
        }

        return project
      })

      if (hasUpdates) {
        opts.setProjects(updatedProjects)

        updatedProjects.forEach(async (project, idx) => {
          if (project.isDelivered !== opts.projects[idx].isDelivered) {
            try {
              const updateResult = await updateProject(project.id, { deliveryDate: project.deliveryDate })
              if (!updateResult.ok) throw new Error(updateResult.message)
            } catch {
              logger.debug('Could not update delivery date', {
                component: 'deliveryDateBackground',
                projectId: project.id,
              })
            }
          }
        })
      }
    } catch {
      logger.debug('Error checking delivery dates', { component: 'deliveryDateBackground' })
    }
  }, 2000)

  return () => clearTimeout(timeoutId)
}
