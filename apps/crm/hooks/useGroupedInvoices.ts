import { useMemo, useState } from 'react'
import type { ListInvoice } from './useInvoiceFilters'

export type GroupKey = string // YYYY-MM

export function useGroupedInvoices(filteredInvoices: ListInvoice[]) {
  const groupedInvoices = useMemo(() => {
    const groups: Map<GroupKey, ListInvoice[]> = new Map()
    filteredInvoices.forEach(invoice => {
      // Verwende invoiceDate oder date als Fallback
      const dateStr = invoice.invoiceDate || invoice.date
      const date = dateStr ? new Date(dateStr) : new Date()
      const key: GroupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(invoice)
    })

    // Order within each group = order in input (caller sorts before grouping)
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filteredInvoices])

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

  return { groupedInvoices, expandedGroups, toggleGroup }
}
