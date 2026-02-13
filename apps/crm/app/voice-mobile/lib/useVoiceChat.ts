'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VoiceChatState = 'idle' | 'listening' | 'thinking' | 'speaking'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface SSEEvent {
  type: string
  text?: string
  error?: string
  functionName?: string
  result?: string
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVoiceChat(voiceToken: string | null) {
  const [state, setState] = useState<VoiceChatState>('idle')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [autoListen, setAutoListen] = useState(true)
  const [currentTranscript, setCurrentTranscript] = useState<string | null>(null)

  // Refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const abortRef = useRef<AbortController | null>(null)
  const isSpeakingRef = useRef(false)
  const autoListenRef = useRef(autoListen)

  // Keep ref in sync
  useEffect(() => { autoListenRef.current = autoListen }, [autoListen])

  // -----------------------------------------------------------------------
  // TTS: speechSynthesis
  // -----------------------------------------------------------------------

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis || !text.trim()) { resolve(); return }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'de-DE'
      utterance.rate = 1.05
      utterance.pitch = 1.0

      // Try to find a good German female voice
      const voices = window.speechSynthesis.getVoices()
      const germanVoice = voices.find(
        (v) => v.lang.startsWith('de') && v.name.toLowerCase().includes('female'),
      ) ?? voices.find(
        (v) => v.lang.startsWith('de') && (v.name.includes('Anna') || v.name.includes('Helena') || v.name.includes('Petra')),
      ) ?? voices.find(
        (v) => v.lang.startsWith('de'),
      )
      if (germanVoice) utterance.voice = germanVoice

      utterance.onend = () => { isSpeakingRef.current = false; resolve() }
      utterance.onerror = () => { isSpeakingRef.current = false; resolve() }

      isSpeakingRef.current = true
      window.speechSynthesis.speak(utterance)
    })
  }, [])

  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    isSpeakingRef.current = false
  }, [])

  // -----------------------------------------------------------------------
  // SSE: send message to /api/voice/chat and stream response
  // -----------------------------------------------------------------------

  const sendMessage = useCallback(
    async (text: string) => {
      if (!voiceToken || !text.trim()) return

      const userMsg: ChatMessage = { role: 'user', content: text.trim(), timestamp: Date.now() }
      setMessages((prev) => [...prev, userMsg])
      setState('thinking')
      setError(null)

      const abortController = new AbortController()
      abortRef.current = abortController

      try {
        const res = await fetch(`/api/voice/chat?token=${encodeURIComponent(voiceToken)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text.trim(),
            chatHistory: [...messages, userMsg].slice(-20).map((m) => ({
              role: m.role === 'user' ? 'user' : 'model',
              content: m.content,
            })),
          }),
          signal: abortController.signal,
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(errData.error || `Fehler ${res.status}`)
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error('Kein Stream verfügbar')

        const decoder = new TextDecoder()
        let fullText = ''
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const event = JSON.parse(line.slice(6)) as SSEEvent
              if (event.type === 'token' && event.text) {
                fullText += event.text
              } else if (event.type === 'error') {
                throw new Error(event.error || 'Stream-Fehler')
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== 'Stream-Fehler') {
                // JSON parse error on SSE line — skip
              } else {
                throw parseErr
              }
            }
          }
        }

        // Add assistant message
        const cleanText = fullText.replace(/[*#_`~]/g, '').trim()
        if (cleanText) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: cleanText, timestamp: Date.now() },
          ])

          // Speak the response
          setState('speaking')
          await speak(cleanText)
        }

        setState('idle')

        // Auto-listen after response
        if (autoListenRef.current && !abortController.signal.aborted) {
          // Small delay before re-listening
          setTimeout(() => {
            if (autoListenRef.current) startListeningInternal()
          }, 500)
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setState('idle')
          return
        }
        const msg = err instanceof Error ? err.message : 'Netzwerkfehler'
        setError(msg)
        setState('idle')
      } finally {
        abortRef.current = null
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [voiceToken, messages, speak],
  )

  // -----------------------------------------------------------------------
  // STT: Web Speech API
  // -----------------------------------------------------------------------

  const startListeningInternal = useCallback(() => {
    if (recognitionRef.current) return
    if (isSpeakingRef.current) return

    const win = window as unknown as Record<string, unknown>
    const SpeechRecognition = win.webkitSpeechRecognition ?? win.SpeechRecognition
    if (!SpeechRecognition) { setError('Spracherkennung nicht verfügbar.'); return }

    const rec = new (SpeechRecognition as new () => SpeechRecognitionInstance)()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'de-DE'

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results
      const last = results[results.length - 1]
      if (last) {
        const transcript = last[0]?.transcript ?? ''
        setCurrentTranscript(transcript)
        if (last.isFinal && transcript.trim()) {
          setCurrentTranscript(null)
          recognitionRef.current = null
          void sendMessage(transcript.trim())
        }
      }
    }

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      recognitionRef.current = null
      setCurrentTranscript(null)
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(`Mikrofon-Fehler: ${event.error}`)
      }
      setState('idle')
    }

    rec.onend = () => {
      recognitionRef.current = null
      setCurrentTranscript(null)
      // Only go back to idle if we weren't transitioning to thinking
      setState((prev) => prev === 'listening' ? 'idle' : prev)
    }

    recognitionRef.current = rec
    setState('listening')
    setError(null)
    rec.start()
  }, [sendMessage])

  const startListening = useCallback(() => {
    stopSpeaking()
    // Cancel any pending request
    if (abortRef.current) abortRef.current.abort()
    startListeningInternal()
  }, [startListeningInternal, stopSpeaking])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      recognitionRef.current = null
    }
    setCurrentTranscript(null)
    setState('idle')
  }, [])

  // -----------------------------------------------------------------------
  // Stop everything
  // -----------------------------------------------------------------------

  const stop = useCallback(() => {
    stopSpeaking()
    stopListening()
    if (abortRef.current) abortRef.current.abort()
    setState('idle')
  }, [stopSpeaking, stopListening])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort()
      if (abortRef.current) abortRef.current.abort()
      if (window.speechSynthesis) window.speechSynthesis.cancel()
    }
  }, [])

  // Pre-load voices (needed on some browsers)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.getVoices() }
    }
  }, [])

  return {
    state,
    messages,
    error,
    autoListen,
    setAutoListen,
    currentTranscript,
    startListening,
    stopListening,
    stop,
    clearMessages,
    sendMessage,
  }
}

// ---------------------------------------------------------------------------
// Type shims for Web Speech API (not in all TS libs)
// ---------------------------------------------------------------------------

interface SpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: { transcript: string; confidence: number }
}

interface SpeechRecognitionErrorEvent {
  error: string
}
