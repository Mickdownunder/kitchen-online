import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

function ensureLocalStorage() {
  if (typeof globalThis === 'undefined') return

  const storage = (globalThis as { localStorage?: Storage }).localStorage

  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    const memoryStore = new Map<string, string>()

    globalThis.localStorage = {
      getItem: key => (memoryStore.has(key) ? memoryStore.get(key)! : null),
      setItem: (key, value) => {
        memoryStore.set(key, value)
      },
      removeItem: key => {
        memoryStore.delete(key)
      },
      clear: () => {
        memoryStore.clear()
      },
      key: index => Array.from(memoryStore.keys())[index] ?? null,
      get length() {
        return memoryStore.size
      },
    } as Storage
  }
}

ensureLocalStorage()

export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
