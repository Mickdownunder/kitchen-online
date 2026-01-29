'use client'

import { useApp } from '../providers'
import AccountingView from '@/components/AccountingView'
import AIAgentButton from '@/components/AIAgentButton'

export default function AccountingClient() {
  const { projects } = useApp()

  return (
    <>
      <AccountingView projects={projects || []} />
      <AIAgentButton />
    </>
  )
}
