/**
 * Address Formatter Utility
 *
 * Pure functions für das Formatieren und Parsen von Adressen
 */

import type { Customer } from '@/types'

/**
 * Formatiert eine vollständige Adresse aus einem Customer-Objekt
 * Format: "Straße Hausnummer, PLZ Stadt"
 */
export function formatCustomerAddress(customer: Customer): string {
  if (!customer || !customer.address) {
    return ''
  }

  const { street, houseNumber, postalCode, city } = customer.address
  const streetPart = houseNumber ? `${street} ${houseNumber}` : street
  const addressParts = [streetPart, postalCode, city].filter(Boolean)

  return addressParts.join(', ').trim()
}

export interface ParsedAddress {
  street: string
  houseNumber: string
  postalCode: string
  city: string
}

/**
 * Parst eine gespeicherte Adresse (Format "Straße Hausnummer, PLZ Stadt") in Einzelfelder
 */
export function parseAddressFromDB(address: string | null | undefined): ParsedAddress {
  const empty = { street: '', houseNumber: '', postalCode: '', city: '' }
  if (!address || typeof address !== 'string' || !address.trim()) return empty

  const trimmed = address.trim()
  const commaIdx = trimmed.indexOf(',')
  if (commaIdx < 0) {
    const lastSpace = trimmed.lastIndexOf(' ')
    if (lastSpace > 0) {
      return {
        street: trimmed.slice(0, lastSpace).trim(),
        houseNumber: trimmed.slice(lastSpace + 1).trim(),
        postalCode: '',
        city: '',
      }
    }
    return { ...empty, street: trimmed }
  }

  const streetPart = trimmed.slice(0, commaIdx).trim()
  const plzCityPart = trimmed.slice(commaIdx + 1).trim()
  const streetLastSpace = streetPart.lastIndexOf(' ')
  const street = streetLastSpace > 0 ? streetPart.slice(0, streetLastSpace).trim() : streetPart
  const houseNumber =
    streetLastSpace > 0 ? streetPart.slice(streetLastSpace + 1).trim() : ''

  const plzMatch = plzCityPart.match(/^(\d{4,5})\s+(.+)$/)
  const postalCode = plzMatch ? plzMatch[1] : ''
  const city = plzMatch ? plzMatch[2].trim() : plzCityPart

  return { street, houseNumber, postalCode, city }
}

/**
 * Baut aus Einzelfeldern die Adresse für die DB (Format "Straße Hausnummer, PLZ Stadt")
 */
export function formatAddressForDB(
  street?: string,
  houseNumber?: string,
  postalCode?: string,
  city?: string
): string {
  const streetPart = [street, houseNumber].filter(Boolean).join(' ').trim()
  const plzCityPart = [postalCode, city].filter(Boolean).join(' ').trim()
  return [streetPart, plzCityPart].filter(Boolean).join(', ').trim()
}
