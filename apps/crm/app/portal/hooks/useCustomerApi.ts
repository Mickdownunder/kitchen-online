'use client'

import { useEffect, useState, useCallback } from 'react'
import { portalSupabase } from '@/lib/supabase/portal-client'

interface ProjectInfo {
  id: string
  name: string
  status: string
  orderNumber: string | null
}

interface ProjectData {
  project: ProjectInfo
  allProjects: ProjectInfo[]
  customer: {
    name: string
  }
  salesperson: {
    name: string
    email: string
    phone: string | null
  } | null
  nextAppointment: {
    title: string
    startTime: string
  } | null
  stats: {
    documentsCount: number
    openTicketsCount: number
    upcomingAppointmentsCount: number
  }
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export function useCustomerApi() {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Listen for auth changes FIRST (this is faster than getSession)
    const { data: { subscription } } = portalSupabase.auth.onAuthStateChange((event, session) => {
      setAccessToken(session?.access_token ?? null)
      setIsReady(true)
    })

    // Also get session immediately (in case onAuthStateChange doesn't fire)
    portalSupabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        setAccessToken(session.access_token)
      }
      setIsReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchWithAuth = useCallback(async <T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> => {
    if (!accessToken) {
      return { success: false, error: 'NOT_AUTHENTICATED' }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || 'UNKNOWN_ERROR' }
      }

      return data as ApiResponse<T>
    } catch (error) {
      console.error('API fetch error:', error)
      return { success: false, error: 'NETWORK_ERROR' }
    }
  }, [accessToken])

  return {
    accessToken,
    isReady,
    fetchWithAuth,
  }
}

/**
 * Hook to load project dashboard data
 * @param projectId - Optional project ID. If provided, loads data for that specific project.
 */
export function useProjectData(projectId?: string | null) {
  const { accessToken, isReady, fetchWithAuth } = useCustomerApi()
  const [data, setData] = useState<ProjectData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProject = useCallback(async (pid?: string | null) => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    const url = pid 
      ? `/api/customer/project?projectId=${pid}`
      : '/api/customer/project'

    const result = await fetchWithAuth<ProjectData>(url)

    if (result.success && result.data) {
      setData(result.data)
    } else {
      setError(result.error || 'Fehler beim Laden der Daten')
    }

    setIsLoading(false)
  }, [accessToken, fetchWithAuth])

  // Load when projectId changes or on initial mount
  useEffect(() => {
    if (isReady && accessToken) {
      loadProject(projectId)
    } else if (isReady && !accessToken) {
      setIsLoading(false)
      setError('NOT_AUTHENTICATED')
    }
  }, [isReady, accessToken, projectId, loadProject])

  return { 
    data, 
    isLoading, 
    error, 
    refresh: () => loadProject(projectId),
  }
}

export type { ProjectData, ProjectInfo }
