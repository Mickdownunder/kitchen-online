'use client'

import { useEffect } from 'react'
import { reportWebVitals, usePageLoadTracking } from '@/lib/utils/performance'

/**
 * Client component for performance tracking
 * Must be used in a client component (e.g., layout client wrapper)
 */
export function PerformanceTracker() {
  // Track page load
  usePageLoadTracking()

  useEffect(() => {
    // Track Web Vitals (if available)
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        // LCP (Largest Contentful Paint)
        const lcpObserver = new PerformanceObserver(list => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
            renderTime?: number
            loadTime?: number
            size?: number
            id?: string
          }
          reportWebVitals({
            name: 'LCP',
            value: lastEntry.renderTime || lastEntry.loadTime || 0,
            id: lastEntry.id || '',
            rating: (() => {
              const renderTime = lastEntry.renderTime || lastEntry.loadTime || 0
              if (renderTime < 2500) return 'good'
              if (renderTime < 4000) return 'needs-improvement'
              return 'poor'
            })(),
          })
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

        // FID (First Input Delay)
        const fidObserver = new PerformanceObserver(list => {
          const entries = list.getEntries()
          entries.forEach((entry: PerformanceEntry & { processingStart?: number; id?: string }) => {
            const processingStart = entry.processingStart || 0
            reportWebVitals({
              name: 'FID',
              value: processingStart - entry.startTime,
              id: entry.id || '',
              rating: (() => {
                const delay = processingStart - entry.startTime
                if (delay < 100) return 'good'
                if (delay < 300) return 'needs-improvement'
                return 'poor'
              })(),
            })
          })
        })
        fidObserver.observe({ entryTypes: ['first-input'] })

        // CLS (Cumulative Layout Shift)
        let clsValue = 0
        const clsObserver = new PerformanceObserver(list => {
          const entries = list.getEntries() as Array<
            PerformanceEntry & { hadRecentInput?: boolean; value?: number }
          >
          entries.forEach(entry => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value || 0
            }
          })

          // Report CLS periodically
          reportWebVitals({
            name: 'CLS',
            value: clsValue,
            id: 'cls',
            rating: (() => {
              if (clsValue < 0.1) return 'good'
              if (clsValue < 0.25) return 'needs-improvement'
              return 'poor'
            })(),
          })
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })

        // Cleanup
        return () => {
          lcpObserver.disconnect()
          fidObserver.disconnect()
          clsObserver.disconnect()
        }
      } catch (error) {
        // PerformanceObserver not supported or error
        console.warn('PerformanceObserver not available:', error)
      }
    }
  }, [])

  return null
}
