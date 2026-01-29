import type { Metadata } from 'next'
import ProjectsPageClient from './ProjectsPageClient'

export const metadata: Metadata = {
  title: 'Aufträge | KüchenProfi Manager',
  description: 'Verwalten Sie Ihre Aufträge und Projekte',
  openGraph: {
    title: 'Aufträge | KüchenProfi Manager',
    description: 'Verwalten Sie Ihre Aufträge und Projekte',
    type: 'website',
  },
}

export default function ProjectsPage() {
  return <ProjectsPageClient />
}
