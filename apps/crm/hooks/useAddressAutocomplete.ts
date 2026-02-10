'use client'

import { useState, useEffect, useRef } from 'react'
import type { CustomerProject } from '@/types'
import { logger } from '@/lib/utils/logger'

export interface AddressSuggestion {
  display: string
  full: string
}

interface UseAddressAutocompleteProps {
  formData: Partial<CustomerProject>
  setFormData: React.Dispatch<React.SetStateAction<Partial<CustomerProject>>>
}

interface UseAddressAutocompleteResult {
  addressSuggestions: AddressSuggestion[]
  setAddressSuggestions: React.Dispatch<React.SetStateAction<AddressSuggestion[]>>
  addressInput: string
  setAddressInput: React.Dispatch<React.SetStateAction<string>>
  isLoadingAddress: boolean
  handleAddressInput: (value: string) => void
}

/**
 * Hook für Address-Autocomplete mit Debouncing
 *
 * Verwendet OpenStreetMap Nominatim API via Next.js Proxy-Route
 */
export function useAddressAutocomplete({
  formData,
  setFormData,
}: UseAddressAutocompleteProps): UseAddressAutocompleteResult {
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([])
  const [addressInput, setAddressInput] = useState('')
  const [isLoadingAddress, setIsLoadingAddress] = useState(false)
  const addressSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Sync addressInput from formData when formData.address is set (z. B. Kunde übernehmen, Projekt bearbeiten)
  useEffect(() => {
    const nextAddress = formData.address
    if (typeof nextAddress === 'string' && nextAddress !== '') {
      setAddressInput(prev => (prev === nextAddress ? prev : nextAddress))
    }
  }, [formData.address])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (addressSearchTimeoutRef.current) {
        clearTimeout(addressSearchTimeoutRef.current)
      }
    }
  }, [])

  const handleAddressInput = (value: string): void => {
    setAddressInput(value)
    setFormData(prev => ({ ...prev, address: value }))

    // Clear previous timeout
    if (addressSearchTimeoutRef.current) {
      clearTimeout(addressSearchTimeoutRef.current)
      addressSearchTimeoutRef.current = null
    }

    if (value.length > 3) {
      // Debounce: Warte 500ms nach letztem Tastendruck
      const timeout = setTimeout(async () => {
        setIsLoadingAddress(true)
        try {
          // Verwende Next.js API Route als Proxy (um CORS-Probleme zu vermeiden)
          const response = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (response.ok) {
            const data = await response.json()
            if (data.suggestions && Array.isArray(data.suggestions)) {
              setAddressSuggestions(data.suggestions)
            } else {
              setAddressSuggestions([])
            }
          } else {
            setAddressSuggestions([])
          }
        } catch (error) {
          logger.error('Error fetching address suggestions', { component: 'useAddressAutocomplete' }, error instanceof Error ? error : new Error(String(error)))
          setAddressSuggestions([])
        } finally {
          setIsLoadingAddress(false)
        }
      }, 500)

      addressSearchTimeoutRef.current = timeout
    } else {
      setAddressSuggestions([])
      setIsLoadingAddress(false)
    }
  }

  return {
    addressSuggestions,
    setAddressSuggestions,
    addressInput,
    setAddressInput,
    isLoadingAddress,
    handleAddressInput,
  }
}
