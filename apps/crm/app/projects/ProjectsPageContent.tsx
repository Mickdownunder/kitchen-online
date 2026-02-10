'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ProjectList from '@/components/ProjectList'
import { useApp } from '../providers'
import AIAgentButton from '@/components/AIAgentButton'
import { createProject, updateProject } from '@/lib/supabase/services'
import { CustomerProject } from '@/types'
import { logger } from '@/lib/utils/logger'

function ProjectsPageContent() {
  const { projects, setProjects, isLoading } = useApp()
  const searchParams = useSearchParams()
  const filterParam = searchParams.get('filter')
  const projectIdParam = searchParams.get('projectId')

  // NO useEffect to refreshProjects here!
  // Projects are already loaded in AppProvider on app start
  // This prevents redundant fetches on every navigation

  // Determine initial filter from URL
  const getInitialFilter = (): 'all' | 'measurement' | 'order' | 'installation' => {
    if (filterParam === 'needs_measurement') return 'measurement'
    if (filterParam === 'needs_order') return 'order'
    if (filterParam === 'needs_installation') return 'installation'
    return 'all'
  }

  const handleAddProject = async (project: CustomerProject) => {
    try {
      const newProjectResult = await createProject(project)
      if (!newProjectResult.ok) {
        throw new Error(newProjectResult.message)
      }

      setProjects(prev => [newProjectResult.data, ...prev])
    } catch (error) {
      logger.error('Error creating project', { component: 'ProjectsPageContent' }, error as Error)
      alert('Fehler beim Erstellen des Auftrags')
    }
  }

  const handleUpdateProject = async (updatedProject: CustomerProject) => {
    try {
      if (!updatedProject.id) {
        logger.error('Error updating project: No ID provided', { component: 'ProjectsPageContent' })
        alert('Fehler: Keine Projekt-ID vorhanden')
        return updatedProject
      }
      const updateResult = await updateProject(updatedProject.id, updatedProject)
      if (!updateResult.ok) {
        throw new Error(updateResult.message)
      }
      setProjects(prev => prev.map(p => (p.id === updateResult.data.id ? updateResult.data : p)))
      return updateResult.data
    } catch (error: unknown) {
      const errObj = error as Error & { code?: string; details?: string; hint?: string }
      logger.error('Error updating project', {
        component: 'ProjectsPageContent',
        message: errObj?.message,
        code: errObj?.code,
        details: errObj?.details,
        hint: errObj?.hint,
      }, error as Error)
      if (errObj?.code !== 'PGRST116') {
        logger.error('Critical error updating project', { component: 'ProjectsPageContent' }, error as Error)
      }
      throw error
    }
  }

  const handleDeleteProject = async (id: string) => {
    const previousProjects = projects
    setProjects(prev => prev.filter(p => p.id !== id))

    try {
      const res = await fetch(`/api/projects/delete?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Löschen fehlgeschlagen')
      }
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : ''
      const errName = error instanceof Error ? error.name : ''
      if (errMessage.includes('aborted') || errName === 'AbortError') return
      logger.error('Error deleting project', { component: 'ProjectsPageContent' }, error as Error)
      setProjects(previousProjects)
      alert('Fehler beim Löschen des Auftrags')
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <ProjectList
        projects={projects}
        onAddProject={handleAddProject}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
        initialFilter={getInitialFilter()}
        initialOpenProjectId={projectIdParam}
      />
      <AIAgentButton />
    </>
  )
}

export default function ProjectsPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        </div>
      }
    >
      <ProjectsPageContent />
    </Suspense>
  )
}
