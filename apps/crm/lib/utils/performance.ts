'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/utils/logger'

/**
 * Performance monitoring utilities
 * Tracks Web Vitals and API response times
 */

export interface WebVitals {
  name: string
  value: number
  id: string
  delta?: number
  rating?: 'good' | 'needs-improvement' | 'poor'
}

/**
 * Track Web Vitals (LCP, FID, CLS, etc.)
 */
export function reportWebVitals(metric: WebVitals) {
  const { name, value, id, delta, rating } = metric

  logger.info('Web Vital', {
    component: 'performance',
    metric: name,
    value: Math.round(value),
    delta: delta ? Math.round(delta) : undefined,
    rating,
    id,
  })

  // Send to analytics (optional)
  // Example: sendToAnalytics(name, value, id, delta, rating);
}

/**
 * Track API response time
 */
export function trackAPIPerformance(
  endpoint: string,
  method: string,
  duration: number,
  statusCode?: number
) {
  const isSlow = duration > 2000 // Consider >2s as slow

  if (isSlow || (statusCode && statusCode >= 400)) {
    logger.warn('Slow API response', {
      component: 'performance',
      endpoint,
      method,
      duration: `${duration}ms`,
      statusCode,
    })
  } else {
    logger.debug('API response', {
      component: 'performance',
      endpoint,
      method,
      duration: `${duration}ms`,
      statusCode,
    })
  }
}

/**
 * Measure function execution time
 */
export function measurePerformance<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
  const start = performance.now()

  return Promise.resolve(fn()).then(result => {
    const duration = performance.now() - start

    logger.debug('Performance measurement', {
      component: 'performance',
      name,
      duration: `${Math.round(duration)}ms`,
    })

    return result
  })
}

/**
 * React hook for tracking component render performance
 */
export function usePerformanceTracking(componentName: string) {
  useEffect(() => {
    const start = performance.now()

    return () => {
      const duration = performance.now() - start

      if (duration > 100) {
        logger.warn('Slow component render', {
          component: 'performance',
          componentName,
          duration: `${Math.round(duration)}ms`,
        })
      }
    }
  }, [componentName])
}

/**
 * React hook for tracking page load performance
 */
export function usePageLoadTracking() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const trackLoad = () => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming

      if (navigation) {
        const metrics = {
          domContentLoaded: Math.round(
            navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
          ),
          loadComplete: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
          totalTime: Math.round(navigation.loadEventEnd - navigation.fetchStart),
        }

        logger.info('Page load performance', {
          component: 'performance',
          ...metrics,
        })
      }
    }

    if (document.readyState === 'complete') {
      trackLoad()
    } else {
      window.addEventListener('load', trackLoad)
      return () => window.removeEventListener('load', trackLoad)
    }
  }, [])
}
