'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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

interface UseCustomerSelectionResult {
  customers: Customer[]
  selectedCustomerId: string
  setSelectedCustomerId: React.Dispatch<React.SetStateAction<string>>
  customerSearchTerm: string
  setCustomerSearchTerm: React.Dispatch<React.SetStateAction<string>>
  showCustomerDropdown: boolean
  setShowCustomerDropdown: React.Dispatch<React.SetStateAction<boolean>>
  filteredCustomers: Customer[]
  firstName: string
  setFirstName: React.Dispatch<React.SetStateAction<string>>
  lastName: string
  setLastName: React.Dispatch<React.SetStateAction<string>>
  salutation: string
  setSalutation: React.Dispatch<React.SetStateAction<string>>
  companyName: string
  setCompanyName: React.Dispatch<React.SetStateAction<string>>
  taxId: string
  setTaxId: React.Dispatch<React.SetStateAction<string>>
  contactPerson: string
  setContactPerson: React.Dispatch<React.SetStateAction<string>>
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
}: UseCustomerSelectionProps): UseCustomerSelectionResult {
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

  const loadCustomers = useCallback(async () => {
    const result = await getCustomers()
    if (result.ok) {
      setCustomers(result.data)
    }
  }, [])

  // Load customers if not provided
  useEffect(() => {
    if (existingCustomers.length === 0) {
      const timer = window.setTimeout(() => {
        void loadCustomers()
      }, 0)
      return () => window.clearTimeout(timer)
    }
  }, [existingCustomers.length, loadCustomers])

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

        const addr = customer.address
        const timer = window.setTimeout(() => {
          setFormData(prev => ({
            ...prev,
            customerId: customer.id,
            customerName: fullName,
            address: fullAddress,
            addressStreet: addr?.street ?? '',
            addressHouseNumber: addr?.houseNumber ?? '',
            addressPostalCode: addr?.postalCode ?? '',
            addressCity: addr?.city ?? '',
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
        }, 0)
        return () => window.clearTimeout(timer)
      }
    }
  }, [selectedCustomerId, customers, setFormData, setAddressInput])

  // Parse customerName into firstName and lastName for display (nur beim initialen Laden)
  useEffect(() => {
    const timers: number[] = []

    // Nur parsen, wenn wir nicht manuell aktualisieren und kein Kunde ausgewählt ist
    if (formData.customerName && !selectedCustomerId && !isManualNameUpdate) {
      const parsed = parseCustomerName(formData.customerName)

      timers.push(
        window.setTimeout(() => {
          if (parsed.salutation && parsed.salutation !== salutation) {
            setSalutation(parsed.salutation)
          }
          if (parsed.firstName && parsed.firstName !== firstName) {
            setFirstName(parsed.firstName)
          }
          if (parsed.lastName && parsed.lastName !== lastName) {
            setLastName(parsed.lastName)
          }
        }, 0)
      )
    }

    // Reset flag nach kurzer Zeit
    if (isManualNameUpdate) {
      timers.push(window.setTimeout(() => setIsManualNameUpdateLocal(false), 100))
    }

    return () => {
      timers.forEach(timer => window.clearTimeout(timer))
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
  const handleSetIsManualNameUpdate = (value: boolean): void => {
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
