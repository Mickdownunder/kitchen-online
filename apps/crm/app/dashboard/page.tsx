import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requirePermission } from '@/lib/auth/requirePermission'
import DashboardPageContent from './DashboardPageContent'

export const metadata: Metadata = {
  title: 'Übersicht',
  description: 'Dashboard mit Übersicht über Projekte, Finanzen und Statistiken',
  openGraph: {
    title: 'Übersicht',
    description: 'Dashboard mit Übersicht über Projekte, Finanzen und Statistiken',
    type: 'website',
  },
}

export default async function DashboardPage() {
  await requirePermission('menu_dashboard')

  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        </div>
      }
    >
      <DashboardPageContent />
    </Suspense>
  )
}
