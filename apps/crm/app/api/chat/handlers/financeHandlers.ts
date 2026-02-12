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

export const handleGetFinancialReport: ServerHandler = async (args, supabase, userId) => {
  const now = new Date()
  const year = (args.year as number) ?? now.getFullYear()
  const month = args.month as number | undefined

  let fromDate: string
  let toDate: string
  let label: string
  if (month != null && month >= 1 && month <= 12) {
    fromDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    toDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    label = `${month}/${year}`
  } else {
    fromDate = `${year}-01-01`
    toDate = `${year}-12-31`
    label = `Jahr ${year}`
  }

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, amount, is_paid, type, invoice_date')
    .eq('user_id', userId)
    .gte('invoice_date', fromDate)
    .lte('invoice_date', toDate)

  if (error) return { result: `❌ Fehler: ${error.message}` }

  const list = (invoices || []) as { amount: number; is_paid: boolean; type: string }[]
  const revenue = list.reduce((sum, inv) => sum + (inv.amount ?? 0), 0)
  const openPartials = list
    .filter((inv) => inv.type === 'partial' && !inv.is_paid)
    .reduce((sum, inv) => sum + (inv.amount ?? 0), 0)

  const revenueRounded = roundTo2Decimals(revenue)
  const openRounded = roundTo2Decimals(openPartials)
  return {
    result: `Finanzübersicht ${label}: Umsatz (Rechnungen) ${revenueRounded.toFixed(2)} €; offene Anzahlungen ${openRounded.toFixed(2)} €.`,
  }
}

export const handleAutomaticPaymentMatch: ServerHandler = async (args, supabase, userId) => {
  const dryRun = args.dryRun === true

  const { data: transactions, error: txError } = await supabase
    .from('bank_transactions')
    .select('id, amount, transaction_date, reference')
    .eq('user_id', userId)
    .is('invoice_id', null)
    .is('supplier_invoice_id', null)
    .gt('amount', 0)
    .order('transaction_date', { ascending: false })

  if (txError) return { result: `❌ Fehler Bankbewegungen: ${txError.message}` }
  if (!transactions?.length) return { result: 'Keine unzugeordneten Eingänge (Gutschriften) vorhanden.' }

  const { data: unpaidInvoices, error: invError } = await supabase
    .from('invoices')
    .select('id, amount, invoice_number')
    .eq('user_id', userId)
    .eq('is_paid', false)
    .in('type', ['partial', 'final'])

  if (invError) return { result: `❌ Fehler Rechnungen: ${invError.message}` }
  if (!unpaidInvoices?.length) return { result: 'Keine offenen Rechnungen.' }

  const txList = transactions as { id: string; amount: number; transaction_date: string; reference: string | null }[]
  const invList = unpaidInvoices as { id: string; amount: number; invoice_number: string }[]
  const matched: { txId: string; invId: string; amount: number; invoiceNumber: string }[] = []

  for (const tx of txList) {
    const amount = roundTo2Decimals(Number(tx.amount))
    const inv = invList.find((i) => roundTo2Decimals(Number(i.amount)) === amount)
    if (!inv) continue
    matched.push({
      txId: tx.id,
      invId: inv.id,
      amount,
      invoiceNumber: inv.invoice_number,
    })
    invList.splice(invList.indexOf(inv), 1)
  }

  if (matched.length === 0) {
    return { result: 'Keine Zuordnung möglich (kein exakter Betragsübereinstieg).' }
  }

  if (dryRun) {
    const lines = matched.map(
      (m) => `Bankbewegung → Rechnung ${m.invoiceNumber}: ${m.amount.toFixed(2)} €`,
    )
    return { result: `Vorschlag (dryRun):\n${lines.join('\n')}` }
  }

  for (const m of matched) {
    await supabase
      .from('bank_transactions')
      .update({
        invoice_id: m.invId,
        supplier_invoice_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', m.txId)
      .eq('user_id', userId)
    const txDate = txList.find((t) => t.id === m.txId)?.transaction_date
    await supabase
      .from('invoices')
      .update({
        is_paid: true,
        paid_date: txDate || new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
      })
      .eq('id', m.invId)
      .eq('user_id', userId)
  }

  const summary = matched.map((m) => `${m.invoiceNumber}: ${m.amount.toFixed(2)} €`).join(', ')
  return { result: `✅ ${matched.length} Zuordnung(en): ${summary}` }
}
