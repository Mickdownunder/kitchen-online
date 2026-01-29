import type { CustomerProject, InvoiceItem } from '@/types'
import { getProjects, updateProject } from '@/lib/supabase/services'
import type { HandlerContext } from '../utils/handlerTypes'

export async function handleAddItemToProject(ctx: HandlerContext): Promise<string> {
  const { args, findProject, setProjects } = ctx

  const project = findProject(args.projectId as string)
  if (!project) return '❌ Projekt nicht gefunden.'

  const description = args.description as string | undefined
  const quantity = args.quantity as number | undefined
  if (!description || description.trim() === '') return '❌ Artikelbeschreibung fehlt.'
  if (!quantity || quantity <= 0) return '❌ Menge muss größer als 0 sein.'

  // WICHTIG: Lade Projekt-Daten neu aus der DB, um sicherzustellen, dass wir die aktuellsten Items haben
  // Dies verhindert, dass mehrere sequenzielle Calls die gleichen alten Daten verwenden
  let currentProject: CustomerProject
  try {
    const allProjects = await getProjects()
    const freshProject = allProjects.find(p => p.id === project.id)
    if (!freshProject) {
      return '❌ Projekt nicht gefunden in Datenbank.'
    }
    currentProject = freshProject
  } catch (error) {
    console.warn('Fehler beim Laden der aktuellen Projekt-Daten, verwende State-Daten:', error)
    currentProject = project
  }

  const modelNumber = args.modelNumber as string | undefined
  const existingItem = currentProject.items?.find(
    item =>
      item.description.toLowerCase().trim() === description.toLowerCase().trim() &&
      (!modelNumber || item.modelNumber === modelNumber)
  )
  if (existingItem) return `⚠️ Artikel "${description}" existiert bereits im Projekt.`

  // KRITISCH: AI Input-Validierung - verhindere ungültige Werte
  const rawQuantity = parseFloat(String(quantity))
  const rawPricePerUnit = parseFloat(String(args.pricePerUnit ?? 0))
  const rawPurchasePrice = parseFloat(String(args.purchasePricePerUnit ?? 0))
  const rawTaxRate = parseInt(String(args.taxRate ?? 20))

  // Validiere und korrigiere ungültige Werte
  if (!isNaN(rawQuantity) && rawQuantity <= 0) {
    return `❌ Ungültige Menge: ${rawQuantity}. Menge muss größer als 0 sein.`
  }
  if (!isNaN(rawPricePerUnit) && rawPricePerUnit < 0) {
    return `❌ Ungültiger Preis: ${rawPricePerUnit}. Preis darf nicht negativ sein.`
  }
  if (!isNaN(rawPurchasePrice) && rawPurchasePrice < 0) {
    return `❌ Ungültiger Einkaufspreis: ${rawPurchasePrice}. Preis darf nicht negativ sein.`
  }
  if (!isNaN(rawTaxRate) && (rawTaxRate < 0 || rawTaxRate > 100)) {
    return `❌ Ungültiger Steuersatz: ${rawTaxRate}. Steuersatz muss zwischen 0 und 100 liegen.`
  }

  const validQuantity = Math.max(1, rawQuantity || 1)
  const pricePerUnit = Math.max(0, rawPricePerUnit || 0)
  const taxRate = [10, 13, 20].includes(rawTaxRate) ? rawTaxRate : 20
  const purchasePricePerUnit = Math.max(0, rawPurchasePrice || 0)

  const netTotal = validQuantity * pricePerUnit
  const taxAmount = netTotal * (taxRate / 100)
  const grossTotal = netTotal + taxAmount

  const unit = (args.unit as string) || 'Stk'
  const manufacturer = args.manufacturer as string | undefined
  const newItem: InvoiceItem = {
    id: Date.now().toString(),
    position: (currentProject.items?.length || 0) + 1,
    description: description.trim(),
    quantity: validQuantity,
    unit: unit as InvoiceItem['unit'],
    pricePerUnit,
    purchasePricePerUnit,
    taxRate: taxRate as 10 | 13 | 20,
    modelNumber: modelNumber || undefined,
    manufacturer: manufacturer || undefined,
    netTotal,
    taxAmount,
    grossTotal,
  }

  try {
    const itemsBefore = currentProject.items?.length || 0
    const newItems = [...(currentProject.items || []), newItem]

    let grossTotalCalc = 0
    newItems.forEach(item => {
      const qty = item.quantity || 1
      if (item.grossPricePerUnit !== undefined && item.grossPricePerUnit !== null)
        grossTotalCalc += qty * item.grossPricePerUnit
      else if (item.grossTotal !== undefined && item.grossTotal !== null)
        grossTotalCalc += item.grossTotal
      else grossTotalCalc += (item.netTotal || 0) + (item.taxAmount || 0)
    })
    grossTotalCalc = Math.round(grossTotalCalc * 100) / 100

    const totalNet = newItems.reduce((sum, i) => sum + (i.netTotal || 0), 0)
    const totalTax = newItems.reduce((sum, i) => sum + (i.taxAmount || 0), 0)

    const updated = await updateProject(currentProject.id, {
      items: newItems,
      netAmount: totalNet,
      taxAmount: totalTax,
      totalAmount: grossTotalCalc,
    })

    const itemsAfter = updated.items?.length || 0
    if (itemsAfter <= itemsBefore)
      return `❌ Fehler: Artikel wurde nicht hinzugefügt. Bitte manuell prüfen.`

    // Validation: Prüfe ob Artikel wirklich im Projekt ist
    const verifyItem = updated.items?.find(
      item =>
        item.description.toLowerCase().trim() === newItem.description.toLowerCase().trim() &&
        item.quantity === newItem.quantity
    )
    if (!verifyItem) {
      return `❌ Fehler: Artikel wurde nicht korrekt hinzugefügt. Bitte manuell prüfen.`
    }

    setProjects(prev => prev.map(p => (p.id === currentProject.id ? updated : p)))

    const noteDate = new Date().toLocaleDateString('de-DE')
    await updateProject(currentProject.id, {
      notes: `${updated.notes || ''}\n${noteDate}: Artikel "${newItem.description}" (${validQuantity} ${newItem.unit}) hinzugefügt.`,
    })

    return `✅ Artikel "${newItem.description}" hinzugefügt. (${validQuantity} ${newItem.unit}, ${grossTotal.toFixed(2)}€)`
  } catch (error) {
    console.error('Error adding item:', error)
    return '❌ Fehler beim Hinzufügen des Artikels.'
  }
}

export async function handleUpdateItem(ctx: HandlerContext): Promise<string> {
  const { args, findProject, setProjects, timestamp } = ctx

  const project = findProject(args.projectId as string)
  if (!project) return '❌ Projekt nicht gefunden.'

  const items = project.items || []
  const itemIdx = items.findIndex(i => i.id === (args.itemId as string))
  if (itemIdx === -1) return '❌ Artikel nicht gefunden.'

  try {
    const updatedItem: InvoiceItem = { ...items[itemIdx] }
    if (args.description) updatedItem.description = args.description as string
    if (args.quantity !== undefined) updatedItem.quantity = args.quantity as number
    if (args.pricePerUnit !== undefined) updatedItem.pricePerUnit = args.pricePerUnit as number
    if (args.purchasePricePerUnit !== undefined)
      updatedItem.purchasePricePerUnit = args.purchasePricePerUnit as number
    if (args.taxRate !== undefined) updatedItem.taxRate = args.taxRate as 10 | 13 | 20

    updatedItem.netTotal = updatedItem.quantity * updatedItem.pricePerUnit
    updatedItem.taxAmount = updatedItem.netTotal * (updatedItem.taxRate / 100)
    updatedItem.grossTotal = updatedItem.netTotal + updatedItem.taxAmount

    const updatedItems = [...items]
    updatedItems[itemIdx] = updatedItem

    let grossTotalCalc = 0
    updatedItems.forEach(itemEntry => {
      const itemQuantity = itemEntry.quantity || 1
      if (itemEntry.grossPricePerUnit !== undefined && itemEntry.grossPricePerUnit !== null)
        grossTotalCalc += itemQuantity * itemEntry.grossPricePerUnit
      else if (itemEntry.grossTotal !== undefined && itemEntry.grossTotal !== null)
        grossTotalCalc += itemEntry.grossTotal
      else grossTotalCalc += (itemEntry.netTotal || 0) + (itemEntry.taxAmount || 0)
    })
    grossTotalCalc = Math.round(grossTotalCalc * 100) / 100

    const totalNet = updatedItems.reduce((sum, i) => sum + (i.netTotal || 0), 0)
    const totalTax = updatedItems.reduce((sum, i) => sum + (i.taxAmount || 0), 0)

    const updated = await updateProject(project.id, {
      items: updatedItems,
      netAmount: totalNet,
      taxAmount: totalTax,
      totalAmount: grossTotalCalc,
      notes: `${project.notes}\n${timestamp}: KI aktualisierte Artikel: ${updatedItem.description}`,
    })
    setProjects(prev => prev.map(p => (p.id === project.id ? updated : p)))
    return `✅ Artikel "${updatedItem.description}" aktualisiert.`
  } catch (error) {
    console.error('Error updating item:', error)
    return '❌ Fehler beim Aktualisieren.'
  }
}
