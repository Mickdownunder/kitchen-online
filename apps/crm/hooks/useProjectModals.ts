'use client'

import { useState, useCallback, useMemo } from 'react'
import { CustomerProject, CustomerDeliveryNote } from '@/types'
import { getCustomerDeliveryNotes } from '@/lib/supabase/services'
import { logger } from '@/lib/utils/logger'

// =============================================================================
// Types
// =============================================================================

interface DeliveryNoteModalState {
  isOpen: boolean
  project: CustomerProject | null
  existingNote: CustomerDeliveryNote | null
}

interface SimpleModalState {
  isOpen: boolean
  project: CustomerProject | null
}

interface ProjectModalState {
  editingProject: CustomerProject | null
  isAdding: boolean
}

interface LeadModalState {
  isOpen: boolean
  lead: CustomerProject | null
}

export interface ProjectModalsState {
  deliveryNote: DeliveryNoteModalState
  measurement: SimpleModalState
  installation: SimpleModalState
  abholung: SimpleModalState
  lead: LeadModalState
  project: ProjectModalState
}

export interface ProjectModalsActions {
  // Delivery Note Modal
  openDeliveryNoteModal: (project: CustomerProject) => Promise<void>
  closeDeliveryNoteModal: () => void

  // Measurement Modal
  openMeasurementModal: (project: CustomerProject) => void
  closeMeasurementModal: () => void

  // Installation Modal
  openInstallationModal: (project: CustomerProject) => void
  closeInstallationModal: () => void

  // Abholung Modal
  openAbholungModal: (project: CustomerProject) => void
  closeAbholungModal: () => void

  // Lead Modal
  openLeadModal: (lead: CustomerProject) => void
  closeLeadModal: () => void

  // Project Modal
  openProjectModal: (project: CustomerProject) => void
  openAddProjectModal: () => void
  closeProjectModal: () => void
}

// =============================================================================
// Hook
// =============================================================================

export function useProjectModals(): ProjectModalsState & ProjectModalsActions {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  // Delivery Note Modal
  const [deliveryNoteModal, setDeliveryNoteModal] = useState<DeliveryNoteModalState>({
    isOpen: false,
    project: null,
    existingNote: null,
  })

  // Measurement Modal
  const [measurementModal, setMeasurementModal] = useState<SimpleModalState>({
    isOpen: false,
    project: null,
  })

  // Installation Modal
  const [installationModal, setInstallationModal] = useState<SimpleModalState>({
    isOpen: false,
    project: null,
  })

  // Abholung Modal
  const [abholungModal, setAbholungModal] = useState<SimpleModalState>({
    isOpen: false,
    project: null,
  })

  // Lead Modal
  const [leadModal, setLeadModal] = useState<LeadModalState>({
    isOpen: false,
    lead: null,
  })

  // Project Modal
  const [projectModal, setProjectModal] = useState<ProjectModalState>({
    editingProject: null,
    isAdding: false,
  })

  // ---------------------------------------------------------------------------
  // Actions: Delivery Note Modal
  // ---------------------------------------------------------------------------

  const openDeliveryNoteModal = useCallback(async (project: CustomerProject) => {
    try {
      const notes = await getCustomerDeliveryNotes(project.id)
      setDeliveryNoteModal({
        isOpen: true,
        project,
        existingNote: notes[0] || null,
      })
    } catch (error: unknown) {
      // Ignore aborted requests (normal during page navigation)
      const errMessage = error instanceof Error ? error.message : ''
      const errName = error instanceof Error ? error.name : ''
      if (errMessage.includes('aborted') || errName === 'AbortError') {
        return
      }
      logger.error('Error loading delivery notes', { component: 'useProjectModals' }, error as Error)
      // Still open modal even if loading fails
      setDeliveryNoteModal({
        isOpen: true,
        project,
        existingNote: null,
      })
    }
  }, [])

  const closeDeliveryNoteModal = useCallback(() => {
    setDeliveryNoteModal({
      isOpen: false,
      project: null,
      existingNote: null,
    })
  }, [])

  // ---------------------------------------------------------------------------
  // Actions: Measurement Modal
  // ---------------------------------------------------------------------------

  const openMeasurementModal = useCallback((project: CustomerProject) => {
    setMeasurementModal({
      isOpen: true,
      project,
    })
  }, [])

  const closeMeasurementModal = useCallback(() => {
    setMeasurementModal({
      isOpen: false,
      project: null,
    })
  }, [])

  // ---------------------------------------------------------------------------
  // Actions: Installation Modal
  // ---------------------------------------------------------------------------

  const openInstallationModal = useCallback((project: CustomerProject) => {
    setInstallationModal({
      isOpen: true,
      project,
    })
  }, [])

  const closeInstallationModal = useCallback(() => {
    setInstallationModal({
      isOpen: false,
      project: null,
    })
  }, [])

  // ---------------------------------------------------------------------------
  // Actions: Abholung Modal
  // ---------------------------------------------------------------------------

  const openAbholungModal = useCallback((project: CustomerProject) => {
    setAbholungModal({
      isOpen: true,
      project,
    })
  }, [])

  const closeAbholungModal = useCallback(() => {
    setAbholungModal({
      isOpen: false,
      project: null,
    })
  }, [])

  // ---------------------------------------------------------------------------
  // Actions: Lead Modal
  // ---------------------------------------------------------------------------

  const openLeadModal = useCallback((lead: CustomerProject) => {
    setLeadModal({
      isOpen: true,
      lead,
    })
  }, [])

  const closeLeadModal = useCallback(() => {
    setLeadModal({
      isOpen: false,
      lead: null,
    })
  }, [])

  // ---------------------------------------------------------------------------
  // Actions: Project Modal
  // ---------------------------------------------------------------------------

  const openProjectModal = useCallback((project: CustomerProject) => {
    setProjectModal({
      editingProject: project,
      isAdding: false,
    })
  }, [])

  const openAddProjectModal = useCallback(() => {
    setProjectModal({
      editingProject: null,
      isAdding: true,
    })
  }, [])

  const closeProjectModal = useCallback(() => {
    setProjectModal({
      editingProject: null,
      isAdding: false,
    })
  }, [])

  // ---------------------------------------------------------------------------
  // Return (memoized to prevent unnecessary re-renders in consumers)
  // ---------------------------------------------------------------------------

  return useMemo(
    () => ({
      // State
      deliveryNote: deliveryNoteModal,
      measurement: measurementModal,
      installation: installationModal,
      abholung: abholungModal,
      lead: leadModal,
      project: projectModal,

      // Actions (already stable via useCallback)
      openDeliveryNoteModal,
      closeDeliveryNoteModal,
      openMeasurementModal,
      closeMeasurementModal,
      openInstallationModal,
      closeInstallationModal,
      openAbholungModal,
      closeAbholungModal,
      openLeadModal,
      closeLeadModal,
      openProjectModal,
      openAddProjectModal,
      closeProjectModal,
    }),
    [
      // State dependencies
      deliveryNoteModal,
      measurementModal,
      installationModal,
      abholungModal,
      leadModal,
      projectModal,
      // Action dependencies (stable refs)
      openDeliveryNoteModal,
      closeDeliveryNoteModal,
      openMeasurementModal,
      closeMeasurementModal,
      openInstallationModal,
      closeInstallationModal,
      openAbholungModal,
      closeAbholungModal,
      openLeadModal,
      closeLeadModal,
      openProjectModal,
      openAddProjectModal,
      closeProjectModal,
    ]
  )
}
