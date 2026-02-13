import { useMemo } from 'react'
import type { CustomerProject } from '@/types'
import { getProjectMaterialSnapshot } from '@/lib/utils/materialTracking'

export type ProjectListFilterType = 'all' | 'measurement' | 'order' | 'installation' | 'material_risk'

interface UseProjectFiltersOptions {
  projects: CustomerProject[]
  searchTerm: string
  filterType: ProjectListFilterType
  selectedYear: number | 'all'
  selectedMonth: number | 'all'
}

interface UseProjectFiltersResult {
  filteredProjects: CustomerProject[]
  availableYears: number[]
}

export function useProjectFilters(opts: UseProjectFiltersOptions): UseProjectFiltersResult {
  const filteredProjects = useMemo(() => {
    const q = opts.searchTerm.trim().toLowerCase()
    const hasSearch = q.length > 0
    return opts.projects.filter(p => {
      const matchesSearch =
        p.customerName.toLowerCase().includes(q) || p.orderNumber.toLowerCase().includes(q)
      if (!matchesSearch) return false

      if (opts.filterType === 'measurement') return !p.isMeasured
      if (opts.filterType === 'order') return p.isMeasured && !p.isOrdered
      if (opts.filterType === 'installation') return p.isOrdered && !p.installationDate
      if (opts.filterType === 'material_risk') {
        const snapshot = getProjectMaterialSnapshot(p)
        if (!snapshot) return false
        const inWindow = snapshot.daysUntilInstallation >= 0 && snapshot.daysUntilInstallation <= 14
        const isRisk = snapshot.riskLevel === 'critical' || snapshot.riskLevel === 'warning'
        return inWindow && isRisk
      }

      // Bei aktiver Suche: Jahr/Monat ignorieren – Treffer aus allen Jahren anzeigen
      if (hasSearch) return true

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
