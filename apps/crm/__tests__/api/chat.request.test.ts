import { parseChatRequest } from '@/app/api/chat/request'

describe('parseChatRequest', () => {
  it('parses valid payload', () => {
    const result = parseChatRequest({
      message: 'Hallo',
      projects: [{ id: 'project-1' }],
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.message).toBe('Hallo')
      expect(result.data.projects).toHaveLength(1)
    }
  })

  it('returns validation error for too long message', () => {
    const result = parseChatRequest({
      message: 'x'.repeat(10001),
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('validation')
    }
  })

  it('returns validation error for too many projects', () => {
    const result = parseChatRequest({
      message: 'ok',
      projects: Array.from({ length: 501 }, (_, index) => ({ id: `p-${index}` })),
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('validation')
    }
  })
})
