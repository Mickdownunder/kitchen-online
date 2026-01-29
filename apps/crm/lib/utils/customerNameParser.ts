/**
 * Customer Name Parser Utilities
 *
 * Pure functions für das Parsen und Formatieren von Kundennamen
 */

export interface ParsedCustomerName {
  salutation: string
  firstName: string
  lastName: string
}

/**
 * Extrahiert Anrede, Vor- und Nachname aus einem vollständigen Namen
 * Unterstützt: Prof. Dr., Prof., Dr., Herr und Frau, Familie, Herr, Frau, Firma
 */
export function parseCustomerName(fullName: string): ParsedCustomerName {
  if (!fullName || !fullName.trim()) {
    return { salutation: '', firstName: '', lastName: '' }
  }

  let salutation = ''
  let remainingName = fullName.trim()

  // Extrahiere Anrede (in Reihenfolge der Spezifität)
  const salutationPatterns = [
    { pattern: 'Prof. Dr. ', value: 'Prof. Dr.' },
    { pattern: 'Prof. ', value: 'Prof.' },
    { pattern: 'Dr. ', value: 'Dr.' },
    { pattern: 'Herr und Frau ', value: 'Herr und Frau' },
    { pattern: 'Familie ', value: 'Familie' },
    { pattern: 'Herr ', value: 'Herr' },
    { pattern: 'Frau ', value: 'Frau' },
    { pattern: 'Firma ', value: 'Firma' },
  ]

  for (const { pattern, value } of salutationPatterns) {
    if (remainingName.startsWith(pattern)) {
      salutation = value
      remainingName = remainingName.replace(pattern, '')
      break
    }
  }

  // Teile Rest in Vor- und Nachname
  const parts = remainingName.trim().split(' ')
  const firstName = parts[0] || ''
  const lastName = parts.slice(1).join(' ') || ''

  return { salutation, firstName, lastName }
}

/**
 * Formatiert einen vollständigen Kundennamen aus Anrede, Vor- und Nachname
 */
export function formatCustomerName(
  salutation: string,
  firstName: string,
  lastName: string
): string {
  const nameParts = [salutation, firstName, lastName].filter(Boolean)
  return nameParts.join(' ').trim()
}
