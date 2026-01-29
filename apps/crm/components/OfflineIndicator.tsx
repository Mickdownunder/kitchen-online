'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

/**
 * Offline indicator component
 * Shows when the app is offline
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

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
