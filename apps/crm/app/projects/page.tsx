import type { Metadata } from 'next'
import { requirePermission } from '@/lib/auth/requirePermission'
import ProjectsPageContent from './ProjectsPageContent'

export const metadata: Metadata = {
  title: 'Aufträge',
  description: 'Verwalten Sie Ihre Aufträge und Projekte',
  openGraph: {
    title: 'Aufträge',
    description: 'Verwalten Sie Ihre Aufträge und Projekte',
    type: 'website',
  },
}

export default async function ProjectsPage() {
  await requirePermission('menu_projects')

  return <ProjectsPageContent />
}
