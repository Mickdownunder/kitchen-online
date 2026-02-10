'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from 'react'
import { usePathname } from 'next/navigation'
import {
  CustomerProject,
  PlanningAppointment,
  DeliveryNote,
  CustomerDeliveryNote,
  ProjectDocument,
} from '@/types'
import { updateProject } from '@/lib/supabase/services'
import { refreshProjectsWithCache } from './providers/projectsCache'
import { refreshDeliveryNotesWithCache } from './providers/deliveryNotesCache'
import { refreshAppointmentsWithCache } from './providers/appointmentsCache'
import { scheduleDeliveryDateBackgroundCheck } from './providers/deliveryDateBackground'
import { schedulePaymentScheduleCheck } from './providers/paymentScheduleBackground'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/utils/logger'

interface AppContextType {
  // Projects
  projects: CustomerProject[]
  setProjects: React.Dispatch<React.SetStateAction<CustomerProject[]>>
  refreshProjects: (force?: boolean, silent?: boolean) => Promise<void>
  isLoading: boolean

  // Delivery Notes (cached globally)
  supplierDeliveryNotes: DeliveryNote[]
  customerDeliveryNotes: CustomerDeliveryNote[]
  refreshDeliveryNotes: () => Promise<void>
  isLoadingDeliveryNotes: boolean

  // Calendar
  appointments: PlanningAppointment[]
  setAppointments: React.Dispatch<React.SetStateAction<PlanningAppointment[]>>
  refreshAppointments: () => Promise<void>

  // AI Functions (function calls are now executed server-side)
  addDocumentToProject: (projectId: string, doc: ProjectDocument) => void

  // Data freshness
  lastProjectsRefresh: number
  lastDeliveryNotesRefresh: number
}

const AppContext = createContext<AppContextType | undefined>(undefined)

const isBypassRoute = (pathname: string | null): boolean =>
  pathname === '/login' ||
  pathname === '/signup' ||
  pathname === '/forgot-password' ||
  pathname === '/reset-password' ||
  pathname?.startsWith('/portal') === true

function AuthenticatedAppProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth() // Check if user is authenticated
  const [projects, setProjects] = useState<CustomerProject[]>([])
  const [appointments, setAppointments] = useState<PlanningAppointment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Delivery notes global cache
  const [supplierDeliveryNotes, setSupplierDeliveryNotes] = useState<DeliveryNote[]>([])
  const [customerDeliveryNotes, setCustomerDeliveryNotes] = useState<CustomerDeliveryNote[]>([])
  const [isLoadingDeliveryNotes, setIsLoadingDeliveryNotes] = useState(false)

  // Track last refresh times for smart caching
  const [lastProjectsRefresh, setLastProjectsRefresh] = useState(0)
  const [lastDeliveryNotesRefresh, setLastDeliveryNotesRefresh] = useState(0)
  const [lastAppointmentsRefresh, setLastAppointmentsRefresh] = useState(0)

  // Prevent duplicate fetches
  const isRefreshingProjects = useRef(false)
  const isRefreshingDeliveryNotes = useRef(false)
  const isRefreshingAppointments = useRef(false)
  const hasInitialLoad = useRef(false)

  // Load projects from Supabase - with smart caching
  // silent=true: Kein globaler Lade-Spinner (für Live-Updates z.B. nach Rechnungs-Status-Änderung)
  const refreshProjects = useCallback(
    async (force = false, silent = false) => {
      await refreshProjectsWithCache({
        force,
        silent,
        lastRefresh: lastProjectsRefresh,
        setLastRefresh: setLastProjectsRefresh,
        isRefreshingRef: isRefreshingProjects,
        setIsLoading,
        setProjects,
      })
    },
    [lastProjectsRefresh]
  )

  // Load delivery notes - with smart caching
  const refreshDeliveryNotes = useCallback(
    async (force = false) => {
      await refreshDeliveryNotesWithCache({
        force,
        lastRefresh: lastDeliveryNotesRefresh,
        setLastRefresh: setLastDeliveryNotesRefresh,
        isRefreshingRef: isRefreshingDeliveryNotes,
        setIsLoading: setIsLoadingDeliveryNotes,
        setSupplierDeliveryNotes,
        setCustomerDeliveryNotes,
      })
    },
    [lastDeliveryNotesRefresh]
  )

  // Load appointments from Supabase - with smart caching
  const refreshAppointments = useCallback(
    async (force = false) => {
      await refreshAppointmentsWithCache({
        force,
        lastRefresh: lastAppointmentsRefresh,
        setLastRefresh: setLastAppointmentsRefresh,
        isRefreshingRef: isRefreshingAppointments,
        setIsLoading,
        setAppointments,
      })
    },
    [lastAppointmentsRefresh]
  )

  // Initial data load - ONCE on mount, but only after user is authenticated
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return

    // Don't load data if user is not authenticated
    if (!user) {
      const timer = window.setTimeout(() => {
        setIsLoading(false)
      }, 0)
      // Reset initial load flag when user logs out
      hasInitialLoad.current = false
      return () => window.clearTimeout(timer)
    }

    if (hasInitialLoad.current) return
    hasInitialLoad.current = true

    const loadInitialData = async () => {
      // Load projects first (critical path)
      await refreshProjects(true)

      // Load appointments and delivery notes in parallel (non-blocking)
      await Promise.all([refreshAppointments(true), refreshDeliveryNotes(true)])
    }

    loadInitialData()
  }, [user, authLoading, refreshProjects, refreshAppointments, refreshDeliveryNotes])

  // Check delivery dates in background (non-blocking, runs after initial load)
  useEffect(() => {
    if (projects.length === 0 || isLoading || customerDeliveryNotes.length === 0) return

    return scheduleDeliveryDateBackgroundCheck({
      projects,
      customerDeliveryNotes,
      setProjects,
    })
  }, [projects, isLoading, customerDeliveryNotes, setProjects])

  // Check payment schedule in background (non-blocking, runs after initial load)
  useEffect(() => {
    if (projects.length === 0 || isLoading) return

    return schedulePaymentScheduleCheck({
      projects,
      setProjects,
    })
  }, [projects, isLoading, setProjects])

  const addDocumentToProject = async (projectId: string, doc: ProjectDocument) => {
    const project = projects.find(
      p =>
        String(p.id) === String(projectId) ||
        p.customerName.toLowerCase().includes(projectId.toLowerCase()) ||
        p.orderNumber === projectId
    )

    if (project) {
      try {
        const updated = await updateProject(project.id, {
          documents: [doc, ...(project.documents || [])],
        })
        setProjects(prev => prev.map(p => (p.id === project.id ? updated : p)))
      } catch (error) {
        logger.error('Error adding document', { component: 'AppProvider' }, error instanceof Error ? error : new Error(String(error)))
      }
    }
  }

  return (
    <AppContext.Provider
      value={{
        projects,
        setProjects,
        appointments,
        setAppointments,
        refreshAppointments: () => refreshAppointments(true),
        addDocumentToProject,
        refreshProjects: (force = true, silent = false) => refreshProjects(force, silent),
        isLoading,
        // Delivery notes
        supplierDeliveryNotes,
        customerDeliveryNotes,
        refreshDeliveryNotes: () => refreshDeliveryNotes(true),
        isLoadingDeliveryNotes,
        // Cache timestamps
        lastProjectsRefresh,
        lastDeliveryNotesRefresh,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function AppProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (isBypassRoute(pathname)) {
    return <>{children}</>
  }
  return <AuthenticatedAppProvider>{children}</AuthenticatedAppProvider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
