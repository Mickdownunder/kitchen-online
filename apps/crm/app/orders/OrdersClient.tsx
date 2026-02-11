'use client'

import React, { useMemo, useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { useApp } from '@/app/providers'
import { useToast } from '@/components/providers/ToastProvider'
import { syncSupplierOrderBucketFromProject } from '@/lib/supabase/services'
import {
  SUPPLIER_WORKFLOW_QUEUE_META,
  SUPPLIER_WORKFLOW_QUEUE_ORDER,
} from '@/lib/orders/workflowQueue'
import type { SupplierOrderChannel } from '@/lib/orders/orderChannel'
import { buildGoodsReceiptDraftItems, QUEUE_STYLES } from './orderUtils'
import type { OrderWorkflowRow } from './types'
import { useOrderWorkflow } from './useOrderWorkflow'
import { AbDialog } from './components/AbDialog'
import { ConfirmDialog } from './components/ConfirmDialog'
import { DeliveryNoteDialog } from './components/DeliveryNoteDialog'
import { GoodsReceiptDialog } from './components/GoodsReceiptDialog'
import { OrderEditorModal } from './components/OrderEditorModal'
import { OrderWorkflowTable } from './components/OrderWorkflowTable'
import { SendOrderConfirm } from './components/SendOrderConfirm'

export default function OrdersClient() {
  const { projects, refreshProjects } = useApp()
  const { error: showError, success: showSuccess, info: showInfo } = useToast()
  const {
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
  } = useOrderWorkflow()

  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [channelFilter, setChannelFilter] = useState<'all' | SupplierOrderChannel>('all')

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorRow, setEditorRow] = useState<OrderWorkflowRow | null>(null)

  const [sendRow, setSendRow] = useState<OrderWorkflowRow | null>(null)
  const [markRow, setMarkRow] = useState<OrderWorkflowRow | null>(null)

  const [abRow, setAbRow] = useState<OrderWorkflowRow | null>(null)
  const [deliveryRow, setDeliveryRow] = useState<OrderWorkflowRow | null>(null)
  const [goodsReceiptRow, setGoodsReceiptRow] = useState<OrderWorkflowRow | null>(null)

  const channelFilteredRows = useMemo(() => {
    if (channelFilter === 'all') {
      return visibleRows
    }
    return visibleRows.filter((row) => row.orderChannel === channelFilter)
  }, [visibleRows, channelFilter])

  const refreshAll = async () => {
    await Promise.all([refresh(), refreshProjects(true, true)])
  }

  const ensureOrderBucket = async (row: OrderWorkflowRow): Promise<string | null> => {
    if (row.orderId) {
      return row.orderId
    }

    if (row.kind !== 'supplier' || !row.supplierId) {
      return null
    }

    const result = await syncSupplierOrderBucketFromProject({
      projectId: row.projectId,
      supplierId: row.supplierId,
      createdByType: 'user',
      installationReferenceDate: row.installationDate,
    })

    if (!result.ok) {
      showError(result.message || 'Bestell-Bucket konnte nicht erstellt werden.')
      return null
    }

    return result.data.id
  }

  const markAsExternallyOrdered = async (row: OrderWorkflowRow): Promise<boolean> => {
    if (row.kind !== 'supplier') {
      return false
    }

    const busyId = `mark:${row.key}`
    setBusyKey(busyId)

    try {
      const orderId = await ensureOrderBucket(row)
      if (!orderId) {
        return false
      }

      const stableIdempotencyKey = `manual-mark-${orderId}-${row.sentAt || 'initial'}`
      const response = await fetch(`/api/supplier-orders/${orderId}/mark-ordered`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: stableIdempotencyKey,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || 'Externes Bestell-Flag konnte nicht gesetzt werden.')
      }

      await refreshAll()
      showSuccess('Bestellung als extern bestellt markiert.')
      return true
    } catch (markError) {
      const message =
        markError instanceof Error ? markError.message : 'Externes Bestell-Flag konnte nicht gesetzt werden.'
      showError(message)
      return false
    } finally {
      setBusyKey(null)
    }
  }

  const sendOrder = async (row: OrderWorkflowRow, recipient: string) => {
    const busyId = `send:${row.key}`
    setBusyKey(busyId)

    try {
      const orderId = await ensureOrderBucket(row)
      if (!orderId) {
        return
      }

      const stableIdempotencyKey = `manual-${orderId}-${recipient.toLowerCase()}-${row.sentAt || 'initial'}`
      const response = await fetch(`/api/supplier-orders/${orderId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: recipient,
          idempotencyKey: stableIdempotencyKey,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || 'Bestellung konnte nicht versendet werden.')
      }

      await refreshAll()
      setSendRow(null)
      showSuccess(`Bestellung wurde an ${recipient} versendet.`)
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'Bestellung konnte nicht versendet werden.'
      showError(message)
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Bestellungen</h1>
          <p className="mt-1 text-sm text-slate-600">
            Linearer Ablauf pro Lieferant und Auftrag: Bestellung, AB, Lieferanten-Lieferschein,
            Wareneingang, Montage-Readiness.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditorRow(null)
              setEditorOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" /> Bestellung anlegen
          </button>
          <button
            type="button"
            onClick={() => refresh()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-0">
        {SUPPLIER_WORKFLOW_QUEUE_ORDER.map((queue, index) => {
          const meta = SUPPLIER_WORKFLOW_QUEUE_META[queue]
          const style = QUEUE_STYLES[queue]
          const isLast = index === SUPPLIER_WORKFLOW_QUEUE_ORDER.length - 1
          return (
            <React.Fragment key={queue}>
              <button
                type="button"
                onClick={() => setActiveQueue(queue)}
                className={`rounded-xl border px-3 py-3 text-left transition-all ${
                  activeQueue === queue
                    ? `${style.chipClass} shadow-md`
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <p className="text-[10px] font-black uppercase tracking-widest">{meta.label}</p>
                <p className="mt-1 text-2xl font-black">{queueCounts[queue]}</p>
              </button>
              {!isLast && (
                <span className="mx-0.5 flex shrink-0 text-slate-300" aria-hidden="true">
                  →
                </span>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {activeQueue === 'zu_bestellen' && (
        <p className="text-xs text-slate-500">
          Per CRM-Mail senden oder als extern bestellt markieren (z. B. Danküchen über anderes Programm).
        </p>
      )}

      <OrderWorkflowTable
        rows={channelFilteredRows}
        loading={loading}
        error={error}
        activeQueueLabel={SUPPLIER_WORKFLOW_QUEUE_META[activeQueue].label}
        search={search}
        onSearchChange={setSearch}
        channelFilter={channelFilter}
        onChannelFilterChange={setChannelFilter}
        busyKey={busyKey}
        onOpenEditor={(row) => {
          setEditorRow(row)
          setEditorOpen(true)
        }}
        onSend={setSendRow}
        onRequestMarkExternallyOrdered={setMarkRow}
        onOpenAb={setAbRow}
        onOpenDelivery={setDeliveryRow}
        onOpenGoodsReceipt={(row) => {
          const candidates = buildGoodsReceiptDraftItems(row)
          if (candidates.length === 0) {
            showInfo('Für diesen Auftrag sind keine offenen Wareneingangspositionen vorhanden.')
            return
          }
          setGoodsReceiptRow(row)
        }}
      />

      <OrderEditorModal
        open={editorOpen}
        row={editorRow}
        allRows={rows}
        projects={projects}
        suppliers={suppliers}
        busyKey={busyKey}
        onClose={() => {
          setEditorOpen(false)
          setEditorRow(null)
        }}
        onSaved={refreshAll}
        onMarkExternallyOrdered={markAsExternallyOrdered}
      />

      <SendOrderConfirm
        key={sendRow?.key || 'send-order-confirm'}
        open={Boolean(sendRow)}
        row={sendRow}
        busy={Boolean(sendRow && busyKey === `send:${sendRow.key}`)}
        onClose={() => setSendRow(null)}
        onConfirm={async (recipientEmail) => {
          if (!sendRow) {
            return
          }
          await sendOrder(sendRow, recipientEmail)
        }}
      />

      <ConfirmDialog
        open={Boolean(markRow)}
        onClose={() => setMarkRow(null)}
        onConfirm={async () => {
          if (!markRow) {
            return
          }
          const success = await markAsExternallyOrdered(markRow)
          if (success) {
            setMarkRow(null)
          }
        }}
        busy={Boolean(markRow && busyKey === `mark:${markRow.key}`)}
        tone="warning"
        title="Als extern bestellt markieren?"
        description={
          markRow ? `Für ${markRow.supplierName} wird die Bestellung als bereits extern bestellt markiert.` : undefined
        }
        confirmLabel="Ja, markieren"
      />

      <AbDialog open={Boolean(abRow)} row={abRow} onClose={() => setAbRow(null)} onSaved={refreshAll} />

      <DeliveryNoteDialog
        open={Boolean(deliveryRow)}
        row={deliveryRow}
        onClose={() => setDeliveryRow(null)}
        onSaved={refreshAll}
      />

      <GoodsReceiptDialog
        open={Boolean(goodsReceiptRow)}
        row={goodsReceiptRow}
        onClose={() => setGoodsReceiptRow(null)}
        onSaved={refreshAll}
      />
    </div>
  )
}
