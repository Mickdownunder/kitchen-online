/**
 * Server-Side AI Function Call Handlers
 *
 * These handlers run inside the /api/chat/stream API route on the server.
 * They use the server Supabase client (with user auth from cookies).
 * Unlike the browser handlers, they don't touch React state (setProjects).
 * Instead they return which project IDs were modified so the browser can refresh.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'
import { roundTo2Decimals } from '@/lib/utils/priceCalculations'

// ============================================
// Types
// ============================================

type Args = Record<string, unknown>

export interface ServerHandlerResult {
  result: string
  updatedProjectIds?: string[]
  pendingEmail?: PendingEmailInfo
}

export interface PendingEmailInfo {
  functionName: string
  to: string
  subject: string
  bodyPreview: string
  api: string
  payload: Record<string, unknown>
  projectId?: string
  reminderType?: string
}

type ServerHandler = (
  args: Args,
  supabase: SupabaseClient,
  userId: string
) => Promise<ServerHandlerResult>

// ============================================
// Blocked functions
// ============================================

const blockedFunctions = new Set([
  'deleteProject',
  'deleteComplaint',
  'deleteCustomer',
  'deleteArticle',
  'deleteEmployee',
  'removeItemFromProject',
])

// ============================================
// Helpers
// ============================================

function timestamp(): string {
  return new Date().toLocaleDateString('de-DE')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findProject(supabase: SupabaseClient, idOrName: string): Promise<any | null> {
  if (!idOrName) return null

  // Try by UUID
  if (idOrName.length >= 32) {
    const { data } = await supabase.from('projects').select('*').eq('id', idOrName).maybeSingle()
    if (data) return data
  }

  // Try by order number
  const { data: byOrder } = await supabase
    .from('projects')
    .select('*')
    .eq('order_number', idOrName)
    .maybeSingle()
  if (byOrder) return byOrder

  // Try by customer name (partial match)
  const { data: byName } = await supabase
    .from('projects')
    .select('*')
    .ilike('customer_name', `%${idOrName}%`)
    .limit(1)
    .maybeSingle()
  return byName
}

async function appendProjectNote(
  supabase: SupabaseClient,
  projectId: string,
  note: string
): Promise<void> {
  const { data: project } = await supabase
    .from('projects')
    .select('notes')
    .eq('id', projectId)
    .single()
  const existingNotes = (project?.notes as string) || ''
  await supabase
    .from('projects')
    .update({ notes: `${existingNotes}\n${timestamp()}: ${note}` })
    .eq('id', projectId)
}

// ============================================
// Email Whitelist (server-side)
// ============================================

/**
 * Collects allowed email addresses from projects and employees.
 * This is the server-side equivalent of lib/ai/emailWhitelist.ts
 * but uses the server Supabase client instead of browser services.
 */
async function getAllowedEmails(
  supabase: SupabaseClient,
  userId: string,
  projectId?: string
): Promise<Set<string>> {
  const allowed = new Set<string>()

  // Collect project emails
  if (projectId) {
    const { data: project } = await supabase
      .from('projects')
      .select('email')
      .eq('id', projectId)
      .maybeSingle()
    if (project?.email) allowed.add((project.email as string).trim().toLowerCase())
  } else {
    // Get all project emails for the user
    const { data: projects } = await supabase
      .from('projects')
      .select('email')
      .not('email', 'is', null)
    if (projects) {
      for (const p of projects) {
        if (p.email) allowed.add((p.email as string).trim().toLowerCase())
      }
    }
  }

  // Collect employee emails
  const { data: settings } = await supabase
    .from('company_settings')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (settings?.id) {
    const { data: employees } = await supabase
      .from('employees')
      .select('email')
      .eq('company_id', settings.id)
      .eq('is_active', true)
      .not('email', 'is', null)
    if (employees) {
      for (const e of employees) {
        if (e.email) allowed.add((e.email as string).trim().toLowerCase())
      }
    }
  }

  return allowed
}

function checkEmailWhitelist(
  to: string,
  allowed: Set<string>
): { ok: boolean; blocked: string[] } {
  const addresses = to.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  const blocked = addresses.filter(addr => !allowed.has(addr))
  return { ok: blocked.length === 0, blocked }
}

function formatWhitelistError(blocked: string[]): string {
  return `❌ E-Mail-Adresse(n) "${blocked.join(', ')}" nicht freigegeben. Nur an im Projekt hinterlegte Kunden-E-Mails oder Mitarbeiter-E-Mails erlaubt.`
}

// ============================================
// Audit Logging (server-side, direct to DB)
// ============================================

async function logAuditToDB(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  entityType: string,
  entityId: string | undefined,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      metadata,
    })
  } catch (err) {
    // Audit logging should never break the main operation
    logger.error('Failed to write audit log', {
      component: 'serverHandlers',
      error: err instanceof Error ? err.message : 'unknown',
    })
  }
}

async function getNextInvoiceNumber(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  // Get company settings for prefix and counter
  const { data: settings } = await supabase
    .from('company_settings')
    .select('invoice_prefix, next_invoice_number')
    .eq('user_id', userId)
    .maybeSingle()

  const prefix = (settings?.invoice_prefix as string) || 'RE'
  const nextNum = (settings?.next_invoice_number as number) || 1
  const year = new Date().getFullYear()
  const invoiceNumber = `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`

  // Increment counter
  if (settings) {
    await supabase
      .from('company_settings')
      .update({ next_invoice_number: nextNum + 1 })
      .eq('user_id', userId)
  }

  return invoiceNumber
}

// ============================================
// Handler implementations
// ============================================

const handleUpdateProjectDetails: ServerHandler = async (args, supabase) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}
  if (args.newStatus) updates.status = args.newStatus
  if (args.deliveryDate) updates.delivery_date = args.deliveryDate
  if (args.installationDate) updates.installation_date = args.installationDate
  if (args.salespersonName) updates.salesperson_name = args.salespersonName
  if (args.notes !== undefined) {
    updates.notes = `${project.notes || ''}\n${timestamp()}: ${args.notes}`
  }

  const { error } = await supabase.from('projects').update(updates).eq('id', project.id)
  if (error) return { result: `❌ Fehler: ${error.message}` }

  return { result: `✅ Projekt ${project.order_number} aktualisiert.`, updatedProjectIds: [project.id] }
}

const handleUpdateCustomerInfo: ServerHandler = async (args, supabase) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}
  if (args.customerName) updates.customer_name = args.customerName
  if (args.address) updates.address = args.address
  if (args.phone) updates.phone = args.phone
  if (args.email) updates.email = args.email

  const { error } = await supabase.from('projects').update(updates).eq('id', project.id)
  if (error) return { result: `❌ Fehler: ${error.message}` }

  return { result: `✅ Kundendaten aktualisiert.`, updatedProjectIds: [project.id] }
}

const handleUpdateWorkflowStatus: ServerHandler = async (args, supabase) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}
  if (args.isMeasured !== undefined) updates.is_measured = args.isMeasured
  if (args.measurementDate) updates.measurement_date = args.measurementDate
  if (args.isOrdered !== undefined) updates.is_ordered = args.isOrdered
  if (args.orderDate) updates.order_date = args.orderDate
  if (args.isInstallationAssigned !== undefined) updates.is_installation_assigned = args.isInstallationAssigned
  if (args.installationDate) updates.installation_date = args.installationDate

  const { error } = await supabase.from('projects').update(updates).eq('id', project.id)
  if (error) return { result: `❌ Fehler: ${error.message}` }

  return { result: `✅ Workflow-Status aktualisiert.`, updatedProjectIds: [project.id] }
}

const handleAddProjectNote: ServerHandler = async (args, supabase) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  await appendProjectNote(supabase, project.id, args.note as string)
  return { result: `✅ Notiz hinzugefügt.`, updatedProjectIds: [project.id] }
}

const handleUpdateFinancialAmounts: ServerHandler = async (args, supabase) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}

  if (args.totalAmount !== undefined) {
    const amount = roundTo2Decimals(args.totalAmount as number)
    const net = roundTo2Decimals(amount / 1.2)
    updates.total_amount = amount
    updates.net_amount = net
    updates.tax_amount = roundTo2Decimals(amount - net)
  }
  if (args.depositAmount !== undefined) {
    updates.deposit_amount = roundTo2Decimals(args.depositAmount as number)
  }

  const { error } = await supabase.from('projects').update(updates).eq('id', project.id)
  if (error) return { result: `❌ Fehler: ${error.message}` }

  await appendProjectNote(supabase, project.id, 'KI aktualisierte Finanzbeträge.')
  return { result: `✅ Finanzbeträge aktualisiert.`, updatedProjectIds: [project.id] }
}

const handleUpdatePaymentStatus: ServerHandler = async (args, supabase) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}
  if (args.depositPaid !== undefined) updates.is_deposit_paid = args.depositPaid
  if (args.finalPaid !== undefined) updates.is_final_paid = args.finalPaid

  const { error } = await supabase.from('projects').update(updates).eq('id', project.id)
  if (error) return { result: `❌ Fehler: ${error.message}` }

  return { result: `✅ Zahlungsstatus aktualisiert.`, updatedProjectIds: [project.id] }
}

const handleCreatePartialPayment: ServerHandler = async (args, supabase, userId) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  const amount = args.amount as number
  if (!amount || amount <= 0) return { result: '❌ Betrag muss größer als 0 sein.' }
  const totalAmount = parseFloat(project.total_amount) || 0
  if (amount > totalAmount) return { result: `❌ Anzahlung (${amount}€) > Gesamtbetrag (${totalAmount}€).` }

  const invoiceNumber = (args.invoiceNumber as string) || await getNextInvoiceNumber(supabase, userId)
  const date = (args.date as string) || new Date().toISOString().split('T')[0]
  const description = (args.description as string) || 'Anzahlung'

  const amountRounded = roundTo2Decimals(amount)
  const taxRate = 20
  const net = roundTo2Decimals(amountRounded / (1 + taxRate / 100))
  const tax = roundTo2Decimals(amountRounded - net)

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      user_id: userId,
      project_id: project.id,
      type: 'partial',
      invoice_number: invoiceNumber,
      amount: amountRounded,
      net_amount: net,
      tax_amount: tax,
      tax_rate: taxRate,
      invoice_date: date,
      description,
      is_paid: false,
    })
    .select('id, invoice_number, amount')
    .single()

  if (error) return { result: `❌ Fehler: ${error.message}` }

  await appendProjectNote(supabase, project.id, `Anzahlung "${description}" (${amountRounded}€) erfasst. Rechnungsnummer: ${invoice.invoice_number}`)
  return {
    result: `✅ Anzahlung "${description}" über ${amountRounded}€ erfasst. Rechnungsnummer: ${invoice.invoice_number}`,
    updatedProjectIds: [project.id],
  }
}

const handleUpdatePartialPayment: ServerHandler = async (args, supabase) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  const invoiceId = args.paymentId as string
  if (!invoiceId) return { result: '❌ paymentId fehlt.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}
  if (args.isPaid !== undefined) {
    updates.is_paid = args.isPaid as boolean
    if (args.isPaid) updates.paid_date = (args.paidDate as string) || new Date().toISOString().split('T')[0]
    else updates.paid_date = null
  }
  if (args.amount !== undefined) updates.amount = roundTo2Decimals(args.amount as number)
  if (args.description) updates.description = args.description

  const { error } = await supabase.from('invoices').update(updates).eq('id', invoiceId)
  if (error) return { result: `❌ Fehler: ${error.message}` }

  return { result: `✅ Rechnung aktualisiert.`, updatedProjectIds: [project.id] }
}

const handleCreateFinalInvoice: ServerHandler = async (args, supabase, userId) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  // Check if final invoice already exists
  const { data: existing } = await supabase
    .from('invoices')
    .select('id, invoice_number, amount')
    .eq('project_id', project.id)
    .eq('type', 'final')
    .maybeSingle()

  if (existing) {
    return { result: `⚠️ Schlussrechnung existiert bereits: ${existing.invoice_number} (${existing.amount}€)` }
  }

  // Calculate remaining amount
  const { data: partials } = await supabase
    .from('invoices')
    .select('amount')
    .eq('project_id', project.id)
    .eq('type', 'partial')

  const totalPartial = (partials || []).reduce((sum: number, inv: { amount: number }) => sum + inv.amount, 0)
  const totalAmount = parseFloat(project.total_amount) || 0
  const finalAmount = roundTo2Decimals(totalAmount - totalPartial)

  if (finalAmount <= 0) {
    return { result: `❌ Kein Restbetrag. Gesamt: ${totalAmount}€, Anzahlungen: ${totalPartial}€` }
  }

  const invoiceNumber = (args.invoiceNumber as string) || await getNextInvoiceNumber(supabase, userId)
  const date = (args.date as string) || new Date().toISOString().split('T')[0]
  const taxRate = 20
  const net = roundTo2Decimals(finalAmount / (1 + taxRate / 100))
  const tax = roundTo2Decimals(finalAmount - net)

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      user_id: userId,
      project_id: project.id,
      type: 'final',
      invoice_number: invoiceNumber,
      amount: finalAmount,
      net_amount: net,
      tax_amount: tax,
      tax_rate: taxRate,
      invoice_date: date,
      description: 'Schlussrechnung',
      is_paid: false,
    })
    .select('id, invoice_number, amount')
    .single()

  if (error) return { result: `❌ Fehler: ${error.message}` }

  await appendProjectNote(supabase, project.id, `Schlussrechnung "${invoice.invoice_number}" über ${finalAmount.toFixed(2)}€ erstellt.`)
  return {
    result: `✅ Schlussrechnung "${invoice.invoice_number}" über ${finalAmount.toFixed(2)}€ erstellt.`,
    updatedProjectIds: [project.id],
  }
}

const handleUpdateInvoiceNumber: ServerHandler = async (args, supabase) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  const { error } = await supabase
    .from('projects')
    .update({ invoice_number: args.invoiceNumber })
    .eq('id', project.id)

  if (error) return { result: `❌ Fehler: ${error.message}` }
  return { result: `✅ Rechnungsnummer aktualisiert.`, updatedProjectIds: [project.id] }
}

const handleConfigurePaymentSchedule: ServerHandler = async (args, supabase) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  const firstPercent = args.firstPercent as number
  const secondPercent = args.secondPercent as number
  const finalPercent = args.finalPercent as number
  const sum = firstPercent + secondPercent + finalPercent
  if (Math.abs(sum - 100) > 0.01) return { result: `❌ Summe muss 100% sein (aktuell: ${sum}%).` }

  const paymentSchedule = {
    firstPercent,
    secondPercent,
    finalPercent,
    secondDueDaysBeforeDelivery: (args.secondDueDaysBeforeDelivery as number) || 21,
    autoCreateFirst: args.autoCreateFirst !== undefined ? args.autoCreateFirst : true,
    autoCreateSecond: args.autoCreateSecond !== undefined ? args.autoCreateSecond : true,
  }

  const { error } = await supabase
    .from('projects')
    .update({ payment_schedule: paymentSchedule })
    .eq('id', project.id)

  if (error) return { result: `❌ Fehler: ${error.message}` }

  await appendProjectNote(supabase, project.id, `Zahlungsschema: ${firstPercent}%-${secondPercent}%-${finalPercent}%`)
  return { result: `✅ Zahlungsschema konfiguriert: ${firstPercent}%-${secondPercent}%-${finalPercent}%`, updatedProjectIds: [project.id] }
}

const handleAddItemToProject: ServerHandler = async (args, supabase) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  const description = args.description as string
  if (!description?.trim()) return { result: '❌ Artikelbeschreibung fehlt.' }
  const quantity = Math.max(1, (args.quantity as number) || 1)
  const pricePerUnit = Math.max(0, (args.pricePerUnit as number) || 0)
  const rawTaxRate = (args.taxRate as number) || 20
  const taxRate = [10, 13, 20].includes(rawTaxRate) ? rawTaxRate : 20
  const purchasePricePerUnit = Math.max(0, (args.purchasePricePerUnit as number) || 0)

  const netTotal = roundTo2Decimals(quantity * pricePerUnit)
  const taxAmount = roundTo2Decimals(netTotal * (taxRate / 100))
  const grossTotal = roundTo2Decimals(netTotal + taxAmount)

  // Get existing items
  const { data: existingItems } = await supabase
    .from('invoice_items')
    .select('position')
    .eq('project_id', project.id)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = existingItems?.[0] ? (existingItems[0].position as number) + 1 : 1

  const { error } = await supabase.from('invoice_items').insert({
    project_id: project.id,
    position: nextPosition,
    description: description.trim(),
    quantity,
    unit: (args.unit as string) || 'Stk',
    price_per_unit: roundTo2Decimals(pricePerUnit),
    gross_price_per_unit: pricePerUnit > 0 ? roundTo2Decimals(pricePerUnit * (1 + taxRate / 100)) : null,
    purchase_price_per_unit: purchasePricePerUnit > 0 ? roundTo2Decimals(purchasePricePerUnit) : null,
    tax_rate: taxRate,
    net_total: netTotal,
    tax_amount: taxAmount,
    gross_total: grossTotal,
    model_number: (args.modelNumber as string) || null,
    manufacturer: (args.manufacturer as string) || null,
  })

  if (error) return { result: `❌ Fehler: ${error.message}` }

  // Update project totals
  const { data: allItems } = await supabase
    .from('invoice_items')
    .select('net_total, tax_amount, gross_total')
    .eq('project_id', project.id)

  if (allItems) {
    const totalNet = roundTo2Decimals(allItems.reduce((s: number, i: { net_total: number }) => s + (i.net_total || 0), 0))
    const totalTax = roundTo2Decimals(allItems.reduce((s: number, i: { tax_amount: number }) => s + (i.tax_amount || 0), 0))
    const totalGross = roundTo2Decimals(allItems.reduce((s: number, i: { gross_total: number }) => s + (i.gross_total || 0), 0))

    await supabase.from('projects').update({
      net_amount: totalNet,
      tax_amount: totalTax,
      total_amount: totalGross,
    }).eq('id', project.id)
  }

  return {
    result: `✅ Artikel "${description}" hinzugefügt. (${quantity}x, ${grossTotal.toFixed(2)}€)`,
    updatedProjectIds: [project.id],
  }
}

const handleUpdateItem: ServerHandler = async (args, supabase) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  const itemId = args.itemId as string
  if (!itemId) return { result: '❌ itemId fehlt.' }

  // Get current item
  const { data: item } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('id', itemId)
    .single()

  if (!item) return { result: '❌ Artikel nicht gefunden.' }

  const description = (args.description as string) || item.description
  const quantity = (args.quantity as number) || item.quantity
  const pricePerUnit = args.pricePerUnit !== undefined ? (args.pricePerUnit as number) : (item.price_per_unit || 0)
  const taxRate = args.taxRate !== undefined ? (args.taxRate as number) : (parseInt(item.tax_rate) || 20)
  const purchasePricePerUnit = args.purchasePricePerUnit !== undefined ? (args.purchasePricePerUnit as number) : item.purchase_price_per_unit

  const netTotal = roundTo2Decimals(quantity * pricePerUnit)
  const taxAmount = roundTo2Decimals(netTotal * (taxRate / 100))
  const grossTotal = roundTo2Decimals(netTotal + taxAmount)

  const { error } = await supabase
    .from('invoice_items')
    .update({
      description,
      quantity,
      price_per_unit: roundTo2Decimals(pricePerUnit),
      gross_price_per_unit: pricePerUnit > 0 ? roundTo2Decimals(pricePerUnit * (1 + taxRate / 100)) : null,
      purchase_price_per_unit: purchasePricePerUnit != null ? roundTo2Decimals(purchasePricePerUnit) : null,
      tax_rate: taxRate,
      net_total: netTotal,
      tax_amount: taxAmount,
      gross_total: grossTotal,
    })
    .eq('id', itemId)

  if (error) return { result: `❌ Fehler: ${error.message}` }

  return { result: `✅ Artikel "${description}" aktualisiert.`, updatedProjectIds: [project.id] }
}

const handleCreateComplaint: ServerHandler = async (args, supabase, userId) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  const { data: complaint, error } = await supabase
    .from('complaints')
    .insert({
      user_id: userId,
      project_id: project.id,
      description: args.description as string,
      status: 'reported',
      priority: (args.priority as string) || 'medium',
      reported_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) return { result: `❌ Fehler: ${error.message}` }

  await appendProjectNote(supabase, project.id, `Reklamation erfasst: ${args.description}`)
  return { result: `✅ Reklamation erfasst (ID: ${complaint.id}).`, updatedProjectIds: [project.id] }
}

const handleUpdateComplaintStatus: ServerHandler = async (args, supabase) => {
  const statusMap: Record<string, string> = {
    Open: 'reported',
    InProgress: 'ab_confirmed',
    Resolved: 'resolved',
  }

  const statusArg = args.status as string
  const newStatus = statusMap[statusArg] || statusArg

  const { error } = await supabase
    .from('complaints')
    .update({ status: newStatus })
    .eq('id', args.complaintId as string)

  if (error) return { result: `❌ Fehler: ${error.message}` }

  const project = await findProject(supabase, args.projectId as string)
  if (project) {
    await appendProjectNote(supabase, project.id, `Reklamationsstatus auf "${newStatus}" gesetzt.`)
  }

  return { result: `✅ Reklamationsstatus auf "${newStatus}" gesetzt.`, updatedProjectIds: project ? [project.id] : [] }
}

const handleCreateArticle: ServerHandler = async (args, supabase, userId) => {
  const name = args.name as string
  if (!name?.trim()) return { result: '❌ Artikelname fehlt.' }

  const { data: article, error } = await supabase
    .from('articles')
    .insert({
      user_id: userId,
      name,
      sku: (args.articleNumber as string) || `ART-${Date.now().toString().slice(-6)}`,
      description: (args.description as string) || null,
      category: (args.category as string) || 'Other',
      unit: (args.unit as string) || 'Stk',
      default_purchase_price: (args.purchasePrice as number) || 0,
      default_sale_price: (args.sellingPrice as number) || 0,
      tax_rate: (args.taxRate as number) || 20,
      manufacturer: (args.supplier as string) || null,
      is_active: true,
    })
    .select('id, sku')
    .single()

  if (error) return { result: `❌ Fehler: ${error.message}` }
  return { result: `✅ Artikel "${name}" angelegt (SKU: ${article.sku}, ID: ${article.id}).` }
}

const handleUpdateArticle: ServerHandler = async (args, supabase) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}
  if (args.name) updates.name = args.name
  if (args.articleNumber) updates.sku = args.articleNumber
  if (args.description) updates.description = args.description
  if (args.purchasePrice !== undefined) updates.default_purchase_price = args.purchasePrice
  if (args.sellingPrice !== undefined) updates.default_sale_price = args.sellingPrice
  if (args.taxRate !== undefined) updates.tax_rate = args.taxRate
  if (args.supplier) updates.manufacturer = args.supplier
  if (args.isActive !== undefined) updates.is_active = args.isActive

  const { error } = await supabase.from('articles').update(updates).eq('id', args.articleId as string)
  if (error) return { result: `❌ Fehler: ${error.message}` }
  return { result: `✅ Artikel aktualisiert.` }
}

const handleCreateCustomer: ServerHandler = async (args, supabase, userId) => {
  const firstName = args.firstName as string
  const lastName = args.lastName as string
  if (!firstName || !lastName) return { result: '❌ Vorname und Nachname sind erforderlich.' }

  // Check for duplicates
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', userId)
    .ilike('first_name', firstName)
    .ilike('last_name', lastName)
    .maybeSingle()

  if (existing) {
    return { result: `⚠️ Kunde "${firstName} ${lastName}" existiert bereits (ID: ${existing.id}).` }
  }

  const address = {
    street: (args.street as string) || '',
    houseNumber: (args.houseNumber as string) || '',
    postalCode: (args.postalCode as string) || '',
    city: (args.city as string) || '',
    country: 'Österreich',
  }
  const contact = {
    phone: (args.phone as string) || '',
    email: (args.email as string) || '',
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .insert({
      user_id: userId,
      first_name: firstName,
      last_name: lastName,
      company_name: (args.companyName as string) || null,
      address,
      contact,
      notes: (args.notes as string) || null,
    })
    .select('id')
    .single()

  if (error) return { result: `❌ Fehler: ${error.message}` }
  return { result: `✅ Kunde "${firstName} ${lastName}" angelegt (ID: ${customer.id}).` }
}

const handleUpdateCustomer: ServerHandler = async (args, supabase) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}
  if (args.firstName) updates.first_name = args.firstName
  if (args.lastName) updates.last_name = args.lastName
  if (args.companyName) updates.company_name = args.companyName
  if (args.notes) updates.notes = args.notes

  if (args.street || args.houseNumber || args.postalCode || args.city) {
    updates.address = {
      street: (args.street as string) || '',
      houseNumber: (args.houseNumber as string) || '',
      postalCode: (args.postalCode as string) || '',
      city: (args.city as string) || '',
    }
  }
  if (args.phone || args.email) {
    updates.contact = { phone: (args.phone as string) || '', email: (args.email as string) || '' }
  }

  const { error } = await supabase.from('customers').update(updates).eq('id', args.customerId as string)
  if (error) return { result: `❌ Fehler: ${error.message}` }
  return { result: `✅ Kunde aktualisiert.` }
}

const handleCreateEmployee: ServerHandler = async (args, supabase, userId) => {
  const { data: settings } = await supabase
    .from('company_settings')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!settings) return { result: '❌ Bitte zuerst Firmenstammdaten anlegen.' }

  const firstName = args.firstName as string
  const lastName = args.lastName as string

  const { error } = await supabase.from('employees').insert({
    company_id: settings.id,
    first_name: firstName,
    last_name: lastName,
    email: (args.email as string) || null,
    phone: (args.phone as string) || null,
    role: (args.role as string) || 'other',
    commission_rate: (args.commissionRate as number) || 0,
    is_active: true,
  })

  if (error) return { result: `❌ Fehler: ${error.message}` }
  return { result: `✅ Mitarbeiter "${firstName} ${lastName}" angelegt.` }
}

const handleUpdateEmployee: ServerHandler = async (args, supabase) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}
  if (args.firstName) updates.first_name = args.firstName
  if (args.lastName) updates.last_name = args.lastName
  if (args.email) updates.email = args.email
  if (args.phone) updates.phone = args.phone
  if (args.role) updates.role = args.role
  if (args.commissionRate !== undefined) updates.commission_rate = args.commissionRate
  if (args.isActive !== undefined) updates.is_active = args.isActive

  const { error } = await supabase.from('employees').update(updates).eq('id', args.employeeId as string)
  if (error) return { result: `❌ Fehler: ${error.message}` }
  return { result: `✅ Mitarbeiter aktualisiert.` }
}

const handleUpdateCompanySettings: ServerHandler = async (args, supabase, userId) => {
  const { data: current } = await supabase
    .from('company_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}
  if (args.companyName) updates.company_name = args.companyName
  if (args.legalForm) updates.legal_form = args.legalForm
  if (args.street) updates.street = args.street
  if (args.houseNumber) updates.house_number = args.houseNumber
  if (args.postalCode) updates.postal_code = args.postalCode
  if (args.city) updates.city = args.city
  if (args.phone) updates.phone = args.phone
  if (args.email) updates.email = args.email
  if (args.website) updates.website = args.website
  if (args.uid) updates.uid = args.uid
  if (args.companyRegisterNumber) updates.company_register_number = args.companyRegisterNumber
  if (args.defaultPaymentTerms) updates.default_payment_terms = args.defaultPaymentTerms

  if (current) {
    const { error } = await supabase.from('company_settings').update(updates).eq('id', current.id)
    if (error) return { result: `❌ Fehler: ${error.message}` }
  }

  return { result: `✅ Firmenstammdaten aktualisiert.` }
}

const handleArchiveDocument: ServerHandler = async (args, supabase) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  const documentType = args.documentType as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}

  if (args.deliveryDate) updates.delivery_date = args.deliveryDate

  // Update purchase prices if provided
  const updatedItems = args.updatedItems as Array<{ description?: string; purchasePrice?: number }> | undefined
  if (updatedItems?.length) {
    const { data: items } = await supabase
      .from('invoice_items')
      .select('id, description')
      .eq('project_id', project.id)

    if (items) {
      for (const ui of updatedItems) {
        if (!ui.description || !ui.purchasePrice) continue
        const match = items.find((i: { description: string }) =>
          i.description?.toLowerCase().includes(ui.description!.toLowerCase())
        )
        if (match) {
          await supabase
            .from('invoice_items')
            .update({ purchase_price_per_unit: roundTo2Decimals(ui.purchasePrice) })
            .eq('id', match.id)
        }
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from('projects').update(updates).eq('id', project.id)
  }

  await appendProjectNote(supabase, project.id, `${documentType} archiviert und Daten aktualisiert.`)
  return { result: `✅ ${documentType} archiviert.`, updatedProjectIds: [project.id] }
}

const handleScheduleAppointment: ServerHandler = async (args, supabase, userId) => {
  const projectIdArg = args.projectId as string | undefined
  const project = projectIdArg ? await findProject(supabase, projectIdArg) : null
  const appointmentType = args.appointmentType as string
  const appointmentDate = args.date as string
  const appointmentTime = (args.time as string) || '10:00'

  // For planning appointments without a project
  if (!project || appointmentType === 'Planung' || appointmentType === 'Beratung') {
    const customerName = (args.customerName as string) || (project ? project.customer_name : 'Unbekannt')

    const { error } = await supabase.from('appointments').insert({
      user_id: userId,
      customer_name: customerName,
      date: appointmentDate,
      time: appointmentTime,
      type: 'Consultation',
      notes: (args.notes as string) || '',
    })

    if (error) return { result: `❌ Fehler: ${error.message}` }
    return { result: `✅ Planungstermin für "${customerName}" am ${appointmentDate} um ${appointmentTime} erfasst.` }
  }

  // Update project dates based on appointment type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectUpdates: Record<string, any> = {}
  if (appointmentType === 'Aufmaß' || appointmentType === 'Aufmass') {
    projectUpdates.measurement_date = appointmentDate
  } else if (appointmentType === 'Montage' || appointmentType === 'Installation') {
    projectUpdates.installation_date = appointmentDate
    projectUpdates.is_installation_assigned = true
  } else if (appointmentType === 'Lieferung') {
    projectUpdates.delivery_date = appointmentDate
  }

  if (Object.keys(projectUpdates).length > 0) {
    await supabase.from('projects').update(projectUpdates).eq('id', project.id)
  }

  await appendProjectNote(supabase, project.id, `${appointmentType}-Termin am ${appointmentDate} geplant.`)

  return {
    result: `✅ ${appointmentType}-Termin für ${project.customer_name} am ${appointmentDate} um ${appointmentTime} geplant.`,
    updatedProjectIds: [project.id],
  }
}

const handleCreateProject: ServerHandler = async (args, supabase, userId) => {
  const customerName = args.customerName as string
  if (!customerName) return { result: '❌ Kundenname fehlt.' }

  // Get next order number
  const { data: settings } = await supabase
    .from('company_settings')
    .select('id, order_prefix, next_order_number')
    .eq('user_id', userId)
    .maybeSingle()

  let orderNumber = (args.orderNumber as string) || ''
  if (!orderNumber && settings) {
    const prefix = (settings.order_prefix as string) || 'AUF'
    const nextNum = (settings.next_order_number as number) || 1
    const year = new Date().getFullYear()
    orderNumber = `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`
    await supabase
      .from('company_settings')
      .update({ next_order_number: nextNum + 1 })
      .eq('id', settings.id)
  }

  const totalAmount = roundTo2Decimals((args.totalAmount as number) || 0)
  const net = roundTo2Decimals(totalAmount / 1.2)
  const tax = roundTo2Decimals(totalAmount - net)

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      customer_name: customerName,
      address: (args.address as string) || null,
      phone: (args.phone as string) || null,
      email: (args.email as string) || null,
      order_number: orderNumber,
      total_amount: totalAmount,
      net_amount: net,
      tax_amount: tax,
      deposit_amount: 0,
      status: 'Planung',
      salesperson_name: (args.salespersonName as string) || null,
      notes: (args.notes as string) || `${timestamp()}: Projekt angelegt.`,
    })
    .select('id, order_number')
    .single()

  if (error) return { result: `❌ Fehler: ${error.message}` }
  return {
    result: `✅ Projekt "${customerName}" angelegt (${project.order_number}, ID: ${project.id}).`,
    updatedProjectIds: [project.id],
  }
}

const handleSendEmail: ServerHandler = async (args, supabase, userId) => {
  const emailTo = args.to as string
  const emailSubject = args.subject as string
  const emailBody = args.body as string

  if (!emailTo || !emailSubject || !emailBody) {
    return { result: '❌ E-Mail-Parameter unvollständig. Benötigt: to, subject, body' }
  }

  // SECURITY: Email whitelist check
  const allowed = await getAllowedEmails(supabase, userId, args.projectId as string | undefined)
  const { ok, blocked } = checkEmailWhitelist(emailTo, allowed)
  if (!ok) return { result: formatWhitelistError(blocked) }

  // E-Mail requires human confirmation - return as pending
  const pdfType = args.pdfType as string | undefined
  const bodyPreview = emailBody.length > 150 ? `${emailBody.slice(0, 150)}...` : emailBody

  if (pdfType) {
    if (!args.projectId) return { result: '❌ projectId ist erforderlich wenn pdfType gesetzt ist.' }
    return {
      result: 'E-Mail-Versand erfordert Bestätigung durch den Nutzer.',
      pendingEmail: {
        functionName: 'sendEmail',
        to: emailTo,
        subject: emailSubject,
        bodyPreview,
        api: '/api/email/send-with-pdf',
        payload: {
          to: emailTo.split(',').map((e: string) => e.trim()),
          subject: emailSubject,
          body: emailBody,
          pdfType,
          projectId: args.projectId,
          invoiceId: args.invoiceId,
          deliveryNoteId: args.deliveryNoteId,
        },
        projectId: args.projectId as string,
      },
    }
  }

  // Plain text email - also requires confirmation
  return {
    result: 'E-Mail-Versand erfordert Bestätigung durch den Nutzer.',
    pendingEmail: {
      functionName: 'sendEmail',
      to: emailTo,
      subject: emailSubject,
      bodyPreview,
      api: '/api/email/send',
      payload: {
        to: emailTo.split(',').map((e: string) => e.trim()),
        subject: emailSubject,
        html: emailBody,
        text: emailBody,
      },
      projectId: args.projectId as string | undefined,
    },
  }
}

const handleSendReminder: ServerHandler = async (args, supabase, userId) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  const invoiceIdArg = args.invoiceId as string
  let invoice
  if (invoiceIdArg === 'final') {
    const { data } = await supabase
      .from('invoices')
      .select('id, invoice_number, amount, reminders')
      .eq('project_id', project.id)
      .eq('type', 'final')
      .maybeSingle()
    invoice = data
  } else {
    const { data } = await supabase
      .from('invoices')
      .select('id, invoice_number, amount, reminders')
      .eq('id', invoiceIdArg)
      .maybeSingle()
    invoice = data
  }

  if (!invoice) return { result: `❌ Rechnung nicht gefunden.` }

  const reminderType = (args.reminderType as string) || 'first'
  const effectiveEmail = (args.recipientEmail as string) || project.email

  if (!effectiveEmail) {
    return { result: '❌ Keine E-Mail-Adresse hinterlegt.' }
  }

  // SECURITY: Email whitelist check
  const allowed = await getAllowedEmails(supabase, userId, project.id)
  const { ok, blocked } = checkEmailWhitelist(effectiveEmail, allowed)
  if (!ok) return { result: formatWhitelistError(blocked) }

  const reminderTypeText = reminderType === 'first' ? '1. Mahnung' : reminderType === 'second' ? '2. Mahnung' : 'Letzte Mahnung'

  return {
    result: 'Mahnung erfordert Bestätigung durch den Nutzer.',
    pendingEmail: {
      functionName: 'sendReminder',
      to: effectiveEmail,
      subject: `${reminderTypeText} – Rechnung ${invoice.invoice_number}`,
      bodyPreview: `${reminderTypeText} für Rechnung ${invoice.invoice_number} (${invoice.amount}€)`,
      api: '/api/reminders/send',
      payload: {
        projectId: project.id,
        invoiceId: invoice.id,
        reminderType,
        recipientEmail: effectiveEmail,
      },
      projectId: project.id,
      reminderType,
    },
  }
}

const handleFindProjectsByCriteria: ServerHandler = async (args, supabase) => {
  let query = supabase.from('projects').select('id, customer_name, order_number, status, installation_date')

  if (args.status) query = query.eq('status', args.status)
  if (args.installationDateFrom) query = query.gte('installation_date', args.installationDateFrom)
  if (args.installationDateTo) query = query.lte('installation_date', args.installationDateTo)
  if (args.customerName) query = query.ilike('customer_name', `%${args.customerName}%`)

  const { data: projects, error } = await query
  if (error) return { result: `❌ Fehler: ${error.message}` }

  const list = (projects || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => `${p.customer_name} (${p.order_number})`)
    .join(', ')

  return { result: `✅ ${projects?.length || 0} Projekt(e) gefunden: ${list || 'keine'}` }
}

const handleExecuteWorkflow: ServerHandler = async (args) => {
  // Workflows are complex multi-step operations. For now, return a message
  // suggesting the AI break down the workflow into individual steps.
  const workflowType = args.workflowType as string
  return {
    result: `⚠️ Workflow "${workflowType}" bitte in einzelne Schritte aufteilen: Zuerst findProjectsByCriteria, dann einzelne Aktionen für jedes Projekt.`,
  }
}

// ============================================
// Handler registry
// ============================================

const handlerRegistry: Record<string, ServerHandler> = {
  createProject: handleCreateProject,
  updateProjectDetails: handleUpdateProjectDetails,
  updateCustomerInfo: handleUpdateCustomerInfo,
  updateWorkflowStatus: handleUpdateWorkflowStatus,
  addProjectNote: handleAddProjectNote,
  updateFinancialAmounts: handleUpdateFinancialAmounts,
  updatePaymentStatus: handleUpdatePaymentStatus,
  updateInvoiceNumber: handleUpdateInvoiceNumber,
  createPartialPayment: handleCreatePartialPayment,
  updatePartialPayment: handleUpdatePartialPayment,
  createFinalInvoice: handleCreateFinalInvoice,
  sendReminder: handleSendReminder,
  configurePaymentSchedule: handleConfigurePaymentSchedule,
  addItemToProject: handleAddItemToProject,
  updateItem: handleUpdateItem,
  createComplaint: handleCreateComplaint,
  updateComplaintStatus: handleUpdateComplaintStatus,
  createArticle: handleCreateArticle,
  updateArticle: handleUpdateArticle,
  createCustomer: handleCreateCustomer,
  updateCustomer: handleUpdateCustomer,
  createEmployee: handleCreateEmployee,
  updateEmployee: handleUpdateEmployee,
  updateCompanySettings: handleUpdateCompanySettings,
  archiveDocument: handleArchiveDocument,
  scheduleAppointment: handleScheduleAppointment,
  sendEmail: handleSendEmail,
  executeWorkflow: handleExecuteWorkflow,
  findProjectsByCriteria: handleFindProjectsByCriteria,
}

// ============================================
// Main execution function
// ============================================

export async function executeServerFunctionCall(
  name: string,
  args: Args,
  supabase: SupabaseClient,
  userId: string
): Promise<ServerHandlerResult> {
  // Block dangerous functions
  if (blockedFunctions.has(name)) {
    await logAuditToDB(supabase, userId, 'ai.function_blocked', 'ai_action', undefined, {
      functionName: name,
      reason: 'delete_blocked',
    })
    return { result: '⛔ Löschen ist aus Sicherheitsgründen nur manuell möglich.' }
  }

  const handler = handlerRegistry[name]
  if (!handler) {
    return { result: `⚠️ Unbekannte Aktion „${name}".` }
  }

  const start = Date.now()
  try {
    const result = await handler(args, supabase, userId)
    const duration = Date.now() - start
    const success = result.result.startsWith('✅')

    logger.info('Server function call executed', {
      component: 'serverHandlers',
      functionName: name,
      success,
      duration,
    })

    // Audit log: Write to DB for traceability
    const entityId = (args.projectId as string) || (args.customerId as string) || (args.articleId as string) || undefined
    await logAuditToDB(supabase, userId, 'ai.function_called', 'ai_action', entityId, {
      functionName: name,
      success,
      durationMs: duration,
      result: result.result.slice(0, 200),
      hasPendingEmail: !!result.pendingEmail,
      updatedProjectIds: result.updatedProjectIds,
    })

    return result
  } catch (error) {
    const duration = Date.now() - start
    const errMsg = error instanceof Error ? error.message : 'Unbekannter Fehler'
    logger.error('Server function call failed', {
      component: 'serverHandlers',
      functionName: name,
      error: errMsg,
      duration,
    })

    // Audit log: Write error to DB
    await logAuditToDB(supabase, userId, 'ai.function_failed', 'ai_action', undefined, {
      functionName: name,
      error: errMsg,
      durationMs: duration,
    })

    return { result: `❌ Fehler bei ${name}: ${errMsg}` }
  }
}
