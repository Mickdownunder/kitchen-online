import { GoogleGenAI, Type } from '@google/genai'
import { logger } from '@/lib/utils/logger'
import { VOICE_HIGH_CONFIDENCE_THRESHOLD, VOICE_MEDIUM_CONFIDENCE_THRESHOLD } from './constants'
import { VoiceIntentSchema, type VoiceIntent } from './intentSchema'
import type { VoiceIntentParseResult } from './types'

const MODEL = 'gemini-3-flash-preview'

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, Math.min(1, value))
}

function toConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= VOICE_HIGH_CONFIDENCE_THRESHOLD) {
    return 'high'
  }
  if (confidence >= VOICE_MEDIUM_CONFIDENCE_THRESHOLD) {
    return 'medium'
  }
  return 'low'
}

function parseModelJson(rawText: string): Record<string, unknown> {
  const trimmed = rawText.trim()
  if (!trimmed) {
    return {}
  }

  try {
    return JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (match?.[1]) {
      return JSON.parse(match[1]) as Record<string, unknown>
    }
    throw new Error('Invalid model JSON')
  }
}

function normalizeIsoDate(value: string): string | null {
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  const deMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!deMatch) {
    return null
  }

  const day = deMatch[1].padStart(2, '0')
  const month = deMatch[2].padStart(2, '0')
  return `${deMatch[3]}-${month}-${day}`
}

/** Resolve relative date expressions (morgen, Montag, nächste Woche, etc.) to ISO date strings. */
function resolveRelativeDate(text: string): string | null {
  const lower = text.toLowerCase()
  const now = new Date()

  // heute
  if (/\bheute\b/.test(lower)) {
    return toIso(now)
  }

  // morgen
  if (/\bmorgen\b/.test(lower) && !/\bguten\s*morgen\b/.test(lower)) {
    return toIso(addDays(now, 1))
  }

  // übermorgen
  if (/\bübermorgen\b/.test(lower)) {
    return toIso(addDays(now, 2))
  }

  // nächste Woche (= next Monday)
  if (/\bnächste\s*woche\b/.test(lower)) {
    const monday = nextWeekday(now, 1)
    return toIso(monday)
  }

  // Day names: Montag=1 … Sonntag=7
  const dayNames: Record<string, number> = {
    montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4,
    freitag: 5, samstag: 6, sonntag: 0,
  }
  for (const [name, weekday] of Object.entries(dayNames)) {
    const re = new RegExp(`\\b(?:am\\s+)?(?:nächsten?\\s+)?${name}\\b`)
    if (re.test(lower)) {
      return toIso(nextWeekday(now, weekday))
    }
  }

  return null
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}

function nextWeekday(from: Date, weekday: number): Date {
  const current = from.getDay()
  let diff = weekday - current
  if (diff <= 0) diff += 7
  return addDays(from, diff)
}

function toIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildHeuristicIntent(text: string): VoiceIntent {
  const normalized = text.trim()
  const lower = normalized.toLowerCase()

  const isoDateMatch = normalized.match(/(\d{4}-\d{2}-\d{2})/)
  const deDateMatch = normalized.match(/(\d{1,2}\.\d{1,2}\.\d{4})/)
  const timeMatch = normalized.match(/(?:um\s+)?(\d{1,2}:\d{2})/i)

  // Try explicit date formats first, then relative expressions
  const date = normalizeIsoDate(isoDateMatch?.[1] || deDateMatch?.[1] || '') || resolveRelativeDate(lower)

  const looksLikeAppointment =
    lower.includes('termin') || lower.includes('besprechung') || lower.includes('meeting')

  if (looksLikeAppointment && date) {
    const customerNameMatch = normalized.match(/(?:mit|bei)\s+([A-Za-z0-9äöüÄÖÜß .\-]+)/)
    const hasCustomer = Boolean(customerNameMatch?.[1]?.trim())
    const hasTime = Boolean(timeMatch)

    // Confidence: Termin + Datum reicht für high. Mehr Details = höher.
    let confidence = 0.86 // Termin + Datum = genug für Auto-Execute
    if (hasTime) confidence = 0.90
    if (hasCustomer && hasTime) confidence = 0.95

    return {
      version: 'v1',
      action: 'create_appointment',
      summary: 'Termin aus Voice-Text',
      confidence,
      confidenceLevel: toConfidenceLevel(confidence),
      appointment: {
        customerName: customerNameMatch?.[1]?.trim() || 'Kunde (unbekannt)',
        date,
        time: timeMatch?.[1]?.padStart(5, '0'),
        type: 'Consultation',
        notes: normalized,
      },
    }
  }

  // Auch ohne explizites "termin"-Keyword: wenn ein Datum + Uhrzeit + Name vorhanden
  if (date && timeMatch && normalized.match(/(?:mit|bei)\s+\w/)) {
    const customerNameMatch = normalized.match(/(?:mit|bei)\s+([A-Za-z0-9äöüÄÖÜß .\-]+)/)
    return {
      version: 'v1',
      action: 'create_appointment',
      summary: 'Termin aus Voice-Text',
      confidence: 0.88,
      confidenceLevel: toConfidenceLevel(0.88),
      appointment: {
        customerName: customerNameMatch?.[1]?.trim() || 'Kunde (unbekannt)',
        date,
        time: timeMatch[1].padStart(5, '0'),
        type: 'Consultation',
        notes: normalized,
      },
    }
  }

  // Task: "Aufgabe bis Freitag: Angebot schicken"
  const dueDate = date || null
  const cleanedTitle = normalized
    .replace(/^(erstelle|lege|mach|notiere|bitte)\s+(eine\s+)?(aufgabe|todo)\s*/i, '')
    .replace(/\b(bis|am)\s+(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|morgen|übermorgen|heute|nächste\s*woche)\b/gi, '')
    .replace(/\b(bis|am)\s+\d{1,2}\.\d{1,2}\.\d{4}\b/g, '')
    .trim()

  // "Aufgabe" oder "Todo" explizit genannt → high confidence
  const hasTaskKeyword = lower.includes('aufgabe') || lower.includes('todo') || lower.includes('erinnerung')
  const confidence = hasTaskKeyword ? 0.92 : 0.70

  return {
    version: 'v1',
    action: 'create_task',
    summary: 'Task aus Voice-Text',
    confidence,
    confidenceLevel: toConfidenceLevel(confidence),
    task: {
      title: cleanedTitle || normalized,
      description: normalized,
      priority: lower.includes('dringend') ? 'urgent' : 'normal',
      dueAt: dueDate || undefined,
    },
  }
}

function normalizeValidatedIntent(intent: VoiceIntent): VoiceIntent {
  const confidence = clampConfidence(intent.confidence)
  return {
    ...intent,
    confidence,
    confidenceLevel: toConfidenceLevel(confidence),
  }
}

async function parseWithModel(input: {
  text: string
  locale?: string
  contextHints?: Record<string, unknown>
}): Promise<VoiceIntentParseResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    return {
      ok: false,
      message: 'GEMINI_API_KEY fehlt.',
    }
  }

  const ai = new GoogleGenAI({ apiKey })
  const contextHints = JSON.stringify(input.contextHints || {})

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        parts: [
          {
            text: `Du wandelst CRM-Voice-Notizen in strikt strukturiertes JSON um.

Regeln:
- Erlaubte action-Werte: create_task, create_appointment, add_project_note
- version immer "v1"
- confidence 0..1
- confidenceLevel nur high|medium|low
- Wenn unklar: create_task mit niedriger confidence
- Keine Freitext-Erklärung außerhalb von JSON

Input:
- locale: ${input.locale || 'de-AT'}
- contextHints: ${contextHints}
- text: ${input.text}`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          version: { type: Type.STRING },
          action: { type: Type.STRING },
          summary: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          confidenceLevel: { type: Type.STRING },
          task: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              priority: { type: Type.STRING },
              dueAt: { type: Type.STRING },
              projectHint: { type: Type.STRING },
              customerHint: { type: Type.STRING },
            },
          },
          appointment: {
            type: Type.OBJECT,
            properties: {
              customerName: { type: Type.STRING },
              date: { type: Type.STRING },
              time: { type: Type.STRING },
              type: { type: Type.STRING },
              notes: { type: Type.STRING },
              phone: { type: Type.STRING },
              projectHint: { type: Type.STRING },
            },
          },
          projectNote: {
            type: Type.OBJECT,
            properties: {
              projectHint: { type: Type.STRING },
              note: { type: Type.STRING },
            },
          },
        },
      },
    },
  })

  const raw = parseModelJson(response.text || '')
  const parsed = VoiceIntentSchema.safeParse(raw)

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || 'Voice-Intent ist ungültig.',
      raw,
    }
  }

  return {
    ok: true,
    intent: normalizeValidatedIntent(parsed.data),
    raw,
  }
}

/** Schnelle Heuristik-only-Verarbeitung (kein KI-Aufruf, <10ms). Für Siri/Capture. */
export function parseVoiceIntentHeuristic(text: string): VoiceIntentParseResult {
  const normalizedText = text.trim()
  if (!normalizedText) {
    return { ok: false, message: 'Voice-Text ist leer.' }
  }
  const heuristic = buildHeuristicIntent(normalizedText)
  return {
    ok: true,
    intent: normalizeValidatedIntent(heuristic),
    raw: { source: 'heuristic', text: normalizedText },
  }
}

/** Volle Verarbeitung: erst Gemini, Fallback auf Heuristik. Langsam (~10s). */
export async function parseVoiceIntent(input: {
  text: string
  locale?: string
  contextHints?: Record<string, unknown>
}): Promise<VoiceIntentParseResult> {
  const normalizedText = input.text.trim()
  if (!normalizedText) {
    return {
      ok: false,
      message: 'Voice-Text ist leer.',
    }
  }

  if (process.env.GEMINI_API_KEY?.trim()) {
    try {
      const modelResult = await parseWithModel(input)
      if (modelResult.ok) {
        return modelResult
      }

      logger.warn('Voice intent model response invalid, using heuristic fallback', {
        component: 'voice-intent-parser',
        reason: modelResult.message,
      })
    } catch (error) {
      logger.warn('Voice intent model parsing failed, using heuristic fallback', {
        component: 'voice-intent-parser',
      }, error as Error)
    }
  }

  const heuristic = buildHeuristicIntent(normalizedText)
  return {
    ok: true,
    intent: normalizeValidatedIntent(heuristic),
    raw: {
      source: 'heuristic',
      text: normalizedText,
    },
  }
}
