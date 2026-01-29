import { useMemo, useState } from 'react'
import type { CustomerProject } from '@/types'

export type GroupKey = string // YYYY-MM

export function useGroupedProjects(filteredProjects: CustomerProject[]) {
  const groupedProjects = useMemo(() => {
    const groups: Map<GroupKey, CustomerProject[]> = new Map()
    filteredProjects.forEach(project => {
      const projectDate =
        project.orderDate || project.measurementDate || project.offerDate || project.createdAt
      const date = projectDate ? new Date(projectDate) : new Date(project.createdAt)
      const key: GroupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(project)
    })

    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filteredProjects])

  const [expandedGroups, setExpandedGroups] = useState<Set<GroupKey>>(() => {
    const now = new Date()
    const currentKey: GroupKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return new Set([currentKey])
  })

  const toggleGroup = (key: GroupKey) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return { groupedProjects, expandedGroups, toggleGroup }
}
