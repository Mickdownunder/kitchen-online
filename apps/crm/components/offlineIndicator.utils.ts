export const OFFLINE_PROBE_ENDPOINT = '/api/booking/webhook'
const OFFLINE_PROBE_TIMEOUT_MS = 4000

interface NavigatorLike {
  onLine?: boolean
}

interface ProbeOnlineStatusOptions {
  fetchImpl?: typeof fetch
  now?: () => number
  timeoutMs?: number
}

export function getInitialOnlineState(navigatorLike?: NavigatorLike): boolean {
  if (!navigatorLike || typeof navigatorLike.onLine !== 'boolean') {
    return true
  }

  return navigatorLike.onLine
}

export async function probeOnlineStatus(options: ProbeOnlineStatusOptions = {}): Promise<boolean> {
  const fetchImpl = options.fetchImpl ?? fetch
  const now = options.now ?? Date.now
  const timeoutMs = options.timeoutMs ?? OFFLINE_PROBE_TIMEOUT_MS
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null

  const timeoutId =
    controller !== null
      ? globalThis.setTimeout(() => {
          controller.abort()
        }, timeoutMs)
      : null

  try {
    await fetchImpl(`${OFFLINE_PROBE_ENDPOINT}?offlineProbe=${now()}`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller?.signal,
      headers: {
        'x-offline-probe': '1',
      },
    })

    return true
  } catch {
    return false
  } finally {
    if (timeoutId !== null) {
      globalThis.clearTimeout(timeoutId)
    }
  }
}
