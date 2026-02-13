import { parseVoiceIntent } from '@/lib/voice/intentParser'

describe('voice intent parser', () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY
  })

  it('returns validation error for empty text', async () => {
    const result = await parseVoiceIntent({ text: '   ' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain('leer')
    }
  })

  it('parses task intent with heuristic fallback', async () => {
    const result = await parseVoiceIntent({ text: 'Bitte Aufgabe Angebot nachfassen bei Müller erstellen' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.intent.action).toBe('create_task')
      expect(result.intent.task?.title.length).toBeGreaterThan(0)
    }
  })

  it('parses appointment intent when date is present', async () => {
    const result = await parseVoiceIntent({
      text: 'Termin mit Familie Bauer am 2026-03-01 um 10:30 vereinbaren',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.intent.action).toBe('create_appointment')
      expect(result.intent.appointment?.date).toBe('2026-03-01')
      expect(result.intent.appointment?.time).toBe('10:30')
    }
  })
})
