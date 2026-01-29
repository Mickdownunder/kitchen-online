'use client'

import { useEffect } from 'react'
import { PerformanceTracker } from '@/components/PerformanceTracker'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { logger } from '@/lib/utils/logger'

/**
 * Client-side initialization component
 * Registers service worker and initializes performance tracking
 */
export function ClientInit() {
  // Global handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason

      // Ignore AbortErrors - these are normal when:
      // - User navigates away during auth operations
      // - Multiple auth requests are cancelled
      // - Component unmounts during async operations
      // - Passwort-Reset / updateUser wird durch parallele Requests abgebrochen
      const errMessage = typeof error?.message === 'string' ? error.message : ''
      const errName = typeof error?.name === 'string' ? error.name : ''
      if (
        errName === 'AbortError' ||
        errMessage.toLowerCase().includes('aborted') ||
        errMessage.includes('The operation was aborted')
      ) {
        event.preventDefault()
        event.stopPropagation()
        return
      }

      // Log other unhandled rejections for debugging
      logger.error('Unhandled Promise Rejection', { component: 'ClientInit' }, error)
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  useEffect(() => {
    // Register service worker for offline support
    // Safari requires more careful error handling
    if ('serviceWorker' in navigator) {
      // Detect Safari
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

      navigator.serviceWorker
        .register('/sw.js', {
          // Safari-compatible: Don't use scope if not needed
          scope: '/',
        })
        .then(registration => {
          logger.info('Service Worker registered', {
            component: 'ClientInit',
            scope: registration.scope,
          })

          // Safari-compatible: Check for updates less aggressively
          if (!isSafari) {
            // Check for updates every hour (non-Safari)
            setInterval(
              () => {
                registration.update()
              },
              60 * 60 * 1000
            )
          }
        })
        .catch(error => {
          // Safari-compatible: Don't crash the app if SW registration fails
          logger.warn(
            'Service Worker registration failed',
            { component: 'ClientInit', isSafari },
            error
          )
        })
    }
  }, [])

  return (
    <>
      <PerformanceTracker />
      <OfflineIndicator />
    </>
  )
}
