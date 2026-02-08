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
    const result = await getCustomers()
    if (result.ok) {
      setCustomers(result.data)
    }
    setLoading(false)
  }

  const handleSaveCustomer = async (customer: Customer) => {
    const result = customer.id && customers.find(c => c.id === customer.id)
      ? await updateCustomer(customer.id, customer)
      : await createCustomer(customer)

    if (!result.ok) {
      alert('Fehler beim Speichern des Kunden')
      return
    }
    await loadCustomers()
  }

  const handleDeleteCustomer = async (id: string) => {
    const result = await deleteCustomer(id)
    if (!result.ok) {
      alert('Fehler beim Löschen des Kunden')
      return
    }
    await loadCustomers()
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
