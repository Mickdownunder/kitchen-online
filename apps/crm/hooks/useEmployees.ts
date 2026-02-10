'use client'

import { useState, useEffect, useCallback } from 'react'
import { Employee } from '@/types'
import { getEmployees } from '@/lib/supabase/services'
import { logger } from '@/lib/utils/logger'

interface UseEmployeesResult {
  employees: Employee[]
}

/**
 * Hook für das Laden von Employee-Daten
 *
 * @returns { employees } - Array von Employees
 */
export function useEmployees(): UseEmployeesResult {
  const [employees, setEmployees] = useState<Employee[]>([])

  const loadEmployees = useCallback(async () => {
    try {
      const data = await getEmployees()
      setEmployees(data)
    } catch (error: unknown) {
      // Ignore aborted requests (normal during page navigation)
      const err = error as { message?: string; name?: string }
      if (err?.message?.includes('aborted') || err?.name === 'AbortError') {
        return
      }
      logger.error('Error loading employees', { component: 'useEmployees' }, error as Error)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadEmployees()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadEmployees])

  return { employees }
}
