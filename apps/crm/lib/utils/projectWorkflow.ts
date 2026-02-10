/**
 * Pure project workflow transition logic (status + step flags).
 * Used by useProjectWorkflow; kept here for unit testing.
 */

import type { CustomerProject } from '@/types'
import { ProjectStatus } from '@/types'

export type WorkflowStep =
  | 'measured'
  | 'ordered'
  | 'delivered'
  | 'installation'
  | 'completed'

/**
 * Computes the partial project update when toggling a workflow step.
 * Turning a step on sets status forward and cascades previous steps to true;
 * turning off sets status backward.
 */
export function computeStepUpdate(
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

/** Only fields that exist as DB columns and are persisted by the workflow. */
export function pickPersistableFields(
  updates: Partial<CustomerProject>,
): Partial<CustomerProject> {
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
