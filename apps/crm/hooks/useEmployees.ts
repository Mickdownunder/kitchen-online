'use client'

import { useState, useEffect } from 'react'
import { Employee } from '@/types'
import { getEmployees } from '@/lib/supabase/services'

/**
 * Hook für das Laden von Employee-Daten
 *
 * @returns { employees } - Array von Employees
 */
export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([])

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    try {
      const data = await getEmployees()
      setEmployees(data)
    } catch (error: unknown) {
      // Ignore aborted requests (normal during page navigation)
      const err = error as { message?: string; name?: string }
      if (err?.message?.includes('aborted') || err?.name === 'AbortError') {
        return
      }
      console.error('Error loading employees:', error)
    }
  }

  return { employees }
}
