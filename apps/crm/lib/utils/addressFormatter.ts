/**
 * Address Formatter Utility
 *
 * Pure functions für das Formatieren von Adressen aus Customer-Objekten
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
