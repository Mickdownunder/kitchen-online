'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { WifiOff } from 'lucide-react'
import { getInitialOnlineState, probeOnlineStatus } from './offlineIndicator.utils'

/**
 * Offline indicator component
 * Shows when the app is offline
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : getInitialOnlineState(navigator),
  )
  const isMountedRef = useRef(true)

  const syncOnlineState = useCallback(async () => {
    const reachable = await probeOnlineStatus()
    if (isMountedRef.current) {
      setIsOnline(reachable)
    }
  }, [])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const initialSyncTimer = window.setTimeout(() => {
      void syncOnlineState()
    }, 0)

    const handleOnline = () => {
      void syncOnlineState()
    }

    const handleOffline = () => {
      setIsOnline(false)
      void syncOnlineState()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncOnlineState()
      }
    }

    const handleFocus = () => {
      void syncOnlineState()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearTimeout(initialSyncTimer)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [syncOnlineState])

  useEffect(() => {
    if (isOnline) {
      return
    }

    const intervalId = window.setInterval(() => {
      void syncOnlineState()
    }, 15000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isOnline, syncOnlineState])

  if (isOnline) return null

  return (
    <div className="animate-in slide-in-from-bottom fixed bottom-4 left-4 z-[9999] flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-white shadow-lg">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">
        Offline - Daten werden synchronisiert, sobald die Verbindung wiederhergestellt ist
      </span>
    </div>
  )
}
