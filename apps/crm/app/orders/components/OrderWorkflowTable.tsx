'use client'

import React from 'react'
import { Loader2, Search } from 'lucide-react'
import type { SupplierOrderChannel } from '@/lib/orders/orderChannel'
import type { OrderWorkflowRow } from '../types'
import { OrderWorkflowRow as WorkflowRowView } from './OrderWorkflowRow'

interface OrderWorkflowTableProps {
  rows: OrderWorkflowRow[]
  loading: boolean
  error: string | null
  activeQueueLabel: string
  search: string
  onSearchChange: (value: string) => void
  channelFilter: 'all' | SupplierOrderChannel
  onChannelFilterChange: (value: 'all' | SupplierOrderChannel) => void
  busyKey: string | null
  onOpenEditor: (row: OrderWorkflowRow) => void
  onSend: (row: OrderWorkflowRow) => void
  onRequestMarkExternallyOrdered: (row: OrderWorkflowRow) => void
  onOpenAb: (row: OrderWorkflowRow) => void
  onOpenDelivery: (row: OrderWorkflowRow) => void
  onOpenGoodsReceipt: (row: OrderWorkflowRow) => void
  onOpenInstallationReservation: (row: OrderWorkflowRow) => void
}

const rowBusyKeys = (row: OrderWorkflowRow): string[] => [
  `send:${row.key}`,
  `mark:${row.key}`,
  `ab:${row.key}`,
  `delivery:${row.key}`,
  `we:${row.key}`,
  'editor-save',
]

export function OrderWorkflowTable({
  rows,
  loading,
  error,
  activeQueueLabel,
  search,
  onSearchChange,
  channelFilter,
  onChannelFilterChange,
  busyKey,
  onOpenEditor,
  onSend,
  onRequestMarkExternallyOrdered,
  onOpenAb,
  onOpenDelivery,
  onOpenGoodsReceipt,
  onOpenInstallationReservation,
}: OrderWorkflowTableProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-xl flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Suche nach Auftrag, Kunde, Lieferant, Bestellnummer oder AB"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
          />
        </div>
        <select
          value={channelFilter}
          onChange={(event) => onChannelFilterChange(event.target.value as 'all' | SupplierOrderChannel)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-slate-400 md:w-56"
        >
          <option value="all">Alle Bestellwege</option>
          <option value="crm_mail">via CRM-Mail</option>
          <option value="external">extern markiert</option>
          <option value="pending">noch offen</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                Queue
              </th>
              <th scope="col" className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                Auftrag + Lieferant
              </th>
              <th scope="col" className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                Ablauf
              </th>
              <th scope="col" className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                Terminlage
              </th>
              <th scope="col" className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                Nächste Aktion
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white [&>tr]:transition-colors [&>tr:hover]:bg-slate-50/80">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Bestell-Queues werden geladen
                  </div>
                </td>
              </tr>
            )}

            {!loading && error && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm font-semibold text-red-700">
                  {error}
                </td>
              </tr>
            )}

            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm font-semibold text-slate-600">
                  Keine Einträge in „{activeQueueLabel}“.
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              rows.map((row) => (
                <WorkflowRowView
                  key={row.key}
                  row={row}
                  isBusy={Boolean(busyKey && rowBusyKeys(row).includes(busyKey))}
                  onOpenEditor={onOpenEditor}
                  onSend={onSend}
                  onRequestMarkExternallyOrdered={onRequestMarkExternallyOrdered}
                  onOpenAb={onOpenAb}
                  onOpenDelivery={onOpenDelivery}
                  onOpenGoodsReceipt={onOpenGoodsReceipt}
                  onOpenInstallationReservation={onOpenInstallationReservation}
                />
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
