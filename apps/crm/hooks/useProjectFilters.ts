import { useMemo } from 'react'
import type { CustomerProject } from '@/types'

export type ProjectListFilterType = 'all' | 'measurement' | 'order' | 'installation'

export function useProjectFilters(opts: {
  projects: CustomerProject[]
  searchTerm: string
  filterType: ProjectListFilterType
  selectedYear: number | 'all'
  selectedMonth: number | 'all'
}) {
  const filteredProjects = useMemo(() => {
    const q = opts.searchTerm.trim().toLowerCase()
    return opts.projects.filter(p => {
      const matchesSearch =
        p.customerName.toLowerCase().includes(q) || p.orderNumber.toLowerCase().includes(q)
      if (!matchesSearch) return false

      if (opts.filterType === 'measurement') return !p.isMeasured
      if (opts.filterType === 'order') return p.isMeasured && !p.isOrdered
      if (opts.filterType === 'installation') return p.isOrdered && !p.installationDate

      const projectDate = p.orderDate || p.measurementDate || p.offerDate || p.createdAt
      if (projectDate) {
        const d = new Date(projectDate)
        if (opts.selectedYear !== 'all' && d.getFullYear() !== opts.selectedYear) return false
        if (opts.selectedMonth !== 'all' && d.getMonth() + 1 !== opts.selectedMonth) return false
      }

      return true
    })
  }, [opts.projects, opts.searchTerm, opts.filterType, opts.selectedYear, opts.selectedMonth])

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    opts.projects.forEach(p => {
      const dateStr = p.orderDate || p.measurementDate || p.offerDate || p.createdAt
      if (dateStr) years.add(new Date(dateStr).getFullYear())
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [opts.projects])

  return { filteredProjects, availableYears }
}
