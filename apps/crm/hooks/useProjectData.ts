'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Customer, Invoice } from '@/types'
import { getCustomers } from '@/lib/supabase/services'
import { getInvoices } from '@/lib/supabase/services/invoices'
import { getComplaints } from '@/lib/supabase/services/complaints'
import { logger } from '@/lib/utils/logger'

/**
 * Loads supplementary data for the project list:
 * customers, invoices, and complaints-per-project counts.
 *
 * Each dataset is fetched once on mount and can be manually refreshed.
 */
export function useProjectData() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [complaintsByProject, setComplaintsByProject] = useState<Map<string, number>>(new Map())

  const loadCustomers = useCallback(async () => {
    const result = await getCustomers()
    if (result.ok) setCustomers(result.data)
  }, [])

  const loadInvoices = useCallback(async () => {
    const result = await getInvoices()
    if (result.ok) setInvoices(result.data)
  }, [])

  const loadComplaints = useCallback(async () => {
    try {
      const allComplaints = await getComplaints(undefined, true)
      const map = new Map<string, number>()
      allComplaints.forEach(c => {
        map.set(c.projectId, (map.get(c.projectId) ?? 0) + 1)
      })
      setComplaintsByProject(map)
    } catch (error: unknown) {
      const err = error as { message?: string; name?: string }
      if (err?.message?.includes('aborted') || err?.name === 'AbortError') return
      logger.error('Error loading complaints', { component: 'ProjectList' }, error as Error)
    }
  }, [])

  useEffect(() => {
    loadCustomers()
    loadInvoices()
    loadComplaints()
  }, [loadCustomers, loadInvoices, loadComplaints])

  return {
    customers,
    invoices,
    complaintsByProject,
    refreshCustomers: loadCustomers,
    refreshInvoices: loadInvoices,
    refreshComplaints: loadComplaints,
  }
}
