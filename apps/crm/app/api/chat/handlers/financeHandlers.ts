import type { ServerHandler } from '../serverHandlers'
import { findProject, appendProjectNote, getNextInvoiceNumber } from '../serverHandlers'
import { roundTo2Decimals } from '@/lib/utils/priceCalculations'

export const handleUpdateFinancialAmounts: ServerHandler = async (args, supabase) => {
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

export const handleUpdatePaymentStatus: ServerHandler = async (args, supabase) => {
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

export const handleCreatePartialPayment: ServerHandler = async (args, supabase, userId) => {
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

export const handleUpdatePartialPayment: ServerHandler = async (args, supabase) => {
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

export const handleCreateFinalInvoice: ServerHandler = async (args, supabase, userId) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  const { data: existing } = await supabase
    .from('invoices')
    .select('id, invoice_number, amount')
    .eq('project_id', project.id)
    .eq('type', 'final')
    .maybeSingle()

  if (existing) {
    return { result: `⚠️ Schlussrechnung existiert bereits: ${existing.invoice_number} (${existing.amount}€)` }
  }

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

export const handleUpdateInvoiceNumber: ServerHandler = async (args, supabase) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  const { error } = await supabase
    .from('projects')
    .update({ invoice_number: args.invoiceNumber })
    .eq('id', project.id)

  if (error) return { result: `❌ Fehler: ${error.message}` }
  return { result: `✅ Rechnungsnummer aktualisiert.`, updatedProjectIds: [project.id] }
}

export const handleConfigurePaymentSchedule: ServerHandler = async (args, supabase) => {
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
