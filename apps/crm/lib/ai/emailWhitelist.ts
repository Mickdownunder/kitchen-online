/**
 * E-Mail-Whitelist für KI-gesteuerten E-Mail-Versand.
 * Nur Empfänger erlauben, die im System vorkommen (Projekt, Kunde, Mitarbeiter).
 */
import type { CustomerProject } from '@/types'
import { getEmployees } from '@/lib/supabase/services/company'

export interface WhitelistOptions {
  /** Projekte zur Ermittlung erlaubter E-Mail-Adressen (Projekt-E-Mail = Kunde) */
  projects: CustomerProject[]
  /** Optional: Nur E-Mails aus diesem Projekt berücksichtigen (für sendEmail mit projectId) */
  projectId?: string
  /** Mitarbeiter-E-Mails in die Whitelist aufnehmen (für Workflows, z.B. Disponent) */
  includeEmployees?: boolean
}

/**
 * Sammelt alle erlaubten E-Mail-Adressen aus Projekten und optional Mitarbeitern.
 */
export async function getAllowedEmailRecipients(
  opts: WhitelistOptions
): Promise<string[]> {
  const { projects, projectId, includeEmployees } = opts
  const allowed = new Set<string>()

  // Projekt-E-Mails
  const projectsToUse = projectId
    ? projects.filter(p => String(p.id) === String(projectId))
    : projects
  for (const p of projectsToUse) {
    const email = p.email?.trim().toLowerCase()
    if (email) allowed.add(email)
  }

  // Mitarbeiter-E-Mails (für Workflows, z.B. Disponent)
  if (includeEmployees) {
    const employees = await getEmployees()
    for (const e of employees) {
      const email = e.email?.trim().toLowerCase()
      if (email) allowed.add(email)
    }
  }

  return Array.from(allowed)
}

/**
 * Prüft, ob eine E-Mail-Adresse (oder mehrere, komma-getrennt) in der Whitelist ist.
 */
export function isEmailAllowed(
  to: string,
  allowed: string[]
): { allowed: boolean; disallowed: string[] } {
  const allowedSet = new Set(allowed.map(a => a.toLowerCase()))
  const toAddresses = to
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  const disallowed = toAddresses.filter(addr => !allowedSet.has(addr))
  return {
    allowed: disallowed.length === 0,
    disallowed,
  }
}

/** Fehlermeldung für nicht freigegebene E-Mail-Adressen */
export const WHITELIST_ERROR_MESSAGE =
  'E-Mail-Adresse(n) "{0}" sind nicht als Empfänger freigegeben. Bitte nur an im Projekt hinterlegte Kunden-E-Mails oder Mitarbeiter versenden bzw. manuell in der Rechnungsansicht versenden.'

export function formatWhitelistError(disallowed: string[]): string {
  return `❌ ${WHITELIST_ERROR_MESSAGE.replace('{0}', disallowed.join(', '))}`
}
