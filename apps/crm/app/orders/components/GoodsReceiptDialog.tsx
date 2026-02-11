'use client'

import React, { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createGoodsReceipt } from '@/lib/supabase/services'
import { buildGoodsReceiptDraftItems, toNumber } from '../orderUtils'
import type { GoodsReceiptDraftItem, OrderWorkflowRow } from '../types'
import { ModalShell } from './ModalShell'

interface GoodsReceiptDialogProps {
  open: boolean
  row: OrderWorkflowRow | null
  onClose: () => void
  onSaved: () => Promise<void>
}

export function GoodsReceiptDialog({ open, row, onClose, onSaved }: GoodsReceiptDialogProps) {
  const [items, setItems] = useState<GoodsReceiptDraftItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !row || row.kind !== 'supplier') {
      return
    }

    setItems(buildGoodsReceiptDraftItems(row))
    setError(null)
    setBusy(false)
  }, [open, row])

  if (!open || !row || row.kind !== 'supplier' || !row.orderId) {
    return null
  }

  const hasBookableItems = items.length > 0

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Wareneingang buchen"
      description={`${row.supplierName} · Auftrag #${row.projectOrderNumber}`}
      maxWidthClassName="max-w-3xl"
    >
      {hasBookableItems ? (
        <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Position
                </th>
                <th scope="col" className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Offen
                </th>
                <th scope="col" className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Buchen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {items.map((item) => (
                <tr key={item.projectItemId}>
                  <td className="px-3 py-2 text-sm text-slate-800">{item.description}</td>
                  <td className="px-3 py-2 text-sm font-semibold text-slate-700">
                    {item.remainingQuantity} {item.unit}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={item.receiveQuantity}
                      onChange={(event) =>
                        setItems((prev) =>
                          prev.map((entry) =>
                            entry.projectItemId === item.projectItemId
                              ? { ...entry, receiveQuantity: event.target.value }
                              : entry,
                          ),
                        )
                      }
                      className="w-24 rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          Für diesen Auftrag sind keine offenen, auftragszugeordneten Wareneingangspositionen vorhanden.
        </p>
      )}

      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={async () => {
            const itemsToBook = items
              .map((item) => ({
                ...item,
                receiveQuantityNumber: Math.max(0, toNumber(item.receiveQuantity)),
              }))
              .filter((item) => item.receiveQuantityNumber > 0)

            if (itemsToBook.length === 0) {
              setError('Bitte mindestens eine Position mit Menge > 0 buchen.')
              return
            }

            setBusy(true)
            setError(null)

            try {
              const receiptType = itemsToBook.every((item) => item.receiveQuantityNumber >= item.remainingQuantity)
                ? 'complete'
                : 'partial'

              const idempotencyKey = `we-${row.orderId}-${itemsToBook
                .map((item) => `${item.projectItemId}:${item.receiveQuantityNumber}`)
                .sort()
                .join('|')}`

              const result = await createGoodsReceipt({
                projectId: row.projectId,
                supplierOrderId: row.orderId,
                receiptDate: new Date().toISOString(),
                receiptType,
                status: 'booked',
                idempotencyKey,
                items: itemsToBook.map((item) => ({
                  projectItemId: item.projectItemId,
                  quantityReceived: item.receiveQuantityNumber,
                  quantityExpected: item.remainingQuantity,
                  status: 'received',
                })),
              })

              if (!result.ok) {
                throw new Error(result.message || 'Wareneingang konnte nicht gebucht werden.')
              }

              await onSaved()
              onClose()
            } catch (bookError) {
              const message =
                bookError instanceof Error ? bookError.message : 'Wareneingang konnte nicht gebucht werden.'
              setError(message)
            } finally {
              setBusy(false)
            }
          }}
          disabled={busy || !hasBookableItems}
          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Buchen
        </button>
      </div>
    </ModalShell>
  )
}
