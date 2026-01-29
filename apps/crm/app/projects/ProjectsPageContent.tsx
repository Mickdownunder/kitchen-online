'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ProjectList from '@/components/ProjectList'
import { useApp } from '../providers'
import AIAgentButton from '@/components/AIAgentButton'
import { createProject, updateProject, deleteProject } from '@/lib/supabase/services'
import { CustomerProject } from '@/types'

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
      const newProject = await createProject(project)
      setProjects(prev => [newProject, ...prev])
    } catch (error) {
      console.error('Error creating project:', error)
      alert('Fehler beim Erstellen des Auftrags')
    }
  }

  const handleUpdateProject = async (updatedProject: CustomerProject) => {
    try {
      if (!updatedProject.id) {
        console.error('Error updating project: No ID provided')
        alert('Fehler: Keine Projekt-ID vorhanden')
        return updatedProject
      }
      const result = await updateProject(updatedProject.id, updatedProject)
      setProjects(prev => prev.map(p => (p.id === result.id ? result : p)))
      return result
    } catch (error: unknown) {
      const errObj = error as Error & { code?: string; details?: string; hint?: string }
      console.error('Error updating project:', error)
      console.error('Error details:', {
        message: errObj?.message,
        code: errObj?.code,
        details: errObj?.details,
        hint: errObj?.hint,
      })
      if (errObj?.code !== 'PGRST116') {
        console.error('Critical error updating project:', error)
      }
      throw error
    }
  }

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProject(id)
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch (error) {
      console.error('Error deleting project:', error)
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
