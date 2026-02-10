import type React from 'react'
import type { CustomerDeliveryNote, DeliveryNote } from '@/types'
import {
  getCustomerDeliveryNotes as fetchAllCustomerDeliveryNotes,
  getDeliveryNotes,
} from '@/lib/supabase/services'
import { CACHE_DURATION_MS } from './projectsCache'
import { logger } from '@/lib/utils/logger'

export async function refreshDeliveryNotesWithCache(opts: {
  force?: boolean
  lastRefresh: number
  setLastRefresh: React.Dispatch<React.SetStateAction<number>>
  isRefreshingRef: React.MutableRefObject<boolean>
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  setSupplierDeliveryNotes: React.Dispatch<React.SetStateAction<DeliveryNote[]>>
  setCustomerDeliveryNotes: React.Dispatch<React.SetStateAction<CustomerDeliveryNote[]>>
}): Promise<void> {
  const now = Date.now()
  const force = Boolean(opts.force)

  if (opts.isRefreshingRef.current) return
  if (!force && opts.lastRefresh > 0 && now - opts.lastRefresh < CACHE_DURATION_MS) return

  try {
    opts.isRefreshingRef.current = true
    opts.setIsLoading(true)

    const [supplierResult, customerResult] = await Promise.all([
      getDeliveryNotes(),
      fetchAllCustomerDeliveryNotes(),
    ])
    opts.setSupplierDeliveryNotes(supplierResult.ok ? supplierResult.data : [])
    opts.setCustomerDeliveryNotes(customerResult.ok ? customerResult.data : [])
    opts.setLastRefresh(Date.now())

    if (!supplierResult.ok) {
      logger.error(
        'Error loading supplier delivery notes',
        { component: 'deliveryNotesCache', code: supplierResult.code },
        new Error(supplierResult.message),
      )
    }

    if (!customerResult.ok) {
      logger.error(
        'Error loading customer delivery notes',
        { component: 'deliveryNotesCache', code: customerResult.code },
        new Error(customerResult.message),
      )
    }
  } catch (error: unknown) {
    // Ignore aborted requests (normal during page navigation)
    const errMessage = error instanceof Error ? error.message : ''
    const errName = error instanceof Error ? error.name : ''
    if (errMessage.includes('aborted') || errName === 'AbortError') {
      return
    }
    logger.error('Error loading delivery notes', { component: 'deliveryNotesCache' }, error instanceof Error ? error : new Error(String(error)))
  } finally {
    opts.setIsLoading(false)
    opts.isRefreshingRef.current = false
  }
}
