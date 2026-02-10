'use client'

import { useState, useCallback } from 'react'
import type { CustomerProject } from '@/types'
import { computeStepUpdate, pickPersistableFields } from '@/lib/utils/projectWorkflow'

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
