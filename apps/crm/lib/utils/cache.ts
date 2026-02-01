/**
 * Cache utilities for offline support
 * Uses IndexedDB for persistent storage
 */

const DB_NAME = 'kitchen-profi-cache'
const DB_VERSION = 1
const STORE_NAME = 'cache'

interface CacheEntry<T = unknown> {
  key: string
  value: T
  timestamp: number
  expiresAt?: number
}

let db: IDBDatabase | null = null

/**
 * Initialize IndexedDB
 */
async function initDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = event => {
      const database = (event.target as IDBOpenDBRequest).result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'key' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

/**
 * Get cached value
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const database = await initDB()
    const transaction = database.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(key)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined
        if (!entry) {
          resolve(null)
          return
        }

        // Check expiration
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
          // Expired, delete it
          deleteCache(key)
          resolve(null)
          return
        }

        resolve(entry.value as T)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Cache get error:', error)
    return null
  }
}

/**
 * Set cached value
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttl?: number // Time to live in milliseconds
): Promise<void> {
  try {
    const database = await initDB()
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    const entry: CacheEntry = {
      key,
      value,
      timestamp: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : undefined,
    }

    await store.put(entry)
  } catch (error) {
    console.error('Cache set error:', error)
  }
}

/**
 * Delete cached value
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    const database = await initDB()
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    await store.delete(key)
  } catch (error) {
    console.error('Cache delete error:', error)
  }
}

/**
 * Clear all cache
 */
export async function clearCache(): Promise<void> {
  try {
    const database = await initDB()
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    await store.clear()
  } catch (error) {
    console.error('Cache clear error:', error)
  }
}

/**
 * Cache with fetch wrapper
 * Automatically caches GET requests
 */
export async function cachedFetch<T>(
  url: string,
  options: RequestInit = {},
  ttl: number = 5 * 60 * 1000 // 5 minutes default
): Promise<T> {
  const cacheKey = `fetch:${url}:${JSON.stringify(options)}`

  // Only cache GET requests
  if (options.method === 'GET' || !options.method) {
    const cached = await getCache<T>(cacheKey)
    if (cached) {
      return cached
    }
  }

  // Fetch from network
  const response = await fetch(url, options)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = (await response.json()) as T

  // Cache GET requests
  if (options.method === 'GET' || !options.method) {
    await setCache(cacheKey, data, ttl)
  }

  return data
}
