'use client'

import { useEffect } from 'react'
import { reportWebVitals, usePageLoadTracking } from '@/lib/utils/performance'
import { logger } from '@/lib/utils/logger'

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
        type LcpEntry = PerformanceEntry & {
          renderTime?: number
          loadTime?: number
          size?: number
          id?: string
          url?: string
          element?: Element | null
        }

        const getLcpRating = (value: number): 'good' | 'needs-improvement' | 'poor' => {
          if (value < 2500) return 'good'
          if (value < 4000) return 'needs-improvement'
          return 'poor'
        }

        const getLcpDetails = (entry: LcpEntry, value: number): Record<string, unknown> => {
          const navigation = performance.getEntriesByType(
            'navigation'
          )[0] as PerformanceNavigationTiming | undefined

          const ttfbMs = navigation
            ? Math.round(navigation.responseStart - navigation.startTime)
            : undefined

          const lcpResource = entry.url || undefined
          const resourceEntry = lcpResource
            ? (performance.getEntriesByName(lcpResource)[0] as PerformanceResourceTiming | undefined)
            : undefined

          const resourceLoadMs = resourceEntry
            ? Math.round(resourceEntry.responseEnd - resourceEntry.startTime)
            : undefined

          const element =
            entry.element instanceof Element
              ? `${entry.element.tagName.toLowerCase()}${entry.element.id ? `#${entry.element.id}` : ''}`
              : undefined

          const topCauses: string[] = []
          if (typeof ttfbMs === 'number' && ttfbMs > 800) {
            topCauses.push('high-ttfb')
          }
          if (typeof resourceLoadMs === 'number' && resourceLoadMs > 1200) {
            topCauses.push('slow-lcp-resource')
          }
          if (typeof entry.size === 'number' && entry.size > 120000) {
            topCauses.push('large-lcp-element')
          }
          if (topCauses.length < 2 && value > 4000) {
            topCauses.push('main-thread-render-delay')
          }

          return {
            ttfbMs,
            lcpResource,
            resourceLoadMs,
            lcpSize: entry.size,
            lcpElement: element,
            topCauses: topCauses.slice(0, 2),
          }
        }

        let lastLcpEntry: LcpEntry | null = null
        let lcpReported = false
        let clsValue = 0
        let clsReported = false

        const reportFinalLcp = () => {
          if (lcpReported || !lastLcpEntry) return
          const value = lastLcpEntry.renderTime || lastLcpEntry.loadTime || lastLcpEntry.startTime || 0
          reportWebVitals({
            name: 'LCP',
            value,
            id: lastLcpEntry.id || `lcp-${Math.round(value)}`,
            rating: getLcpRating(value),
            details: getLcpDetails(lastLcpEntry, value),
          })
          lcpReported = true
        }

        const reportFinalCls = () => {
          if (clsReported) return
          reportWebVitals({
            name: 'CLS',
            value: clsValue,
            id: 'cls-final',
            rating: (() => {
              if (clsValue < 0.1) return 'good'
              if (clsValue < 0.25) return 'needs-improvement'
              return 'poor'
            })(),
          })
          clsReported = true
        }

        // LCP (Largest Contentful Paint)
        const lcpObserver = new PerformanceObserver(list => {
          const entries = list.getEntries() as LcpEntry[]
          const lastEntry = entries[entries.length - 1]
          if (lastEntry) {
            lastLcpEntry = lastEntry
          }
        })
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true } as PerformanceObserverInit)

        // FID (First Input Delay)
        const fidObserver = new PerformanceObserver(list => {
          const entries = list.getEntries()
          entries.forEach((entry: PerformanceEntry & { processingStart?: number; id?: string }) => {
            const processingStart = entry.processingStart || 0
            const value = processingStart - entry.startTime
            reportWebVitals({
              name: 'FID',
              value,
              id: entry.id || `fid-${Math.round(entry.startTime)}`,
              rating: (() => {
                if (value < 100) return 'good'
                if (value < 300) return 'needs-improvement'
                return 'poor'
              })(),
            })
          })
        })
        fidObserver.observe({ entryTypes: ['first-input'] })

        // CLS (Cumulative Layout Shift)
        const clsObserver = new PerformanceObserver(list => {
          const entries = list.getEntries() as Array<
            PerformanceEntry & { hadRecentInput?: boolean; value?: number }
          >
          entries.forEach(entry => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value || 0
            }
          })
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })

        const finalizeVitals = () => {
          reportFinalLcp()
          reportFinalCls()
        }

        const handlePageHide = () => {
          finalizeVitals()
        }

        const handleVisibilityChange = () => {
          if (document.visibilityState === 'hidden') {
            finalizeVitals()
          }
        }

        window.addEventListener('pagehide', handlePageHide)
        document.addEventListener('visibilitychange', handleVisibilityChange)

        // Cleanup
        return () => {
          finalizeVitals()
          window.removeEventListener('pagehide', handlePageHide)
          document.removeEventListener('visibilitychange', handleVisibilityChange)
          lcpObserver.disconnect()
          fidObserver.disconnect()
          clsObserver.disconnect()
        }
      } catch (error) {
        // PerformanceObserver not supported or error
        logger.warn('PerformanceObserver not available', { component: 'PerformanceTracker', error: String(error) })
      }
    }
  }, [])

  return null
}
