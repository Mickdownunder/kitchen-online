import type { ServerHandler } from '../serverHandlers'
import { findProject } from '../serverHandlers'
import { roundTo2Decimals } from '@/lib/utils/priceCalculations'

export const handleAddItemToProject: ServerHandler = async (args, supabase) => {
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

export const handleUpdateItem: ServerHandler = async (args, supabase) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  const itemId = args.itemId as string
  if (!itemId) return { result: '❌ itemId fehlt.' }

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
