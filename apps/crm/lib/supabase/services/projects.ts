/**
 * Projects Service
 *
 * MIGRATION NOTE:
 * Die Felder `partial_payments` und `final_invoice` in der projects-Tabelle sind
 * DEPRECATED und werden durch die neue `invoices`-Tabelle ersetzt.
 *
 * Für neue Implementierungen:
 * - Verwende `createInvoice()`, `getInvoices()`, etc. aus '@/lib/supabase/services/invoices'
 * - Die Legacy-Felder werden weiterhin gelesen/geschrieben für Abwärtskompatibilität
 *
 * Die neuen Tabellen sind:
 * - `invoices`: Für alle Rechnungen (Anzahlungen + Schlussrechnungen)
 * - `orders`: Für Auftragsdetails und Status-Tracking
 *
 * @see supabase/migrations/20260127160000_create_invoices_table.sql
 * @see supabase/migrations/20260127160001_create_orders_table.sql
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { supabase } from '../client'
import { CustomerProject, InvoiceItem, ProjectDocument } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProjectRow = Record<string, any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InvoiceItemRow = Record<string, any>
import { getCurrentUser } from './auth'
import { getNextOrderNumber } from './company'
import { logger } from '@/lib/utils/logger'
import {
  calculateItemTotalsFromNet,
  calculateItemTotalsFromGross,
  calculateProjectTotals,
  roundTo2Decimals,
} from '@/lib/utils/priceCalculations'
import { createFirstPayment } from '@/lib/utils/paymentSchedule'
import { audit } from '@/lib/utils/auditLogger'

function generateAccessCode(length = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

export async function getProjects(): Promise<CustomerProject[]> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      logger.warn('getProjects: No user authenticated, returning empty array', { component: 'projects' })
      return []
    }

    const { data, error } = await supabase
      .from('projects')
      .select(
        `
        *,
        invoice_items (*)
      `
      )
      // TODO: Re-enable after applying migration: supabase/migrations/20260126113814_add_deleted_at_to_projects.sql
      // .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('getProjects error', { component: 'projects' }, error as Error)
      throw error
    }

    return (data || []).map(mapProjectFromDB)
  } catch (error: unknown) {
    // Ignore aborted requests (normal during page navigation)
    const err = error as { message?: string; name?: string }
    if (err?.message?.includes('aborted') || err?.name === 'AbortError') {
      return []
    }
    logger.error('getProjects failed', { component: 'projects' }, error as Error)
    // Return empty array instead of throwing to prevent 500 errors
    return []
  }
}

export async function getProject(
  id: string,
  client?: SupabaseClient<Database>
): Promise<CustomerProject | null> {
  const sb = client ?? supabase
  const { data, error } = await sb
    .from('projects')
    .select(
      `
      *,
      invoice_items (*)
    `
    )
    .eq('id', id)
    // TODO: Re-enable after applying migration: supabase/migrations/20260126113814_add_deleted_at_to_projects.sql
    // .is('deleted_at', null)
    .single()

  if (error) throw error
  return data ? mapProjectFromDB(data) : null
}

export async function createProject(
  project: Omit<CustomerProject, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CustomerProject> {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const documents = project.documents || []
    logger.debug('Creating project with data', {
      component: 'projects',
      customerName: project.customerName,
      orderNumber: project.orderNumber,
      status: project.status,
      documentsCount: documents.length,
      documentNames: documents.map((d: ProjectDocument) => d.name),
    })

    // Automatische Erstellung der ersten Anzahlung, wenn paymentSchedule konfiguriert ist
    let partialPayments = project.partialPayments || []
    if (project.paymentSchedule?.autoCreateFirst) {
      const firstPayment = createFirstPayment(project as CustomerProject)
      if (firstPayment) {
        partialPayments = [firstPayment, ...partialPayments]
        logger.info('Automatisch erste Anzahlung erstellt', {
          component: 'projects',
          invoiceNumber: firstPayment.invoiceNumber,
          amount: firstPayment.amount,
          description: firstPayment.description,
        })
      }
    }

    const accessCode = project.accessCode || generateAccessCode()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        customer_id: project.customerId || null,
        access_code: accessCode,
        salesperson_id: project.salespersonId || null,
        salesperson_name: project.salespersonName || null,
        customer_name: project.customerName || 'Unbekannt',
        customer_address: project.address || null,
        customer_phone: project.phone || null,
        customer_email: project.email || null,
        order_number: project.orderNumber || (await getNextOrderNumber()) || `K-${Date.now()}`,
        offer_number: project.offerNumber || null,
        invoice_number: project.invoiceNumber || null,
        contract_number: project.contractNumber || null,
        status: project.status || 'Planung',
        total_amount: roundTo2Decimals(project.totalAmount || 0),
        net_amount: roundTo2Decimals(project.netAmount || 0),
        tax_amount: roundTo2Decimals(project.taxAmount || 0),
        deposit_amount: roundTo2Decimals(project.depositAmount || 0),
        is_deposit_paid: project.isDepositPaid || false,
        is_final_paid: project.isFinalPaid || false,
        offer_date: project.offerDate || null,
        measurement_date: project.measurementDate || null,
        measurement_time: project.measurementTime || null,
        is_measured: project.isMeasured || false,
        order_date: project.orderDate || null,
        is_ordered: project.isOrdered || false,
        delivery_date: project.deliveryDate || null,
        delivery_time: project.deliveryTime || null,
        installation_date: project.installationDate || null,
        installation_time: project.installationTime || null,
        is_installation_assigned: project.isInstallationAssigned || false,
        completion_date: project.completionDate || null,
        delivery_type: project.deliveryType || 'delivery',
        notes: project.notes || '',
        order_footer_text: project.orderFooterText ?? null,
        partial_payments: partialPayments,
        final_invoice: project.finalInvoice || null,
        complaints: project.complaints || [],
        documents: documents,
        payment_schedule: project.paymentSchedule || null,
        second_payment_created: project.secondPaymentCreated || false,
      } as any)
      .select()
      .single()

    if (error) {
      const errObj = error as Error & { code?: string; details?: string; hint?: string }
      logger.error('createProject error', {
        component: 'projects',
        message: errObj?.message,
        code: errObj?.code,
        details: errObj?.details,
        hint: errObj?.hint,
      }, error as Error)
      throw error
    }

    const projectId = data.id

    // Insert invoice items
    if (project.items && project.items.length > 0) {
      // KRITISCH: Validiere alle Items vor dem Einfügen
      for (const item of project.items) {
        if (item.quantity !== undefined && item.quantity <= 0) {
          throw new Error(
            `Ungültige Menge für Artikel "${item.description || 'Unbekannt'}": ${item.quantity}. Menge muss größer als 0 sein.`
          )
        }
        if (item.pricePerUnit !== undefined && item.pricePerUnit < 0) {
          throw new Error(
            `Ungültiger Preis für Artikel "${item.description || 'Unbekannt'}": ${item.pricePerUnit}. Preis darf nicht negativ sein.`
          )
        }
      }

      // Positionen nur im Auftrag speichern (kein Auto-Anlegen im Artikelstamm)
      const itemsToInsert = project.items.map(item => {
        const taxRate = item.taxRate || 20
        const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1
        const pricePerUnit = item.pricePerUnit || 0

        // WICHTIG: Nutze exakt die Werte aus dem Frontend-Objekt, rechne NICHT neu,
        // es sei denn, die Werte fehlen komplett (nicht 0, sondern undefined/null)
        // Verwende zentrale Utility-Funktion als Fallback
        // Prüfe ob grossPricePerUnit vorhanden ist (wie im Frontend)
        const hasGrossPricePerUnit =
          item.grossPricePerUnit !== undefined && item.grossPricePerUnit !== null

        let netTotal: number
        let taxAmount: number
        let grossTotal: number
        let grossPricePerUnit: number

        if (hasGrossPricePerUnit) {
          // Brutto-basierte Berechnung (wie im Frontend)
          const totals = calculateItemTotalsFromGross(quantity, item.grossPricePerUnit!, taxRate)
          netTotal = item.netTotal ?? totals.netTotal
          taxAmount = item.taxAmount ?? totals.taxAmount
          grossTotal = item.grossTotal ?? totals.grossTotal
          grossPricePerUnit = item.grossPricePerUnit!
        } else {
          // Netto-basierte Berechnung (Fallback)
          const totals = calculateItemTotalsFromNet(quantity, pricePerUnit, taxRate)
          netTotal = item.netTotal ?? totals.netTotal
          taxAmount = item.taxAmount ?? totals.taxAmount
          grossTotal = item.grossTotal ?? totals.grossTotal
          // Berechne grossPricePerUnit aus grossTotal
          grossPricePerUnit = quantity > 0 ? grossTotal / quantity : 0
        }

        return {
          project_id: projectId,
          article_id: item.articleId || null,
          position: item.position || 1,
          description: item.description || '',
          model_number: item.modelNumber || null,
          manufacturer: item.manufacturer || null,
          specifications: item.specifications || {},
          quantity: quantity,
          unit: (() => {
            const unitMap: Record<string, 'Stk' | 'Pkg' | 'Std' | 'Paush' | 'm' | 'm²' | 'lfm'> = {
              Stk: 'Stk',
              stk: 'Stk',
              STK: 'Stk',
              Pkg: 'Pkg',
              pkg: 'Pkg',
              PKG: 'Pkg',
              Std: 'Std',
              std: 'Std',
              STD: 'Std',
              Paush: 'Paush',
              paush: 'Paush',
              PAUSH: 'Paush',
              m: 'm',
              M: 'm',
              lfm: 'lfm',
              LFM: 'lfm',
              'lfm.': 'lfm',
              'm²': 'm²',
              m2: 'm²',
              'M²': 'm²',
              qm: 'm²',
              QM: 'm²',
            }
            return unitMap[item.unit] || 'Stk'
          })(),
          price_per_unit: roundTo2Decimals(pricePerUnit),
          gross_price_per_unit:
            grossPricePerUnit > 0 ? roundTo2Decimals(grossPricePerUnit) : null,
          purchase_price_per_unit:
            item.purchasePricePerUnit !== undefined &&
            item.purchasePricePerUnit !== null &&
            item.purchasePricePerUnit > 0
              ? roundTo2Decimals(item.purchasePricePerUnit)
              : null,
          tax_rate: String(taxRate),
          net_total: roundTo2Decimals(netTotal),
          tax_amount: roundTo2Decimals(taxAmount),
          gross_total: roundTo2Decimals(grossTotal),
          // Warranty / Appliance fields
          show_in_portal: item.showInPortal || false,
          serial_number: item.serialNumber || null,
          installation_date: item.installationDate || null,
          warranty_until: item.warrantyUntil || null,
          appliance_category: item.applianceCategory || null,
          manufacturer_support_url: item.manufacturerSupportUrl || null,
          manufacturer_support_phone: item.manufacturerSupportPhone || null,
          manufacturer_support_email: item.manufacturerSupportEmail || null,
        }
      })

      const { error: itemsError } = await supabase.from('invoice_items').insert(itemsToInsert)

      if (itemsError) {
        logger.error('Error inserting items', { component: 'projects' }, itemsError as Error)
        // KRITISCH: Rollback - Lösche das erstellte Projekt wenn Items fehlschlagen
        // Dies verhindert "Ghost Projects" ohne Items in der Datenbank
        const { error: rollbackError } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId)

        if (rollbackError) {
          logger.error('Rollback failed', { component: 'projects' }, rollbackError as Error)
        } else {
          logger.debug('Rollback successful: Project deleted after item insertion failure', {
            component: 'projects',
          })
        }

        throw new Error(
          `Fehler beim Erstellen der Artikel: ${itemsError.message}. Projekt wurde nicht erstellt.`
        )
      }
    }

    const createdProject = (await getProject(projectId)) as CustomerProject

    // Audit logging
    audit.projectCreated(projectId, {
      customerName: createdProject.customerName,
      orderNumber: createdProject.orderNumber,
      totalAmount: createdProject.totalAmount,
    })

    return createdProject
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string; details?: string; hint?: string }
    logger.error('createProject failed', {
      component: 'projects',
      message: err?.message,
      code: err?.code,
      details: err?.details,
      hint: err?.hint,
    }, error as Error)
    throw error
  }
}

export async function updateProject(
  id: string,
  project: Partial<CustomerProject>
): Promise<CustomerProject> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    // Nur Felder aufnehmen, die tatsächlich definiert sind (nicht undefined)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {}

    if (project.customerId !== undefined) updateData.customer_id = project.customerId
    if (project.salespersonId !== undefined)
      updateData.salesperson_id = project.salespersonId || null
    if (project.salespersonName !== undefined)
      updateData.salesperson_name = project.salespersonName || null
    if (project.customerName !== undefined) updateData.customer_name = project.customerName
    if (project.address !== undefined) updateData.customer_address = project.address
    if (project.phone !== undefined) updateData.customer_phone = project.phone
    if (project.email !== undefined) updateData.customer_email = project.email
    if (project.orderNumber !== undefined) updateData.order_number = project.orderNumber
    if (project.offerNumber !== undefined) updateData.offer_number = project.offerNumber
    if (project.invoiceNumber !== undefined) updateData.invoice_number = project.invoiceNumber
    if (project.contractNumber !== undefined) updateData.contract_number = project.contractNumber
    if (project.status !== undefined) updateData.status = project.status
    if (project.totalAmount !== undefined)
      updateData.total_amount = roundTo2Decimals(project.totalAmount)
    if (project.netAmount !== undefined)
      updateData.net_amount = roundTo2Decimals(project.netAmount)
    if (project.taxAmount !== undefined)
      updateData.tax_amount = roundTo2Decimals(project.taxAmount)
    if (project.depositAmount !== undefined)
      updateData.deposit_amount = roundTo2Decimals(project.depositAmount)
    if (project.isDepositPaid !== undefined) updateData.is_deposit_paid = project.isDepositPaid
    if (project.isFinalPaid !== undefined) updateData.is_final_paid = project.isFinalPaid
    if (project.offerDate !== undefined) updateData.offer_date = project.offerDate
    if (project.measurementDate !== undefined) updateData.measurement_date = project.measurementDate
    if (project.measurementTime !== undefined) updateData.measurement_time = project.measurementTime
    if (project.isMeasured !== undefined) updateData.is_measured = project.isMeasured
    if (project.orderDate !== undefined) updateData.order_date = project.orderDate
    if (project.isOrdered !== undefined) updateData.is_ordered = project.isOrdered
    if (project.deliveryDate !== undefined) updateData.delivery_date = project.deliveryDate
    if (project.deliveryTime !== undefined) updateData.delivery_time = project.deliveryTime
    if (project.installationDate !== undefined)
      updateData.installation_date = project.installationDate
    if (project.installationTime !== undefined)
      updateData.installation_time = project.installationTime
    if (project.isInstallationAssigned !== undefined)
      updateData.is_installation_assigned = project.isInstallationAssigned
    if (project.completionDate !== undefined) updateData.completion_date = project.completionDate
    if (project.deliveryType !== undefined) updateData.delivery_type = project.deliveryType
    if (project.notes !== undefined) updateData.notes = project.notes
    if (project.orderFooterText !== undefined)
      updateData.order_footer_text = project.orderFooterText
    if (project.accessCode !== undefined) updateData.access_code = project.accessCode

    // Add partial_payments, final_invoice, complaints, and documents if provided
    if (project.partialPayments !== undefined) {
      updateData.partial_payments = project.partialPayments
    }
    if (project.finalInvoice !== undefined) {
      updateData.final_invoice = project.finalInvoice
      // WICHTIG: Synchronisiere isFinalPaid automatisch mit finalInvoice.isPaid
      // Dies stellt sicher, dass das Legacy-Feld immer korrekt ist
      updateData.is_final_paid = project.finalInvoice.isPaid
    }
    if (project.complaints !== undefined) {
      updateData.complaints = project.complaints
    }
    if (project.paymentSchedule !== undefined) {
      updateData.payment_schedule = project.paymentSchedule
    }
    if (project.secondPaymentCreated !== undefined) {
      updateData.second_payment_created = project.secondPaymentCreated
    }
    // WICHTIG: Dokumente immer speichern, auch wenn leer (Array), damit hochgeladene Dokumente nicht verloren gehen
    if (project.documents !== undefined) {
      updateData.documents = project.documents
      logger.debug('Updating documents', {
        component: 'projects',
        count: project.documents.length,
        documentNames: project.documents.map((d: ProjectDocument) => d.name),
        totalSize: JSON.stringify(project.documents).length,
      })
    }

    // Prüfe ob überhaupt Daten zum Update vorhanden sind
    if (Object.keys(updateData).length === 0) {
      logger.warn('updateProject: No fields to update, returning existing project', { component: 'projects' })
      return (await getProject(id)) as CustomerProject
    }

    const { error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      const errObj = error as Error & { code?: string; details?: string; hint?: string }
      logger.error('updateProject error', {
        component: 'projects',
        message: errObj?.message,
        code: errObj?.code,
        details: errObj?.details,
        hint: errObj?.hint,
        updateData: updateData,
      }, error as Error)
      throw error
    }

    // Update invoice items if provided - WICHTIG: Upsert-Logik um Foreign Keys zu erhalten
    if (project.items !== undefined) {
      // KRITISCH: Validiere alle Items vor dem Update
      for (const item of project.items) {
        if (item.quantity !== undefined && item.quantity <= 0) {
          throw new Error(
            `Ungültige Menge für Artikel "${item.description || 'Unbekannt'}": ${item.quantity}. Menge muss größer als 0 sein.`
          )
        }
        if (item.pricePerUnit !== undefined && item.pricePerUnit < 0) {
          throw new Error(
            `Ungültiger Preis für Artikel "${item.description || 'Unbekannt'}": ${item.pricePerUnit}. Preis darf nicht negativ sein.`
          )
        }
      }

      // Positionen nur im Auftrag speichern (kein Auto-Anlegen im Artikelstamm)
      // Hole alle bestehenden Items für dieses Projekt
      const { data: existingItems, error: fetchError } = await supabase
        .from('invoice_items')
        .select('id')
        .eq('project_id', id)

      if (fetchError) {
        logger.error('Error fetching existing items', { component: 'projects' }, fetchError as Error)
        throw fetchError
      }

      const existingItemIds = new Set((existingItems || []).map((item: { id: string }) => item.id))
      const incomingItemIds = new Set<string>()

      // Track successful operations for potential rollback
      const successfulUpdates: string[] = []
      const successfulInserts: string[] = []

      // Map unit to valid enum value
      const unitMap: Record<string, 'Stk' | 'Pkg' | 'Std' | 'Paush' | 'm' | 'm²' | 'lfm'> = {
        Stk: 'Stk',
        stk: 'Stk',
        STK: 'Stk',
        Pkg: 'Pkg',
        pkg: 'Pkg',
        PKG: 'Pkg',
        Std: 'Std',
        std: 'Std',
        STD: 'Std',
        Paush: 'Paush',
        paush: 'Paush',
        PAUSH: 'Paush',
        m: 'm',
        M: 'm',
        lfm: 'lfm',
        LFM: 'lfm',
        'lfm.': 'lfm',
        'm²': 'm²',
        m2: 'm²',
        'M²': 'm²',
        qm: 'm²',
        QM: 'm²',
      }

      // Helper function to check if ID is a UUID (from DB)
      const isUUID = (id: string): boolean => {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      }

      // Process each item: Update existing or Insert new
      for (let index = 0; index < project.items.length; index++) {
        const item = project.items[index]
        const taxRate = item.taxRate || 20
        const quantity = item.quantity || 1
        const pricePerUnit = item.pricePerUnit || 0

        // WICHTIG: Nutze exakt die Werte aus dem Frontend-Objekt, rechne NICHT neu,
        // es sei denn, die Werte fehlen komplett (nicht 0, sondern undefined/null)
        // Verwende zentrale Utility-Funktion als Fallback
        // Prüfe ob grossPricePerUnit vorhanden ist (wie im Frontend)
        const hasGrossPricePerUnit =
          item.grossPricePerUnit !== undefined && item.grossPricePerUnit !== null

        const unit = unitMap[item.unit] || 'Stk'

        let netTotal: number
        let taxAmount: number
        let grossTotal: number
        let grossPricePerUnit: number

        if (hasGrossPricePerUnit) {
          // Brutto-basierte Berechnung (wie im Frontend)
          const totals = calculateItemTotalsFromGross(quantity, item.grossPricePerUnit!, taxRate)
          netTotal = item.netTotal ?? totals.netTotal
          taxAmount = item.taxAmount ?? totals.taxAmount
          grossTotal = item.grossTotal ?? totals.grossTotal
          grossPricePerUnit = item.grossPricePerUnit!
        } else {
          // Netto-basierte Berechnung (Fallback)
          const totals = calculateItemTotalsFromNet(quantity, pricePerUnit, taxRate)
          netTotal = item.netTotal ?? totals.netTotal
          taxAmount = item.taxAmount ?? totals.taxAmount
          grossTotal = item.grossTotal ?? totals.grossTotal
          // Berechne grossPricePerUnit aus grossTotal
          grossPricePerUnit = quantity > 0 ? grossTotal / quantity : 0
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const itemData: Record<string, any> = {
          project_id: id,
          article_id: item.articleId || null,
          position: item.position || index + 1,
          description: item.description || '',
          model_number: item.modelNumber || null,
          manufacturer: item.manufacturer || null,
          specifications: item.specifications || {},
          quantity: quantity,
          unit: unit,
          price_per_unit: roundTo2Decimals(pricePerUnit),
          gross_price_per_unit:
            grossPricePerUnit > 0 ? roundTo2Decimals(grossPricePerUnit) : null,
          purchase_price_per_unit:
            item.purchasePricePerUnit !== undefined &&
            item.purchasePricePerUnit !== null &&
            item.purchasePricePerUnit > 0
              ? roundTo2Decimals(item.purchasePricePerUnit)
              : null,
          tax_rate: String(taxRate),
          net_total: roundTo2Decimals(netTotal),
          tax_amount: roundTo2Decimals(taxAmount),
          gross_total: roundTo2Decimals(grossTotal),
          // Warranty / Appliance fields
          show_in_portal: item.showInPortal || false,
          serial_number: item.serialNumber || null,
          installation_date: item.installationDate || null,
          warranty_until: item.warrantyUntil || null,
          appliance_category: item.applianceCategory || null,
          manufacturer_support_url: item.manufacturerSupportUrl || null,
          manufacturer_support_phone: item.manufacturerSupportPhone || null,
          manufacturer_support_email: item.manufacturerSupportEmail || null,
        }

        // Prüfe ob Item-ID eine UUID ist (aus DB) und ob sie existiert
        try {
          if (item.id && isUUID(item.id) && existingItemIds.has(item.id)) {
            // UPDATE bestehendes Item (behält ID und Foreign Keys)
            const { error: updateError } = await supabase
              .from('invoice_items')
              .update(itemData)
              .eq('id', item.id)

            if (updateError) {
              logger.error(`Error updating item ${item.id}`, { component: 'projects' }, updateError as Error)
              throw new Error(
                `Fehler beim Aktualisieren des Artikels "${item.description || item.id}": ${updateError instanceof Error ? updateError.message : 'Unbekannter Fehler'}`
              )
            }
            successfulUpdates.push(item.id)
            incomingItemIds.add(item.id)
          } else {
            // INSERT neues Item
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: insertedItem, error: insertError } = await supabase
              .from('invoice_items')
              .insert(itemData as any)
              .select('id')
              .single()

            if (insertError) {
              logger.error('Error inserting item', { component: 'projects' }, insertError as Error)
              throw new Error(
                `Fehler beim Einfügen des Artikels "${item.description || 'Neu'}": ${insertError instanceof Error ? insertError.message : 'Unbekannter Fehler'}`
              )
            }
            if (insertedItem) {
              successfulInserts.push((insertedItem as { id: string }).id)
              incomingItemIds.add((insertedItem as { id: string }).id)
            }
          }
        } catch (itemError: unknown) {
          // KRITISCH: Rollback bei Fehler - lösche neu eingefügte Items
          if (successfulInserts.length > 0) {
            logger.warn(`Rolling back ${successfulInserts.length} inserted items due to error`, { component: 'projects' })
            const { error: rollbackError } = await supabase
              .from('invoice_items')
              .delete()
              .in('id', successfulInserts)

            if (rollbackError) {
              logger.error('Rollback of inserted items failed', { component: 'projects' }, rollbackError as Error)
            }
          }
          throw itemError
        }
      }

      // Lösche nur Items, die nicht mehr in der Liste sind
      const itemsToDelete = Array.from(existingItemIds).filter(id => !incomingItemIds.has(id))
      if (itemsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('invoice_items')
          .delete()
          .in('id', itemsToDelete)

        if (deleteError) {
          logger.error('Error deleting removed items', { component: 'projects' }, deleteError as Error)
          logger.warn('Some items could not be deleted, but foreign keys should be handled by DB constraints', { component: 'projects' })
        }
      }
    }

    // Fetch the complete project with items
    const updatedProject = (await getProject(id)) as CustomerProject

    // Audit logging - log the fields that were updated
    const changedFields: Record<string, unknown> = {}
    if (project.customerName !== undefined) changedFields.customerName = project.customerName
    if (project.status !== undefined) changedFields.status = project.status
    if (project.totalAmount !== undefined) changedFields.totalAmount = project.totalAmount
    if (project.isDepositPaid !== undefined) changedFields.isDepositPaid = project.isDepositPaid
    if (project.isFinalPaid !== undefined) changedFields.isFinalPaid = project.isFinalPaid

    if (Object.keys(changedFields).length > 0) {
      audit.projectUpdated(id, {}, changedFields)
    }

    return updatedProject
  } catch (error) {
    logger.error('updateProject failed', { component: 'projects' }, error as Error)
    throw error
  }
}

export async function deleteProject(id: string): Promise<void> {
  // Vor dem Löschen Projekt-Daten holen für Audit-Log (wird von der UI genutzt, nicht die API-Route)
  let projectData: { customerName?: string; orderNumber?: string; totalAmount?: number; status?: string } = {}
  try {
    const project = await getProject(id)
    if (project) {
      projectData = {
        customerName: project.customerName,
        orderNumber: project.orderNumber,
        totalAmount: project.totalAmount,
        status: project.status,
      }
    }
  } catch {
    // Projekt nicht gefunden – trotzdem löschen, nur ohne Audit-Daten
  }

  // TODO: Re-enable soft delete after applying migration: supabase/migrations/20260126113814_add_deleted_at_to_projects.sql
  // Soft delete: Set deleted_at timestamp instead of actually deleting
  // const { error } = await supabase
  //   .from('projects')
  //   .update({ deleted_at: new Date().toISOString() })
  //   .eq('id', id)

  // Temporary: Hard delete until migration is applied
  const { error } = await supabase.from('projects').delete().eq('id', id)

  if (error) throw error

  // Audit-Log (client-seitig, damit in der UI gelöschte Aufträge im Audit erscheinen)
  audit.projectDeleted(id, projectData)
}

function mapProjectFromDB(dbProject: ProjectRow): CustomerProject {
  // WICHTIG: Berechne totalAmount aus exakten grossTotal-Werten der Items,
  // falls die Items vorhanden sind (korrigiert falsche DB-Werte)
  // Verwende zentrale Utility-Funktion für konsistente Berechnung
  const items: InvoiceItem[] = (dbProject.invoice_items || []).map(mapInvoiceItemFromDB)
  let calculatedTotalAmount = parseFloat(dbProject.total_amount || 0)

  if (items.length > 0) {
    // Verwende zentrale Utility-Funktion für Projekt-Gesamtwerte
    const { grossTotal } = calculateProjectTotals(items)
    calculatedTotalAmount = grossTotal
  }

  // WICHTIG: Synchronisiere isFinalPaid mit finalInvoice.isPaid, falls finalInvoice existiert
  // Dies stellt sicher, dass das Legacy-Feld immer korrekt ist, auch wenn die DB inkonsistent ist
  // Parse finalInvoice sicher - könnte als String oder Objekt kommen
  let finalInvoice = dbProject.final_invoice || undefined
  if (finalInvoice && typeof finalInvoice === 'string') {
    try {
      finalInvoice = JSON.parse(finalInvoice)
    } catch (e) {
      logger.warn('Error parsing finalInvoice from string', { component: 'projects' }, e as Error)
      finalInvoice = undefined
    }
  }
  // Stelle sicher, dass isPaid ein Boolean ist (könnte als String gespeichert sein)
  if (finalInvoice && typeof finalInvoice.isPaid !== 'boolean') {
    finalInvoice.isPaid =
      finalInvoice.isPaid === true || finalInvoice.isPaid === 'true' || finalInvoice.isPaid === 1
  }
  const isFinalPaid = finalInvoice
    ? finalInvoice.isPaid === true || finalInvoice.isPaid === 'true' || finalInvoice.isPaid === 1
    : dbProject.is_final_paid || false

  return {
    id: dbProject.id,
    userId: dbProject.user_id,
    customerId: dbProject.customer_id,
    salespersonId: dbProject.salesperson_id,
    salespersonName: dbProject.salesperson_name,
    customerName: dbProject.customer_name,
    address: dbProject.customer_address,
    phone: dbProject.customer_phone,
    email: dbProject.customer_email,
    orderNumber: dbProject.order_number,
    offerNumber: dbProject.offer_number,
    invoiceNumber: dbProject.invoice_number,
    contractNumber: dbProject.contract_number,
    status: dbProject.status as CustomerProject['status'],
    items: items,
    totalAmount: calculatedTotalAmount, // Verwende berechneten Wert statt DB-Wert
    netAmount: parseFloat(dbProject.net_amount || 0),
    taxAmount: parseFloat(dbProject.tax_amount || 0),
    depositAmount: parseFloat(dbProject.deposit_amount || 0),
    isDepositPaid: dbProject.is_deposit_paid,
    isFinalPaid: isFinalPaid,
    partialPayments: dbProject.partial_payments || [],
    finalInvoice: finalInvoice,
    paymentSchedule: dbProject.payment_schedule || undefined,
    secondPaymentCreated: dbProject.second_payment_created || false,
    offerDate: dbProject.offer_date,
    measurementDate: dbProject.measurement_date,
    measurementTime: dbProject.measurement_time,
    isMeasured: dbProject.is_measured,
    orderDate: dbProject.order_date,
    isOrdered: dbProject.is_ordered,
    deliveryDate: dbProject.delivery_date,
    deliveryTime: dbProject.delivery_time,
    installationDate: dbProject.installation_date,
    installationTime: dbProject.installation_time,
    isInstallationAssigned: dbProject.is_installation_assigned,
    completionDate: dbProject.completion_date,
    documents: (dbProject.documents || []) as ProjectDocument[],
    complaints: dbProject.complaints || [],
    notes: dbProject.notes || '',
    accessCode: dbProject.access_code || undefined,
    orderFooterText: dbProject.order_footer_text ?? undefined,
    orderContractSignedAt: dbProject.order_contract_signed_at || undefined,
    orderContractSignedBy: dbProject.order_contract_signed_by || undefined,
    customerSignature: dbProject.customer_signature || undefined,
    customerSignatureDate: dbProject.customer_signature_date || undefined,
    withdrawalWaivedAt: dbProject.withdrawal_waived_at || undefined,
    deliveryStatus: dbProject.delivery_status,
    allItemsDelivered: dbProject.all_items_delivered || false,
    readyForAssemblyDate: dbProject.ready_for_assembly_date,
    deliveryType: (dbProject.delivery_type as 'delivery' | 'pickup') || 'delivery',
    createdAt: dbProject.created_at,
    updatedAt: dbProject.updated_at,
  }
}

function mapInvoiceItemFromDB(dbItem: InvoiceItemRow): InvoiceItem {
  // Map 'm' back to 'lfm' if description contains "laufmeter"
  let unit = dbItem.unit as InvoiceItem['unit']
  if (unit === 'm' && dbItem.description?.toLowerCase().includes('laufmeter')) {
    unit = 'lfm'
  }

  const quantity = parseFloat(dbItem.quantity || 0)
  const grossTotal = parseFloat(dbItem.gross_total || 0)

  // WICHTIG: Verwende zuerst die gespeicherte gross_price_per_unit Spalte (falls vorhanden),
  // sonst leite sie aus gross_total ab
  const grossPricePerUnit =
    dbItem.gross_price_per_unit !== null && dbItem.gross_price_per_unit !== undefined
      ? parseFloat(dbItem.gross_price_per_unit)
      : quantity > 0 && Number.isFinite(grossTotal) && grossTotal > 0
        ? roundTo2Decimals(grossTotal / quantity)
        : undefined

  return {
    id: dbItem.id,
    articleId: dbItem.article_id,
    position: dbItem.position,
    description: dbItem.description,
    modelNumber: dbItem.model_number,
    manufacturer: dbItem.manufacturer,
    specifications: dbItem.specifications || {},
    quantity,
    unit: unit,
    pricePerUnit: parseFloat(dbItem.price_per_unit || 0),
    grossPricePerUnit,
    purchasePricePerUnit: dbItem.purchase_price_per_unit
      ? parseFloat(dbItem.purchase_price_per_unit)
      : undefined,
    taxRate: parseInt(dbItem.tax_rate || '20') as 10 | 13 | 20,
    netTotal: parseFloat(dbItem.net_total || 0),
    taxAmount: parseFloat(dbItem.tax_amount || 0),
    grossTotal,
    deliveryStatus: dbItem.delivery_status,
    expectedDeliveryDate: dbItem.expected_delivery_date,
    actualDeliveryDate: dbItem.actual_delivery_date,
    quantityOrdered: dbItem.quantity_ordered ? parseFloat(dbItem.quantity_ordered) : undefined,
    quantityDelivered: dbItem.quantity_delivered
      ? parseFloat(dbItem.quantity_delivered)
      : undefined,
    // Warranty / Appliance fields
    showInPortal: dbItem.show_in_portal || false,
    serialNumber: dbItem.serial_number || undefined,
    installationDate: dbItem.installation_date || undefined,
    warrantyUntil: dbItem.warranty_until || undefined,
    applianceCategory: dbItem.appliance_category || undefined,
    manufacturerSupportUrl: dbItem.manufacturer_support_url || undefined,
    manufacturerSupportPhone: dbItem.manufacturer_support_phone || undefined,
    manufacturerSupportEmail: dbItem.manufacturer_support_email || undefined,
  }
}
