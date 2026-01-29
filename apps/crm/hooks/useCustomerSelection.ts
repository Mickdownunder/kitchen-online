'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Customer, CustomerProject } from '@/types'
import { getCustomers } from '@/lib/supabase/services'
import { parseCustomerName, formatCustomerName } from '@/lib/utils/customerNameParser'
import { formatCustomerAddress } from '@/lib/utils/addressFormatter'

interface UseCustomerSelectionProps {
  existingCustomers: Customer[]
  formData: Partial<CustomerProject>
  setFormData: React.Dispatch<React.SetStateAction<Partial<CustomerProject>>>
  setAddressInput: (value: string) => void
  setIsManualNameUpdate: (value: boolean) => void
}

/**
 * Hook für Customer-Suche, -Auswahl und -Mapping auf Form-Felder
 */
export function useCustomerSelection({
  existingCustomers,
  formData,
  setFormData,
  setAddressInput,
  setIsManualNameUpdate,
}: UseCustomerSelectionProps) {
  const [customers, setCustomers] = useState<Customer[]>(existingCustomers)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [salutation, setSalutation] = useState<string>('')
  const [companyName, setCompanyName] = useState<string>(formData.companyName || '')
  const [taxId, setTaxId] = useState<string>(formData.taxId || '')
  const [contactPerson, setContactPerson] = useState<string>(formData.contactPerson || '')
  const [isManualNameUpdate, setIsManualNameUpdateLocal] = useState(false)

  // Load customers if not provided
  useEffect(() => {
    if (existingCustomers.length === 0) {
      loadCustomers()
    }
  }, [existingCustomers.length])

  const loadCustomers = async () => {
    try {
      const data = await getCustomers()
      setCustomers(data)
    } catch (error) {
      console.error('Error loading customers:', error)
    }
  }

  // Filter customers by search term
  const filteredCustomers = useMemo(() => {
    return customers.filter(
      c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        c.contact.email.toLowerCase().includes(customerSearchTerm.toLowerCase())
    )
  }, [customers, customerSearchTerm])

  // When customer is selected, fill form
  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId)
      if (customer) {
        const fullAddress = formatCustomerAddress(customer)
        const fullName = formatCustomerName(
          customer.salutation || '',
          customer.firstName,
          customer.lastName
        )

        setFormData(prev => ({
          ...prev,
          customerId: customer.id,
          customerName: fullName,
          address: fullAddress,
          phone: customer.contact.phone || '',
          email: customer.contact.email || '',
        }))
        setAddressInput(fullAddress)
        setFirstName(customer.firstName)
        setLastName(customer.lastName)
        setSalutation(customer.salutation || '')
        setCompanyName(customer.companyName || '')
        setTaxId(customer.taxId || '')
        setShowCustomerDropdown(false)
      }
    }
  }, [selectedCustomerId, customers, setFormData, setAddressInput])

  // Parse customerName into firstName and lastName for display (nur beim initialen Laden)
  useEffect(() => {
    // Nur parsen, wenn wir nicht manuell aktualisieren und kein Kunde ausgewählt ist
    if (formData.customerName && !selectedCustomerId && !isManualNameUpdate) {
      const parsed = parseCustomerName(formData.customerName)

      if (parsed.salutation && parsed.salutation !== salutation) {
        setSalutation(parsed.salutation)
      }
      if (parsed.firstName && parsed.firstName !== firstName) {
        setFirstName(parsed.firstName)
      }
      if (parsed.lastName && parsed.lastName !== lastName) {
        setLastName(parsed.lastName)
      }
    }

    // Reset flag nach kurzer Zeit
    if (isManualNameUpdate) {
      const timer = setTimeout(() => setIsManualNameUpdateLocal(false), 100)
      return () => clearTimeout(timer)
    }
  }, [
    formData.customerName,
    selectedCustomerId,
    isManualNameUpdate,
    salutation,
    firstName,
    lastName,
  ])

  // Wrapper für setIsManualNameUpdate um beide States zu aktualisieren
  const handleSetIsManualNameUpdate = (value: boolean) => {
    setIsManualNameUpdateLocal(value)
    setIsManualNameUpdate(value)
  }

  return {
    customers,
    selectedCustomerId,
    setSelectedCustomerId,
    customerSearchTerm,
    setCustomerSearchTerm,
    showCustomerDropdown,
    setShowCustomerDropdown,
    filteredCustomers,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    salutation,
    setSalutation,
    companyName,
    setCompanyName,
    taxId,
    setTaxId,
    contactPerson,
    setContactPerson,
    setIsManualNameUpdate: handleSetIsManualNameUpdate,
  }
}
