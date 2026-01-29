'use client'

import { useApp } from '../providers'
import StatisticsView from '@/components/StatisticsView'
import AIAgentButton from '@/components/AIAgentButton'

export default function StatisticsClient() {
  const { projects } = useApp()

  return (
    <>
      <StatisticsView projects={projects || []} />
      <AIAgentButton />
    </>
  )
}
