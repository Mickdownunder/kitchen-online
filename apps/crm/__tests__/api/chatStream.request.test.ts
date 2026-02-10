import { parseChatStreamRequest } from '@/app/api/chat/stream/request'

describe('parseChatStreamRequest', () => {
  it('parses valid payload with defaults', () => {
    const result = parseChatStreamRequest(
      JSON.stringify({
        message: 'Hallo',
        projects: [{ id: 'project-1' }],
        chatHistory: [{ role: 'user', content: 'Hi' }],
      }),
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.message).toBe('Hallo')
      expect(result.data.projects).toHaveLength(1)
      expect(result.data.chatHistory).toEqual([{ role: 'user', content: 'Hi' }])
      expect(result.bodySizeMB).toBeGreaterThan(0)
    }
  })

  it('returns parse error for invalid json', () => {
    const result = parseChatStreamRequest('not-json')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('parse')
    }
  })

  it('returns validation error for too long message', () => {
    const result = parseChatStreamRequest(
      JSON.stringify({
        message: 'x'.repeat(10001),
      }),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('validation')
    }
  })

  it('returns validation error for too many projects', () => {
    const result = parseChatStreamRequest(
      JSON.stringify({
        message: 'ok',
        projects: Array.from({ length: 501 }, (_, index) => ({ id: `p-${index}` })),
      }),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('validation')
    }
  })
})
