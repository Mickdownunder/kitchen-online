import {
  getInitialOnlineState,
  OFFLINE_PROBE_ENDPOINT,
  probeOnlineStatus,
} from '@/components/offlineIndicator.utils'

describe('offlineIndicator utils', () => {
  it('defaults to online when navigator state is unavailable', () => {
    expect(getInitialOnlineState()).toBe(true)
    expect(getInitialOnlineState({})).toBe(true)
  })

  it('uses navigator online status when available', () => {
    expect(getInitialOnlineState({ onLine: true })).toBe(true)
    expect(getInitialOnlineState({ onLine: false })).toBe(false)
  })

  it('returns true when connectivity probe resolves', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false })

    const result = await probeOnlineStatus({
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 123,
    })

    expect(result).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      `${OFFLINE_PROBE_ENDPOINT}?offlineProbe=123`,
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin',
      }),
    )
  })

  it('returns false when connectivity probe rejects', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('network down'))

    const result = await probeOnlineStatus({
      fetchImpl: fetchMock as unknown as typeof fetch,
    })

    expect(result).toBe(false)
  })
})
