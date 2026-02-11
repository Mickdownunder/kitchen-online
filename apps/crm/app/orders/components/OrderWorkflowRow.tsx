'use client'

import React from 'react'
import Link from 'next/link'
import { CalendarClock, ClipboardCheck, Loader2, Pencil, Send } from 'lucide-react'
import { SUPPLIER_ORDER_CHANNEL_META } from '@/lib/orders/orderChannel'
import { formatDate, hasAB, hasDeliveryNote, hasGoodsReceipt, isOrderSent, QUEUE_STYLES } from '../orderUtils'
import type { OrderWorkflowRow as WorkflowRow } from '../types'

interface OrderWorkflowRowProps {
  row: WorkflowRow
  isBusy: boolean
  onOpenEditor: (row: WorkflowRow) => void
  onSend: (row: WorkflowRow) => void
  onRequestMarkExternallyOrdered: (row: WorkflowRow) => void
  onOpenAb: (row: WorkflowRow) => void
  onOpenDelivery: (row: WorkflowRow) => void
  onOpenGoodsReceipt: (row: WorkflowRow) => void
  onOpenInstallationReservation: (row: WorkflowRow) => void
}

function renderStep(label: string, done: boolean) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
        done
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-50 text-slate-500'
      }`}
    >
      {label}
    </span>
  )
}

export function OrderWorkflowRow({
  row,
  isBusy,
  onOpenEditor,
  onSend,
  onRequestMarkExternallyOrdered,
  onOpenAb,
  onOpenDelivery,
  onOpenGoodsReceipt,
  onOpenInstallationReservation,
}: OrderWorkflowRowProps) {
  const style = QUEUE_STYLES[row.queue]
  const QueueIcon = style.icon
  const channelMeta = SUPPLIER_ORDER_CHANNEL_META[row.orderChannel]

  const orderSent = row.kind === 'missing_supplier' ? false : isOrderSent(row)
  const hasAb = row.kind === 'missing_supplier' ? false : hasAB(row)
  const hasSupplierDeliveryNote = row.kind === 'missing_supplier' ? false : hasDeliveryNote(row)
  const hasGoodsReceiptBooked = row.kind === 'missing_supplier' ? false : hasGoodsReceipt(row)
  const isPickupOrder = row.deliveryType === 'pickup'
  const readinessLabel = isPickupOrder ? 'Abholung' : 'Montage'
  const readinessDate = isPickupOrder ? row.deliveryDate : row.installationDate
  const isReadyOrDone = row.queue === 'montagebereit' || row.queue === 'erledigt'
  const isOrderingQueue = row.queue === 'zu_bestellen' || row.queue === 'brennt'
  const canEditPositions = isOrderingQueue
  const canSend = row.kind === 'supplier' && isOrderingQueue
  const canMarkAlreadyOrdered = row.kind === 'supplier' && isOrderingQueue
  const canCaptureAb = row.kind === 'supplier' && row.queue === 'ab_fehlt' && Boolean(row.orderId)
  const canOpenDeliveryNote =
    row.kind === 'supplier' &&
    row.queue === 'wareneingang_offen' &&
    Boolean(row.orderId) &&
    hasAb &&
    !hasSupplierDeliveryNote
  const canBookGoodsReceipt =
    row.kind === 'supplier' &&
    row.queue === 'wareneingang_offen' &&
    Boolean(row.orderId) &&
    hasSupplierDeliveryNote &&
    row.openDeliveryItems > 0

  const btnBase =
    'inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-60'
  const btnNeutral = 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
  const btnPrimary = 'border-slate-800 bg-slate-900 text-white hover:bg-slate-800'
  const installationReservationLabel =
    row.installationReservationStatus === 'confirmed'
      ? 'Reservierung'
      : row.installationReservationStatus === 'requested'
        ? 'Bestätigung'
        : 'Montage reservieren'

  return (
    <tr className={row.queue === 'brennt' ? style.rowClass : undefined} data-queue={row.queue}>
      <td className="px-4 py-4 align-top">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${style.chipClass}`}
        >
          <QueueIcon className="h-3.5 w-3.5" />
          {row.queueLabel}
        </span>
      </td>
      <td className="px-4 py-4 align-top">
        <p className="text-sm font-black text-slate-900">#{row.projectOrderNumber}</p>
        <p className="text-sm text-slate-700">{row.customerName}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">{row.supplierName}</p>
        {row.kind === 'missing_supplier' && (
          <p className="mt-1">
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-700">
              Lieferant fehlt
            </span>
          </p>
        )}
        <p className="mt-1">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${channelMeta.chipClass}`}
          >
            {channelMeta.label}
          </span>
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Bestellnummer: {row.supplierOrderNumber || 'noch nicht erzeugt'}
        </p>
      </td>
      <td className="px-4 py-4 align-top">
        <div className="flex flex-wrap gap-1.5">
          {renderStep('Bestellung', orderSent)}
          {renderStep('AB', hasAb)}
          {renderStep('Lieferschein', hasSupplierDeliveryNote)}
          {renderStep('Wareneingang', hasGoodsReceiptBooked)}
          {renderStep(readinessLabel, isReadyOrDone)}
        </div>
        <p className="mt-2 text-[11px] text-slate-600">
          Positionen: {row.totalItems} · offen Bestellung {row.openOrderItems} · offen WE {row.openDeliveryItems}
        </p>
      </td>
      <td className="px-4 py-4 align-top">
        <div className="space-y-1 text-xs text-slate-700">
          <p className="inline-flex items-center gap-1.5 font-semibold">
            <CalendarClock className="h-3.5 w-3.5 text-slate-500" />
            {readinessLabel}: {formatDate(readinessDate)}
            {typeof row.daysUntilInstallation === 'number' && (
              <span className="text-slate-500">({row.daysUntilInstallation} Tage)</span>
            )}
          </p>
          <p>AB-Termin: {formatDate(row.abConfirmedDeliveryDate)}</p>
          <p>
            AB vs. WE:{' '}
            {row.abTimingStatus === 'late'
              ? 'verspätet'
              : row.abTimingStatus === 'on_time'
                ? 'pünktlich'
                : 'offen'}
          </p>
          {!isPickupOrder && (
            <>
              <p>
                Montage-Reservierung:{' '}
                {row.installationReservationStatus === 'confirmed'
                  ? `bestätigt (${formatDate(row.installationReservationConfirmedDate)})`
                  : row.installationReservationStatus === 'requested'
                    ? 'angefragt'
                    : 'offen'}
              </p>
              {row.kind === 'supplier' && (
                <button
                  type="button"
                  onClick={() => onOpenInstallationReservation(row)}
                  disabled={isBusy}
                  aria-label={`Montage-Reservierung öffnen für ${row.customerName}`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 transition-colors hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  {installationReservationLabel}
                </button>
              )}
            </>
          )}
        </div>
      </td>
      <td className="px-4 py-4 align-top">
        <p className="text-xs font-semibold text-slate-700">{row.nextAction}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {canEditPositions && (
            <button
              type="button"
              onClick={() => onOpenEditor(row)}
              disabled={isBusy}
              aria-label={`Positionen bearbeiten für Auftrag ${row.projectOrderNumber}`}
              className={`${btnBase} ${btnNeutral}`}
            >
              <Pencil className="h-3.5 w-3.5" /> Positionen
            </button>
          )}

          {canSend && (
            <button
              type="button"
              onClick={() => onSend(row)}
              disabled={isBusy}
              aria-label={`Bestellung senden an ${row.supplierName}`}
              className={`${btnBase} ${btnPrimary}`}
            >
              {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Senden
            </button>
          )}

          {canMarkAlreadyOrdered && (
            <button
              type="button"
              onClick={() => onRequestMarkExternallyOrdered(row)}
              disabled={isBusy}
              aria-label={`Als extern bestellt markieren für ${row.supplierName}`}
              className={`${btnBase} ${btnNeutral}`}
            >
              {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardCheck className="h-3.5 w-3.5" />}
              Bereits bestellt
            </button>
          )}

          {canCaptureAb && (
            <button
              type="button"
              onClick={() => onOpenAb(row)}
              disabled={isBusy}
              aria-label={`AB erfassen für ${row.supplierName}`}
              className={`${btnBase} ${btnNeutral}`}
            >
              AB erfassen
            </button>
          )}

          {canOpenDeliveryNote && (
            <button
              type="button"
              onClick={() => onOpenDelivery(row)}
              disabled={isBusy}
              aria-label={`Lieferschein erfassen für ${row.supplierName}`}
              className={`${btnBase} ${btnNeutral}`}
            >
              Lieferschein
            </button>
          )}

          {canBookGoodsReceipt && (
            <button
              type="button"
              onClick={() => onOpenGoodsReceipt(row)}
              disabled={isBusy}
              aria-label={`Wareneingang buchen für ${row.supplierName}`}
              className={`${btnBase} ${btnNeutral}`}
            >
              Wareneingang
            </button>
          )}

          <Link
            href={`/projects?projectId=${row.projectId}`}
            aria-label={`Auftrag ${row.projectOrderNumber} öffnen`}
            className={`${btnBase} ${btnNeutral}`}
          >
            Auftrag
          </Link>
        </div>
      </td>
    </tr>
  )
}
