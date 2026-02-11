import {
  appendExternalOrderedNote,
  toExternallyOrderedStatus,
} from '@/lib/orders/externalOrderState'

describe('externalOrderState', () => {
  it('sets sent for draft-like states', () => {
    expect(toExternallyOrderedStatus('draft')).toBe('sent')
    expect(toExternallyOrderedStatus('pending_approval')).toBe('sent')
  })

  it('keeps advanced states untouched', () => {
    expect(toExternallyOrderedStatus('ab_received')).toBe('ab_received')
    expect(toExternallyOrderedStatus('ready_for_installation')).toBe('ready_for_installation')
  })

  it('appends note once and keeps idempotent text', () => {
    const nowIso = '2026-02-11T12:00:00.000Z'
    const first = appendExternalOrderedNote('Bestehende Notiz', nowIso)
    const second = appendExternalOrderedNote(first, nowIso)

    expect(first).toContain('Bestehende Notiz')
    expect(first).toContain('Extern bestellt markiert (2026-02-11)')
    expect(second).toBe(first)
  })
})
