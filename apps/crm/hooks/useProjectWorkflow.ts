'use client'

import { useState, useCallback } from 'react'
import type { CustomerProject } from '@/types'
import { ProjectStatus } from '@/types'

interface UseProjectWorkflowProps {
  onUpdateProject: (project: CustomerProject) => void
}

interface UseProjectWorkflowResult {
  applyOverrides: (project: CustomerProject) => CustomerProject
  scheduleUpdate: (project: CustomerProject, updates: Partial<CustomerProject>) => void
  toggleStep: (
    project: CustomerProject,
    step: 'measured' | 'ordered' | 'delivered' | 'installation' | 'completed',
    e: React.MouseEvent,
  ) => void
}

/**
 * Manages optimistic workflow step toggling with debounced DB persistence.
 *
 * Local state is updated instantly (no flicker); the actual Supabase
 * write happens after a 500 ms debounce so rapid toggles are batched.
 */
export function useProjectWorkflow({
  onUpdateProject,
}: UseProjectWorkflowProps): UseProjectWorkflowResult {
  const [localOverrides, setLocalOverrides] = useState<Map<string, Partial<CustomerProject>>>(
    new Map(),
  )
  const [, setPendingTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map())

  /** Merge local overrides into a project snapshot. */
  const applyOverrides = useCallback(
    (project: CustomerProject): CustomerProject => {
      const patch = localOverrides.get(project.id)
      return patch ? { ...project, ...patch } : project
    },
    [localOverrides],
  )

  /** Schedule a debounced DB write for the given project + updates. */
  const scheduleUpdate = useCallback(
    (project: CustomerProject, updates: Partial<CustomerProject>) => {
      // 1. Apply locally (instant)
      setLocalOverrides(prev => {
        const next = new Map(prev)
        next.set(project.id, { ...(prev.get(project.id) ?? {}), ...updates })
        return next
      })

      // 2. Cancel any pending flush for this project
      setPendingTimeouts(prev => {
        const existing = prev.get(project.id)
        if (existing) clearTimeout(existing)
        return prev
      })

      // 3. Schedule new flush
      const timeout = setTimeout(() => {
        const dbFields = pickPersistableFields(updates)
        if (Object.keys(dbFields).length > 0) {
          onUpdateProject({ ...project, ...dbFields })
        }
        setPendingTimeouts(prev => {
          const next = new Map(prev)
          next.delete(project.id)
          return next
        })
      }, 500)

      setPendingTimeouts(prev => {
        const next = new Map(prev)
        next.set(project.id, timeout)
        return next
      })
    },
    [onUpdateProject],
  )

  /** Toggle a workflow step and compute cascading updates. */
  const toggleStep = useCallback(
    (
      project: CustomerProject,
      step: 'measured' | 'ordered' | 'delivered' | 'installation' | 'completed',
      e: React.MouseEvent,
    ) => {
      e.stopPropagation()
      const current = applyOverrides(project)
      const today = new Date().toISOString().split('T')[0]

      const updates = computeStepUpdate(current, step, today)

      // Instant local update
      setLocalOverrides(prev => {
        const next = new Map(prev)
        next.set(project.id, { ...(prev.get(project.id) ?? {}), ...updates })
        return next
      })

      // Debounced DB update (only persistable fields)
      const dbFields = pickPersistableFields(updates)
      if (Object.keys(dbFields).length > 0) {
        scheduleUpdate(project, dbFields)
      }
    },
    [applyOverrides, scheduleUpdate],
  )

  return {
    applyOverrides,
    scheduleUpdate,
    toggleStep,
  }
}

// ─────────────────────────────────────────────────────
// Pure helpers (no state, easily testable)
// ─────────────────────────────────────────────────────

function computeStepUpdate(
  current: CustomerProject,
  step: string,
  today: string,
): Partial<CustomerProject> {
  switch (step) {
    case 'measured': {
      const on = !current.isMeasured
      return {
        isMeasured: on,
        measurementDate: on ? current.measurementDate || today : undefined,
        status: on ? ProjectStatus.MEASURING : ProjectStatus.PLANNING,
      }
    }
    case 'ordered': {
      const on = !current.isOrdered
      return {
        isOrdered: on,
        orderDate: on ? current.orderDate || today : undefined,
        isMeasured: on ? true : current.isMeasured,
        status: on ? ProjectStatus.ORDERED : ProjectStatus.MEASURING,
      }
    }
    case 'delivered': {
      const on = !current.isDelivered
      return {
        isDelivered: on,
        deliveryDate: on ? current.deliveryDate || today : undefined,
        isOrdered: on ? true : current.isOrdered,
        isMeasured: on ? true : current.isMeasured,
        status: on ? ProjectStatus.DELIVERY : ProjectStatus.ORDERED,
      }
    }
    case 'installation': {
      const on = !current.isInstallationAssigned
      return {
        isInstallationAssigned: on,
        installationDate: on ? current.installationDate || today : undefined,
        isDelivered: on ? true : current.isDelivered,
        isOrdered: on ? true : current.isOrdered,
        isMeasured: on ? true : current.isMeasured,
        status: on ? ProjectStatus.INSTALLATION : ProjectStatus.DELIVERY,
      }
    }
    case 'completed': {
      const on = !current.isCompleted
      return {
        isCompleted: on,
        completionDate: on ? current.completionDate || today : undefined,
        isInstallationAssigned: on ? true : current.isInstallationAssigned,
        status: on ? ProjectStatus.COMPLETED : ProjectStatus.INSTALLATION,
      }
    }
    default:
      return {}
  }
}

/** Only send fields that exist as DB columns. */
function pickPersistableFields(updates: Partial<CustomerProject>): Partial<CustomerProject> {
  const out: Partial<CustomerProject> = {}
  if (updates.isMeasured !== undefined) out.isMeasured = updates.isMeasured
  if (updates.isOrdered !== undefined) out.isOrdered = updates.isOrdered
  if (updates.isInstallationAssigned !== undefined)
    out.isInstallationAssigned = updates.isInstallationAssigned
  if (updates.status !== undefined) out.status = updates.status
  if (updates.measurementDate !== undefined) out.measurementDate = updates.measurementDate
  if (updates.orderDate !== undefined) out.orderDate = updates.orderDate
  if (updates.installationDate !== undefined)
    out.installationDate = updates.installationDate
  return out
}
