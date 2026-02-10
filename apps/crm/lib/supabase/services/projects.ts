/**
 * Projects Service
 *
 * Rechnungen (Anzahlungen, Schlussrechnungen) werden in der `invoices`-Tabelle verwaltet.
 * Verwende `createInvoice()`, `getInvoices()`, etc. aus '@/lib/supabase/services/invoices'.
 */

export { getProjects, getProject } from './projects/queries'
export { createProject, updateProject, deleteProject } from './projects/commands'
