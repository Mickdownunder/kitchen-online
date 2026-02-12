'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSupplierOrders } from '@/lib/supabase/services'
import type { SupplierOrder } from '@/types'
import { logger } from '@/lib/utils/logger'
import type {
  InboundDocumentKind,
  InboundInboxItem,
  InboundStatusPreset,
} from '@/components/accounting/inboundInbox.types'
import { getStatusesForPreset } from '@/components/accounting/inboundInbox.utils'

interface ApiEnvelope<T> {
  success?: boolean
  data?: T
  message?: string
  error?: unknown
}

interface UseInboundDocumentInboxResult {
  items: InboundInboxItem[]
  loading: boolean
  error: string | null
  selectedId: string | null
  setSelectedId: (value: string | null) => void
  selectedItem: InboundInboxItem | null
  statusPreset: InboundStatusPreset
  setStatusPreset: (value: InboundStatusPreset) => void
  kindFilter: InboundDocumentKind | 'all'
  setKindFilter: (value: InboundDocumentKind | 'all') => void
  refresh: () => Promise<void>
  supplierOrders: SupplierOrder[]
  supplierOrdersError: string | null
  actionItemId: string | null
  confirmItem: (id: string, payload: Record<string, unknown>) => Promise<{ ok: boolean; message?: string }>
  reassignItem: (id: string, payload: Record<string, unknown>) => Promise<{ ok: boolean; message?: string }>
  rejectItem: (id: string, payload: Record<string, unknown>) => Promise<{ ok: boolean; message?: string }>
}

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string' && error.trim().length > 0) {
    return error
  }

  if (!error || typeof error !== 'object') {
    return 'Unbekannter Fehler.'
  }

  const candidate = error as Record<string, unknown>
  if (typeof candidate.message === 'string' && candidate.message.trim().length > 0) {
    return candidate.message
  }

  if (typeof candidate.error === 'string' && candidate.error.trim().length > 0) {
    return candidate.error
  }

  return 'Unbekannter Fehler.'
}

function isInboxItem(value: unknown): value is InboundInboxItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const row = value as Record<string, unknown>
  return typeof row.id === 'string' && typeof row.file_name === 'string'
}

function buildInboxQuery(kindFilter: InboundDocumentKind | 'all', statusPreset: InboundStatusPreset): string {
  const params = new URLSearchParams()
  params.set('limit', '150')

  if (kindFilter !== 'all') {
    params.set('kinds', kindFilter)
  }

  const statuses = getStatusesForPreset(statusPreset)
  if (statuses.length > 0) {
    params.set('statuses', statuses.join(','))
  }

  return params.toString()
}

export function useInboundDocumentInbox(): UseInboundDocumentInboxResult {
  const [items, setItems] = useState<InboundInboxItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusPreset, setStatusPreset] = useState<InboundStatusPreset>('open')
  const [kindFilter, setKindFilter] = useState<InboundDocumentKind | 'all'>('all')
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrder[]>([])
  const [supplierOrdersError, setSupplierOrdersError] = useState<string | null>(null)
  const [actionItemId, setActionItemId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const query = buildInboxQuery(kindFilter, statusPreset)
      const response = await fetch(`/api/document-inbox?${query}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      })

      const body = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null

      if (!response.ok) {
        throw new Error(body ? extractErrorMessage(body.error) : 'Inbox konnte nicht geladen werden.')
      }

      const rows = Array.isArray(body?.data) ? body?.data.filter(isInboxItem) : []
      setItems(rows)
      setSelectedId((current) => {
        if (current && rows.some((entry) => entry.id === current)) {
          return current
        }
        return rows.length > 0 ? rows[0].id : null
      })
    } catch (loadError) {
      logger.error(
        'Inbound inbox loading failed',
        { component: 'useInboundDocumentInbox' },
        loadError instanceof Error ? loadError : new Error(String(loadError)),
      )
      setItems([])
      setSelectedId(null)
      setError(loadError instanceof Error ? loadError.message : 'Inbox konnte nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [kindFilter, statusPreset])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    let active = true

    void (async () => {
      const result = await getSupplierOrders()
      if (!active) {
        return
      }

      if (!result.ok) {
        setSupplierOrders([])
        setSupplierOrdersError(result.message)
        return
      }

      setSupplierOrders(result.data)
      setSupplierOrdersError(null)
    })()

    return () => {
      active = false
    }
  }, [])

  const selectedItem = useMemo(
    () => items.find((entry) => entry.id === selectedId) || null,
    [items, selectedId],
  )

  const runAction = useCallback(async (
    id: string,
    endpoint: 'confirm' | 'reassign' | 'reject',
    payload: Record<string, unknown>,
  ): Promise<{ ok: boolean; message?: string }> => {
    setActionItemId(id)
    setError(null)

    try {
      const response = await fetch(`/api/document-inbox/${id}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const body = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null
      if (!response.ok) {
        return {
          ok: false,
          message: body ? extractErrorMessage(body.error) : 'Aktion fehlgeschlagen.',
        }
      }

      if (isInboxItem(body?.data)) {
        const updatedRow = body.data
        setItems((current) => current.map((entry) => (entry.id === id ? updatedRow : entry)))
      } else {
        await refresh()
      }

      return {
        ok: true,
        message: body?.message,
      }
    } catch (actionError) {
      logger.error(
        'Inbound inbox action failed',
        { component: 'useInboundDocumentInbox', endpoint, inboxItemId: id },
        actionError instanceof Error ? actionError : new Error(String(actionError)),
      )
      return {
        ok: false,
        message: actionError instanceof Error ? actionError.message : 'Aktion fehlgeschlagen.',
      }
    } finally {
      setActionItemId(null)
    }
  }, [refresh])

  const confirmItem = useCallback(
    (id: string, payload: Record<string, unknown>) => runAction(id, 'confirm', payload),
    [runAction],
  )

  const reassignItem = useCallback(
    (id: string, payload: Record<string, unknown>) => runAction(id, 'reassign', payload),
    [runAction],
  )

  const rejectItem = useCallback(
    (id: string, payload: Record<string, unknown>) => runAction(id, 'reject', payload),
    [runAction],
  )

  return {
    items,
    loading,
    error,
    selectedId,
    setSelectedId,
    selectedItem,
    statusPreset,
    setStatusPreset,
    kindFilter,
    setKindFilter,
    refresh,
    supplierOrders,
    supplierOrdersError,
    actionItemId,
    confirmItem,
    reassignItem,
    rejectItem,
  }
}
