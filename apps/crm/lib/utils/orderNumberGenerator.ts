/**
 * Order Number Generator Utility
 *
 * Generiert eindeutige Auftragsnummern im Format: K-YYYY-XXXX
 * YYYY = Jahr, XXXX = 4-stellige Zufallszahl (1000-9999)
 */

/**
 * Generiert eine eindeutige Auftragsnummer
 * Format: K-YYYY-XXXX (z.B. K-2026-3847)
 */
export function generateOrderNumber(): string {
  const year = new Date().getFullYear()
  const randomNumber = Math.floor(1000 + Math.random() * 9000)
  return `K-${year}-${randomNumber}`
}
