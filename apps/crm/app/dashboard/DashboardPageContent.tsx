'use client'

import Dashboard from '@/components/Dashboard'
import { useApp } from '@/app/providers'
import AIAgentButton from '@/components/AIAgentButton'

export default function DashboardPageContent() {
  const { projects, isLoading } = useApp()

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <Dashboard projects={projects || []} />
      <AIAgentButton />
    </>
  )
}
