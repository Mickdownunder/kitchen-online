'use client'

import { useEffect, useState } from 'react'
import CustomerDatabase from '@/components/CustomerDatabase'
import { Customer } from '@/types'
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '@/lib/supabase/services'

export default function CustomersClient() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      const data = await getCustomers()
      setCustomers(data)
    } catch (error) {
      console.error('Error loading customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCustomer = async (customer: Customer) => {
    try {
      if (customer.id && customers.find(c => c.id === customer.id)) {
        await updateCustomer(customer.id, customer)
      } else {
        await createCustomer(customer)
      }
      await loadCustomers()
    } catch (error) {
      console.error('Error saving customer:', error)
      alert('Fehler beim Speichern des Kunden')
    }
  }

  const handleDeleteCustomer = async (id: string) => {
    try {
      await deleteCustomer(id)
      await loadCustomers()
    } catch (error) {
      console.error('Error deleting customer:', error)
      alert('Fehler beim Löschen des Kunden')
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <CustomerDatabase
      customers={customers}
      onSelectCustomer={customer => {
        // Navigate to projects with customer filter
        window.location.href = `/projects?customer=${customer.id}`
      }}
      onSaveCustomer={handleSaveCustomer}
      onDeleteCustomer={handleDeleteCustomer}
    />
  )
}
