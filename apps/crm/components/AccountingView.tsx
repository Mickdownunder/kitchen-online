'use client'

import React from 'react'
import type { CustomerProject } from '@/types'
import { useAccountingData } from './useAccountingData'
import AccountingViewContent from './accounting/AccountingViewContent'

interface AccountingViewProps {
  projects: CustomerProject[]
}

const AccountingView: React.FC<AccountingViewProps> = ({ projects }) => {
  const accountingData = useAccountingData(projects)

  return <AccountingViewContent projects={projects} {...accountingData} />
}

export default AccountingView
