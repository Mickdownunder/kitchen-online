import { CustomerProject } from '@/types'

export type ProjectListTab = 'leads' | 'orders'
export type ProjectListFilterType = 'all' | 'measurement' | 'order' | 'installation'
export type ProjectSortField = 'customerName' | 'orderNumber' | 'date' | 'totalAmount'

export interface ProjectListStatsData {
  totalRevenue: number
  margin: number
  marginPercent: number | null
  completedCount: number
  completedPercent: number
  averageAmount: number
  projectCount: number
}

export interface ProjectListToolbarState {
  activeTab: ProjectListTab
  filterType: ProjectListFilterType
  searchTerm: string
  selectedYear: number | 'all'
  selectedMonth: number | 'all'
}

export type ProjectMonthMap = Map<number, CustomerProject[]>
