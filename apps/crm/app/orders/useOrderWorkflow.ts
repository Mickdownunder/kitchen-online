'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useApp } from '@/app/providers'
import {
  deriveSupplierWorkflowQueue,
  fromQueueParam,
  getAbTimingStatus,
  SUPPLIER_WORKFLOW_QUEUE_ORDER,
  SUPPLIER_WORKFLOW_QUEUE_META,
  toQueueParam,
  type SupplierWorkflowQueue,
} from '@/lib/orders/workflowQueue'
import { deriveSupplierOrderChannel } from '@/lib/orders/orderChannel'
import { getSupplierOrders } from '@/lib/supabase/services'
import { supabase } from '@/lib/supabase/client'
import type { InvoiceItemProcurementType, SupplierOrder, SupplierOrderStatus } from '@/types'
import { ProjectStatus } from '@/types'
import type {
  InstallationReservationStatus,
  OrderWorkflowRow,
  SupplierLookupOption,
  WorkflowProjectItem,
} from './types'

interface SupplierInvoiceBucketRow {
  id: string
  project_id: string | null
  article_id: string | null
  description: string
  model_number: string | null
  manufacturer: string | null
  unit: string | null
  quantity: number | null
  quantity_ordered: number | null
  quantity_delivered: number | null
  delivery_status: string | null
  procurement_type: string | null
  articles:
    | {
        supplier_id: string | null
      }
    | {
        supplier_id: string | null
      }[]
    | null
}

interface SupplierOrderItemLinkRow {
  invoice_item_id: string | null
  supplier_orders:
    | {
        status: string
      }
    | {
        status: string
      }[]
    | null
}

interface InstallationReservationLookupRow {
  project_id: string
  status: string
  installer_company: string | null
  request_email_sent_at: string | null
  confirmation_date: string | null
}

interface WorkflowBucketAccumulator {
  key: string
  projectId: string
  supplierId: string
  projectItems: WorkflowProjectItem[]
  order?: SupplierOrder
}

const ORDERED_BY_STATUS = new Set(['ordered', 'partially_delivered', 'delivered', 'missing'])
const SENT_OR_LATER_STATUSES = new Set<SupplierOrderStatus>([
  'sent',
  'ab_received',
  'delivery_note_received',
  'goods_receipt_open',
  'goods_receipt_booked',
  'ready_for_installation',
])
const INTERNAL_STOCK_SUPPLIER_NAMES = new Set(['baleah eigen', 'lagerware', 'lager'])

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function normalizeItemQuantity(value: unknown): number {
  const quantity = toNumber(value)
  return quantity > 0 ? quantity : 1
}

function relationToSingle<T>(relation: T | T[] | null): T | null {
  if (!relation) {
    return null
  }

  return Array.isArray(relation) ? relation[0] || null : relation
}

function getSupplierIdFromRelation(
  relation:
    | SupplierInvoiceBucketRow['articles']
    | {
        supplier_id: string | null
      }
    | null,
): string | null {
  if (!relation) {
    return null
  }

  if (Array.isArray(relation)) {
    return relation[0]?.supplier_id || null
  }

  return relation.supplier_id || null
}

function getDaysUntilInstallation(installationDate?: string): number | undefined {
  if (!installationDate) {
    return undefined
  }

  const normalized = installationDate.includes('T') ? installationDate.slice(0, 10) : installationDate
  const target = new Date(`${normalized}T00:00:00`)
  if (Number.isNaN(target.getTime())) {
    return undefined
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayMs = 24 * 60 * 60 * 1000
  return Math.round((target.getTime() - today.getTime()) / dayMs)
}

function shouldReplaceOrder(existing: SupplierOrder | undefined, next: SupplierOrder): boolean {
  if (!existing) {
    return true
  }

  if (existing.status === 'cancelled' && next.status !== 'cancelled') {
    return true
  }

  if (existing.status !== 'cancelled' && next.status === 'cancelled') {
    return false
  }

  return new Date(next.createdAt).getTime() > new Date(existing.createdAt).getTime()
}

function isInstallationReservationSchemaMissing(error: unknown): boolean {
  const err = (error || {}) as { code?: string; message?: string; details?: string; hint?: string }
  const code = String(err.code || '').toUpperCase()
  const blob = [err.message, err.details, err.hint].filter(Boolean).join(' ').toLowerCase()

  if (code === '42P01' || code === 'PGRST204' || code === 'PGRST205') {
    return blob.includes('installation_reservations') || code === '42P01'
  }

  return blob.includes('installation_reservations') && blob.includes('does not exist')
}

function normalizeReservationStatus(value: string | null | undefined): InstallationReservationStatus | undefined {
  if (!value) {
    return undefined
  }

  return ['draft', 'requested', 'confirmed', 'cancelled'].includes(value)
    ? (value as InstallationReservationStatus)
    : undefined
}

function normalizeProcurementType(value: string | null | undefined): InvoiceItemProcurementType {
  if (value === 'internal_stock' || value === 'reservation_only') {
    return value
  }
  return 'external_order'
}

function isInternalStockSupplierName(name: string | undefined): boolean {
  return INTERNAL_STOCK_SUPPLIER_NAMES.has((name || '').trim().toLowerCase())
}

function normalizeProjectItemsForSupplier(
  items: WorkflowProjectItem[],
  supplierName: string | undefined,
): WorkflowProjectItem[] {
  if (!isInternalStockSupplierName(supplierName)) {
    return items
  }

  return items.map((item) => {
    if (item.procurementType !== 'external_order') {
      return item
    }

    return {
      ...item,
      procurementType: 'internal_stock',
      quantityOrdered: Math.max(item.quantityOrdered, item.quantity),
      quantityDelivered: Math.max(item.quantityDelivered, item.quantity),
      deliveryStatus: 'delivered',
    }
  })
}

function summarizeProcurement(items: WorkflowProjectItem[]): {
  totalItems: number
  openOrderItems: number
  openDeliveryItems: number
  externalOrderItems: number
  internalStockItems: number
  reservationOnlyItems: number
} {
  let openOrderItems = 0
  let openDeliveryItems = 0
  let externalOrderItems = 0
  let internalStockItems = 0
  let reservationOnlyItems = 0

  items.forEach((item) => {
    if (item.procurementType === 'internal_stock') {
      internalStockItems += 1
      return
    }

    if (item.procurementType === 'reservation_only') {
      reservationOnlyItems += 1
      return
    }

    externalOrderItems += 1
    if (item.quantityOrdered < item.quantity) {
      openOrderItems += 1
    }
    if (item.quantityDelivered < item.quantity) {
      openDeliveryItems += 1
    }
  })

  return {
    totalItems: items.length,
    openOrderItems,
    openDeliveryItems,
    externalOrderItems,
    internalStockItems,
    reservationOnlyItems,
  }
}

function mapInvoiceRowToProjectItem(row: SupplierInvoiceBucketRow, supplierId?: string): WorkflowProjectItem {
  const quantity = normalizeItemQuantity(row.quantity)
  const deliveredQuantity = Math.max(0, toNumber(row.quantity_delivered))
  const orderedByStatus = ORDERED_BY_STATUS.has((row.delivery_status || '').toLowerCase())
    ? quantity
    : 0
  const orderedQuantity = Math.max(deliveredQuantity, toNumber(row.quantity_ordered), orderedByStatus)

  return {
    id: row.id,
    articleId: row.article_id || undefined,
    supplierId,
    description: row.description,
    modelNumber: row.model_number || undefined,
    manufacturer: row.manufacturer || undefined,
    unit: row.unit || 'Stk',
    quantity,
    quantityOrdered: orderedQuantity,
    quantityDelivered: deliveredQuantity,
    deliveryStatus: row.delivery_status || 'not_ordered',
    procurementType: normalizeProcurementType(row.procurement_type),
  }
}

export function useOrderWorkflow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { projects } = useApp()

  const initialQueueFromUrl = fromQueueParam(searchParams.get('queue')) || 'zu_bestellen'
  const initialSearchFromUrl = searchParams.get('search') || ''

  const [activeQueue, setActiveQueue] = useState<SupplierWorkflowQueue>(initialQueueFromUrl)
  const [search, setSearch] = useState(initialSearchFromUrl)
  const [rows, setRows] = useState<OrderWorkflowRow[]>([])
  const [suppliers, setSuppliers] = useState<SupplierLookupOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const queueParam = toQueueParam(activeQueue)
    params.set('queue', queueParam)

    const trimmedSearch = search.trim()
    if (trimmedSearch) {
      params.set('search', trimmedSearch)
    } else {
      params.delete('search')
    }

    const target = `/orders?${params.toString()}`
    if (typeof window !== 'undefined' && `${window.location.pathname}${window.location.search}` !== target) {
      router.replace(target)
    }
  }, [activeQueue, search, router, searchParams])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [ordersResult, invoiceRowsResult, itemLinksResult, suppliersResult, reservationRowsResult] =
        await Promise.all([
          getSupplierOrders(),
          supabase
            .from('invoice_items')
          .select(
            `
            id,
            project_id,
            article_id,
            description,
            model_number,
            manufacturer,
            unit,
            quantity,
            quantity_ordered,
            quantity_delivered,
            delivery_status,
            procurement_type,
            articles (supplier_id)
          `,
          ),
          supabase
            .from('supplier_order_items')
            .select(
            `
            invoice_item_id,
            supplier_orders (status)
          `,
              )
              .not('invoice_item_id', 'is', null),
          supabase.from('suppliers').select('id, name, email, order_email').order('name', { ascending: true }),
          supabase
            .from('installation_reservations')
            .select('project_id, status, installer_company, request_email_sent_at, confirmation_date'),
        ])

      if (!ordersResult.ok) {
        throw new Error(ordersResult.message || 'Bestellungen konnten nicht geladen werden.')
      }

      if (invoiceRowsResult.error) {
        throw new Error(invoiceRowsResult.error.message)
      }

      if (itemLinksResult.error) {
        throw new Error(itemLinksResult.error.message)
      }

      if (suppliersResult.error) {
        throw new Error(suppliersResult.error.message)
      }

      if (
        reservationRowsResult.error &&
        !isInstallationReservationSchemaMissing(reservationRowsResult.error)
      ) {
        throw new Error(reservationRowsResult.error.message)
      }

      const invoiceRows = (invoiceRowsResult.data || []) as SupplierInvoiceBucketRow[]
      const invoiceItemById = new Map(invoiceRows.map((row) => [row.id, row]))

      const assignedInvoiceItemIds = new Set<string>()
      ;((itemLinksResult.data || []) as SupplierOrderItemLinkRow[]).forEach((row) => {
        const relation = relationToSingle(row.supplier_orders)
        if (row.invoice_item_id && relation?.status !== 'cancelled') {
          assignedInvoiceItemIds.add(row.invoice_item_id)
        }
      })

      const buckets = new Map<string, WorkflowBucketAccumulator>()
      const missingSupplierByProject = new Map<string, WorkflowProjectItem[]>()

      const ensureBucket = (projectId: string, supplierId: string): WorkflowBucketAccumulator => {
        const key = `${projectId}:${supplierId}`
        if (!buckets.has(key)) {
          buckets.set(key, {
            key,
            projectId,
            supplierId,
            projectItems: [],
          })
        }

        return buckets.get(key)!
      }

      for (const invoiceRow of invoiceRows) {
        const projectId = invoiceRow.project_id || null
        if (!projectId) {
          continue
        }

        const supplierId = getSupplierIdFromRelation(invoiceRow.articles)
        if (supplierId) {
          const bucket = ensureBucket(projectId, supplierId)
          const item = mapInvoiceRowToProjectItem(invoiceRow, supplierId)
          bucket.projectItems.push(item)

          continue
        }

        if (assignedInvoiceItemIds.has(invoiceRow.id)) {
          continue
        }

        const unresolvedItems = missingSupplierByProject.get(projectId) || []
        unresolvedItems.push(mapInvoiceRowToProjectItem(invoiceRow))
        missingSupplierByProject.set(projectId, unresolvedItems)
      }

      for (const order of ordersResult.data) {
        const bucket = ensureBucket(order.projectId, order.supplierId)
        if (shouldReplaceOrder(bucket.order, order)) {
          bucket.order = order
        }
      }

      const supplierLookup = new Map(
        ((suppliersResult.data || []) as SupplierLookupOption[]).map((supplier) => [
          supplier.id,
          supplier,
        ]),
      )
      setSuppliers((suppliersResult.data || []) as SupplierLookupOption[])

      const reservationByProjectId = new Map<string, InstallationReservationLookupRow>()
      if (!reservationRowsResult.error) {
        ;((reservationRowsResult.data || []) as InstallationReservationLookupRow[]).forEach((row) => {
          if (!row.project_id) {
            return
          }
          reservationByProjectId.set(row.project_id, row)
        })
      }

      const projectLookup = new Map(projects.map((project) => [project.id, project]))
      const queueOrderLookup = Object.fromEntries(
        SUPPLIER_WORKFLOW_QUEUE_ORDER.map((queue, index) => [queue, index]),
      ) as Record<SupplierWorkflowQueue, number>

      const supplierRows = Array.from(buckets.values())
        .map((bucket): OrderWorkflowRow | null => {
          const order = bucket.order
          const project = projectLookup.get(bucket.projectId)
          const supplier = supplierLookup.get(bucket.supplierId)

          if (!project && !order) {
            return null
          }

          let projectItems = bucket.projectItems

          const orderSentOrLater = Boolean(
            order?.sentAt || (order?.status && SENT_OR_LATER_STATUSES.has(order.status)),
          )

          if (projectItems.length === 0 && order?.items?.length) {
            projectItems = order.items.map((item, index) => {
              if (item.invoiceItemId) {
                const invoiceRow = invoiceItemById.get(item.invoiceItemId)
                if (invoiceRow) {
                  const mapped = mapInvoiceRowToProjectItem(invoiceRow, bucket.supplierId)
                  const expectedQuantity = Math.max(mapped.quantity, toNumber(item.quantity))
                  return {
                    ...mapped,
                    id: item.invoiceItemId,
                    description: item.description || mapped.description,
                    modelNumber: item.modelNumber || mapped.modelNumber,
                    manufacturer: item.manufacturer || mapped.manufacturer,
                    quantity: expectedQuantity,
                    quantityOrdered: Math.max(
                      mapped.quantityOrdered,
                      orderSentOrLater ? toNumber(item.quantity) : 0,
                    ),
                    unit: item.unit || mapped.unit,
                  }
                }
              }

              const fallbackQuantity = Math.max(1, toNumber(item.quantity))
              return {
                id: item.invoiceItemId || `${order.id}:item:${item.id || index + 1}`,
                articleId: item.articleId || undefined,
                supplierId: bucket.supplierId,
                description: item.description,
                modelNumber: item.modelNumber || undefined,
                manufacturer: item.manufacturer || undefined,
                unit: item.unit || 'Stk',
                quantity: fallbackQuantity,
                quantityOrdered: orderSentOrLater ? fallbackQuantity : 0,
                quantityDelivered: 0,
                deliveryStatus: orderSentOrLater ? 'ordered' : 'not_ordered',
                procurementType: 'external_order',
              }
            })
          }

          const deliveryType = project?.deliveryType || 'delivery'
          const deliveryDate = project?.deliveryDate || undefined
          const installationDate = project?.installationDate || order?.projectInstallationDate || undefined
          const readinessTargetDate = deliveryType === 'pickup' ? deliveryDate || installationDate : installationDate
          const supplierName =
            order?.supplierName ||
            supplier?.name ||
            `Lieferant ${bucket.supplierId.slice(0, 6).toUpperCase()}`
          const normalizedProjectItems = normalizeProjectItemsForSupplier(projectItems, supplierName)
          const {
            totalItems,
            openOrderItems,
            openDeliveryItems,
            externalOrderItems,
            internalStockItems,
            reservationOnlyItems,
          } = summarizeProcurement(normalizedProjectItems)
          const isProjectCompleted = Boolean(
            project?.completionDate || project?.status === ProjectStatus.COMPLETED,
          )
          const reservation = reservationByProjectId.get(bucket.projectId)
          const installationReservationStatus = normalizeReservationStatus(reservation?.status)
          const installationReservationRequestedAt = reservation?.request_email_sent_at || undefined
          const installationReservationConfirmedDate = reservation?.confirmation_date || undefined
          const installationReservationCompany = reservation?.installer_company || undefined
          const decision = deriveSupplierWorkflowQueue({
            hasOrder: externalOrderItems > 0 ? Boolean(order) : false,
            orderStatus: externalOrderItems > 0 ? order?.status : undefined,
            sentAt: externalOrderItems > 0 ? order?.sentAt : undefined,
            abNumber: externalOrderItems > 0 ? order?.abNumber : undefined,
            abReceivedAt: externalOrderItems > 0 ? order?.abReceivedAt : undefined,
            abConfirmedDeliveryDate: externalOrderItems > 0 ? order?.abConfirmedDeliveryDate : undefined,
            supplierDeliveryNoteId: externalOrderItems > 0 ? order?.supplierDeliveryNoteId : undefined,
            goodsReceiptId: externalOrderItems > 0 ? order?.goodsReceiptId : undefined,
            bookedAt: externalOrderItems > 0 ? order?.bookedAt : undefined,
            installationDate: readinessTargetDate,
            openOrderItems,
            openDeliveryItems,
            hasExternalOrderItems: externalOrderItems > 0,
            hasInternalStockItems: internalStockItems > 0,
            hasReservationOnlyItems: reservationOnlyItems > 0 && deliveryType !== 'pickup',
            reservationStatus: installationReservationStatus,
            isProjectCompleted,
          })

          let nextAction = decision.nextAction
          if (decision.queue === 'montagebereit') {
            if (deliveryType === 'pickup') {
              nextAction = 'Abholung mit Kunde abstimmen und Abholtermin bestätigen.'
            } else {
              if (installationReservationStatus === 'confirmed') {
                nextAction = installationReservationConfirmedDate
                  ? `Montage reserviert (${installationReservationConfirmedDate}) bei ${
                      installationReservationCompany || 'Montagepartner'
                    }.`
                  : `Montage reserviert bei ${installationReservationCompany || 'Montagepartner'}.`
              } else if (installationReservationStatus === 'requested') {
                nextAction =
                  'Montage ist angefragt. Bestätigung vom Montagepartner erfassen und Referenz speichern.'
              } else {
                nextAction = 'Montage per E-Mail reservieren und Pläne mitschicken.'
              }
            }
          }

          return {
            key: bucket.key,
            kind: 'supplier',
            projectId: bucket.projectId,
            projectOrderNumber: project?.orderNumber || order?.projectOrderNumber || '—',
            customerName: project?.customerName || order?.projectCustomerName || 'Unbekannt',
            deliveryType,
            deliveryDate,
            installationDate,
            daysUntilInstallation: getDaysUntilInstallation(readinessTargetDate),
            supplierId: bucket.supplierId,
            supplierName,
            supplierOrderEmail:
              order?.supplierOrderEmail || supplier?.order_email || supplier?.email || undefined,
            orderId: order?.id,
            supplierOrderNumber: order?.orderNumber,
            orderStatus: order?.status,
            sentAt: order?.sentAt,
            abNumber: order?.abNumber,
            abReceivedAt: order?.abReceivedAt,
            abConfirmedDeliveryDate: order?.abConfirmedDeliveryDate,
            supplierDeliveryNoteId: order?.supplierDeliveryNoteId,
            goodsReceiptId: order?.goodsReceiptId,
            bookedAt: order?.bookedAt,
            totalItems,
            openOrderItems,
            openDeliveryItems,
            externalOrderItems,
            internalStockItems,
            reservationOnlyItems,
            queue: decision.queue,
            queueLabel: SUPPLIER_WORKFLOW_QUEUE_META[decision.queue].label,
            nextAction,
            abTimingStatus: getAbTimingStatus(order?.abConfirmedDeliveryDate, order?.bookedAt),
            projectItems: normalizedProjectItems,
            unresolvedItems: [],
            orderItems: order?.items || [],
            orderChannel: externalOrderItems > 0 ? deriveSupplierOrderChannel(order) : 'pending',
            installationReservationStatus,
            installationReservationRequestedAt,
            installationReservationConfirmedDate,
            installationReservationCompany,
          }
        })
        .filter((row): row is OrderWorkflowRow => Boolean(row))

      const missingSupplierRows = Array.from(missingSupplierByProject.entries()).map(
        ([projectId, unresolvedItems]): OrderWorkflowRow => {
          const project = projectLookup.get(projectId)
          const {
            openDeliveryItems,
            openOrderItems,
            externalOrderItems,
            internalStockItems,
            reservationOnlyItems,
          } = summarizeProcurement(unresolvedItems)

          return {
            key: `${projectId}:missing-supplier`,
            kind: 'missing_supplier',
            projectId,
            projectOrderNumber: project?.orderNumber || '—',
            customerName: project?.customerName || 'Unbekannt',
            deliveryType: project?.deliveryType || 'delivery',
            deliveryDate: project?.deliveryDate,
            installationDate: project?.installationDate,
            daysUntilInstallation: getDaysUntilInstallation(
              project?.deliveryType === 'pickup' ? project?.deliveryDate : project?.installationDate,
            ),
            supplierName: 'Lieferant fehlt',
            totalItems: unresolvedItems.length,
            openOrderItems,
            openDeliveryItems,
            externalOrderItems,
            internalStockItems,
            reservationOnlyItems,
            queue: 'zu_bestellen',
            queueLabel: SUPPLIER_WORKFLOW_QUEUE_META.zu_bestellen.label,
            nextAction:
              'Lieferant zuordnen, dann Bestellung senden oder als extern bestellt markieren.',
            abTimingStatus: 'open',
            projectItems: [],
            unresolvedItems,
            orderItems: [],
            orderChannel: 'pending',
          }
        },
      )

      const nextRows = [...missingSupplierRows, ...supplierRows].sort((a, b) => {
        const aQueueIndex = queueOrderLookup[a.queue] ?? Number.MAX_SAFE_INTEGER
        const bQueueIndex = queueOrderLookup[b.queue] ?? Number.MAX_SAFE_INTEGER
        const queueDiff = aQueueIndex - bQueueIndex
        if (queueDiff !== 0) {
          return queueDiff
        }

        const aDays = a.daysUntilInstallation ?? Number.MAX_SAFE_INTEGER
        const bDays = b.daysUntilInstallation ?? Number.MAX_SAFE_INTEGER
        if (aDays !== bDays) {
          return aDays - bDays
        }

        return a.customerName.localeCompare(b.customerName)
      })

      setRows(nextRows)
    } catch (refreshError) {
      const message =
        refreshError instanceof Error ? refreshError.message : 'Bestellungen konnten nicht geladen werden.'
      setError(message)
      setRows([])
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }, [projects])

  useEffect(() => {
    refresh()
  }, [refresh])

  const queueCounts = useMemo(() => {
    const counts = Object.fromEntries(
      SUPPLIER_WORKFLOW_QUEUE_ORDER.map((queue) => [queue, 0]),
    ) as Record<SupplierWorkflowQueue, number>

    rows.forEach((row) => {
      counts[row.queue] += 1
    })

    return counts
  }, [rows])

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows
      .filter((row) => row.queue === activeQueue)
      .filter((row) => {
        if (!query) {
          return true
        }

        return (
          row.projectOrderNumber.toLowerCase().includes(query) ||
          row.customerName.toLowerCase().includes(query) ||
          row.supplierName.toLowerCase().includes(query) ||
          (row.supplierOrderNumber || '').toLowerCase().includes(query) ||
          (row.abNumber || '').toLowerCase().includes(query)
        )
      })
  }, [rows, activeQueue, search])

  return {
    rows,
    visibleRows,
    queueCounts,
    suppliers,
    activeQueue,
    setActiveQueue,
    search,
    setSearch,
    loading,
    error,
    refresh,
  }
}
