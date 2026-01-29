import type React from 'react'
import type { CustomerProject, PlanningAppointment } from '@/types'

// Type for function call arguments - intentionally loose to handle AI responses
export type FunctionCallArgs = Record<string, unknown>

// Context passed to all handlers
export interface HandlerContext {
  args: FunctionCallArgs
  projects: CustomerProject[]
  setProjects: React.Dispatch<React.SetStateAction<CustomerProject[]>>
  setAppointments?: React.Dispatch<React.SetStateAction<PlanningAppointment[]>>
  findProject: (idOrName: string) => CustomerProject | undefined
  timestamp: string
}

// Handler function signature
export type HandlerFunction = (context: HandlerContext) => Promise<string | void>

// Helper to find a project by ID, name, or order number
export function createFindProject(projects: CustomerProject[]) {
  return (idOrName: string): CustomerProject | undefined =>
    projects.find(
      p =>
        String(p.id) === String(idOrName) ||
        p.customerName.toLowerCase().includes(idOrName?.toLowerCase()) ||
        p.orderNumber === idOrName
    )
}

// Get current date formatted for notes
export function getTimestamp(): string {
  return new Date().toLocaleDateString('de-DE')
}
