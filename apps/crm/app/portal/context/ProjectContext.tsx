'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { portalSupabase } from '@/lib/supabase/portal-client'

export interface ProjectInfo {
  id: string
  name: string
  status: string
  orderNumber: string | null
}

interface ProjectContextType {
  // Alle Projekte des Kunden
  projects: ProjectInfo[]
  // Aktuell ausgewähltes Projekt
  selectedProject: ProjectInfo | null
  // Projekt wechseln
  selectProject: (projectId: string) => void
  // Ladezustand
  isLoading: boolean
  // Fehler
  error: string | null
  // Hat der Kunde mehrere Projekte?
  hasMultipleProjects: boolean
  // Daten neu laden
  refresh: () => Promise<void>
}

const ProjectContext = createContext<ProjectContextType | null>(null)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Projekte laden
  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data: { user } } = await portalSupabase.auth.getUser()
      
      if (!user) {
        setError('Nicht eingeloggt')
        setProjects([])
        setSelectedProjectId(null)
        return
      }

      // Projekte über RLS laden (filtert automatisch nach customer_id)
      const { data: projectsData, error: projectsError } = await portalSupabase
        .from('projects')
        .select('id, customer_name, status, order_number')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (projectsError) {
        console.error('Error loading projects:', projectsError)
        setError('Fehler beim Laden der Projekte')
        return
      }

      const loadedProjects: ProjectInfo[] = (projectsData || []).map(p => ({
        id: p.id,
        name: p.customer_name,
        status: p.status,
        orderNumber: p.order_number,
      }))

      setProjects(loadedProjects)

      // Ausgewähltes Projekt setzen oder zurücksetzen
      if (loadedProjects.length === 0) {
        setSelectedProjectId(null)
      } else {
        // Versuche gespeicherte Auswahl zu laden (nur im Browser)
        const storage =
          typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function'
            ? window.localStorage
            : null
        const savedProjectId = storage ? storage.getItem('portal_selected_project') : null
        
        if (savedProjectId && loadedProjects.find(p => p.id === savedProjectId)) {
          setSelectedProjectId(savedProjectId)
        } else {
          // Sonst erstes Projekt wählen
          setSelectedProjectId(loadedProjects[0].id)
        }
      }
    } catch (err) {
      console.error('Error in loadProjects:', err)
      setError('Fehler beim Laden')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial laden + bei Auth-Änderung neu laden (z. B. nach Login)
  // Ohne diesen Listener: Provider mountet auf Login-Seite, loadProjects läuft ohne User → projects = [].
  // Nach Login bleibt Provider gemountet, Effect läuft nicht erneut → projects bleibt leer, andere Seiten warten ewig auf selectedProject.
  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  useEffect(() => {
    const { data: { subscription } } = portalSupabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadProjects()
      }
      if (event === 'SIGNED_OUT') {
        setProjects([])
        setSelectedProjectId(null)
        setError('Nicht eingeloggt')
        setIsLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [loadProjects])

  // Projekt wechseln
  const selectProject = useCallback((projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setSelectedProjectId(projectId)
      if (typeof window !== 'undefined' && typeof window.localStorage?.setItem === 'function') {
        window.localStorage.setItem('portal_selected_project', projectId)
      }
    }
  }, [projects])

  // Ausgewähltes Projekt
  const selectedProject = projects.find(p => p.id === selectedProjectId) || null

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProject,
        selectProject,
        isLoading,
        error,
        hasMultipleProjects: projects.length > 1,
        refresh: loadProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (!context) {
    // Return safe defaults when used outside provider (e.g., login page)
    return {
      projects: [],
      selectedProject: null,
      selectProject: () => {},
      isLoading: true,
      error: null,
      hasMultipleProjects: false,
      refresh: async () => {},
    }
  }
  return context
}
