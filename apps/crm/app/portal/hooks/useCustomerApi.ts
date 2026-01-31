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
    const getToken = async () => {
      const { data: { session } } = await portalSupabase.auth.getSession()
      if (session?.access_token) {
        setAccessToken(session.access_token)
      }
      setIsReady(true)
    }
    getToken()

    // Listen for auth changes
    const { data: { subscription } } = portalSupabase.auth.onAuthStateChange((event, session) => {
      setAccessToken(session?.access_token ?? null)
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

export function useProjectData() {
  const { accessToken, isReady, fetchWithAuth } = useCustomerApi()
  const [data, setData] = useState<ProjectData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  const loadProject = useCallback(async (projectId?: string) => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    const url = projectId 
      ? `/api/customer/project?projectId=${projectId}`
      : '/api/customer/project'

    const result = await fetchWithAuth<ProjectData>(url)

    if (result.success && result.data) {
      setData(result.data)
      setSelectedProjectId(result.data.project.id)
    } else {
      setError(result.error || 'Fehler beim Laden der Daten')
    }

    setIsLoading(false)
  }, [accessToken, fetchWithAuth])

  // Initial load
  useEffect(() => {
    if (isReady && accessToken) {
      loadProject()
    } else if (isReady && !accessToken) {
      setIsLoading(false)
      setError('NOT_AUTHENTICATED')
    }
  }, [isReady, accessToken, loadProject])

  // Select a different project
  const selectProject = useCallback((projectId: string) => {
    if (projectId !== selectedProjectId) {
      loadProject(projectId)
    }
  }, [selectedProjectId, loadProject])

  return { 
    data, 
    isLoading, 
    error, 
    refresh: () => loadProject(selectedProjectId || undefined),
    selectedProjectId,
    selectProject,
    hasMultipleProjects: (data?.allProjects?.length || 0) > 1,
  }
}

export type { ProjectData, ProjectInfo }
