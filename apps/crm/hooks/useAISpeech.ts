'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { logger } from '@/lib/utils/logger'
import type { SpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionErrorEvent } from '@/types/speech.d'

interface UseAISpeechOptions {
  onTranscript?: (text: string) => void
  onInterimTranscript?: (text: string) => void
}

interface UseAISpeechResult {
  isListening: boolean
  isSpeechSupported: boolean
  isTTSEnabled: boolean
  isSpeaking: boolean
  speechError: string | null
  interimTranscript: string
  toggleListening: () => Promise<void>
  speakText: (text: string) => void
  stopSpeaking: () => void
  toggleTTS: () => void
}

/** Wählt eine weibliche deutsche TTS-Stimme (Chrome: "Google deutsch Female", Safari: Anna/Helena, etc.) */
function pickGermanFemaleVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const deVoices = voices.filter(v => v.lang === 'de-DE' || v.lang.startsWith('de-'))
  const female = deVoices.find(
    v =>
      /female|frau|weiblich|anna|helena|karen|samantha|yuri/i.test(v.name) ||
      (v.name.toLowerCase().includes('google') && v.name.toLowerCase().includes('female'))
  )
  return female ?? deVoices[0] ?? null
}

export function useAISpeech(options: UseAISpeechOptions = {}): UseAISpeechResult {
  const [isListening, setIsListening] = useState(false)
  const [isSpeechSupported] = useState(
    () =>
      typeof window !== 'undefined' &&
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  )
  const [isTTSEnabled, setIsTTSEnabled] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [interimTranscript, setInterimTranscript] = useState('')

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
  const userRequestedStopRef = useRef(false)
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const restartTimeoutRef = useRef<number | null>(null)

  // Store callbacks in refs so the useEffect doesn't re-run on every render.
  // Without this, the inline lambdas passed as options cause the effect to
  // tear down and recreate SpeechRecognition on every render, killing any
  // in-progress speech recognition session.
  const onTranscriptRef = useRef(options.onTranscript)
  const onInterimTranscriptRef = useRef(options.onInterimTranscript)
  useEffect(() => {
    onTranscriptRef.current = options.onTranscript
    onInterimTranscriptRef.current = options.onInterimTranscript
  }, [options.onTranscript, options.onInterimTranscript])

  // Initialize Speech Recognition (runs once on mount)
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition

    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'de-DE'
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        logger.debug('[Speech] Recognition started', { component: 'useAISpeech' })
        setIsListening(true)
        setSpeechError(null)
        setInterimTranscript('')
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = ''
        let final = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            final += transcript + ' '
          } else {
            interim += transcript
          }
        }

        if (interim) {
          setInterimTranscript(interim)
          onInterimTranscriptRef.current?.(interim)
        }

        if (final) {
          onTranscriptRef.current?.(final.trim())
          setInterimTranscript('')
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        logger.error('[Speech] Recognition error', { component: 'useAISpeech', error: event.error })
        setInterimTranscript('')
        if (event.error === 'aborted') return
        setIsListening(false)

        let errorMessage = 'Spracherkennungsfehler'
        switch (event.error) {
          case 'not-allowed':
            errorMessage =
              'Mikrofon-Zugriff verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.'
            break
          case 'no-speech':
            errorMessage =
              'Keine Sprache erkannt. Bitte sprich lauter oder näher zum Mikrofon.'
            break
          case 'audio-capture':
            errorMessage = 'Mikrofon nicht verfügbar. Bitte prüfe deine Geräteeinstellungen.'
            break
          case 'network':
            errorMessage = 'Netzwerkfehler bei der Spracherkennung.'
            break
          default:
            errorMessage = `Spracherkennungsfehler: ${event.error}`
        }

        setSpeechError(errorMessage)
        setTimeout(() => setSpeechError(null), 5000)
      }

      recognition.onend = () => {
        logger.debug('[Speech] Recognition ended', { component: 'useAISpeech' })
        if (userRequestedStopRef.current) {
          userRequestedStopRef.current = false
          setIsListening(false)
          setInterimTranscript('')
          return
        }
        setInterimTranscript('')
        const r = recognitionRef.current
        if (r) {
          restartTimeoutRef.current = window.setTimeout(() => {
            restartTimeoutRef.current = null
            try {
              r.start()
            } catch {
              setIsListening(false)
            }
          }, 300)
        } else {
          setIsListening(false)
        }
      }

      recognitionRef.current = recognition
    } else {
      logger.warn('[Speech] Speech Recognition nicht unterstützt', { component: 'useAISpeech' })
    }

    let ttsTimer: number | null = null

    if ('speechSynthesis' in window) {
      const loadVoice = () => {
        const voices = window.speechSynthesis.getVoices()
        preferredVoiceRef.current = pickGermanFemaleVoice(voices)
      }
      window.speechSynthesis.onvoiceschanged = loadVoice
      loadVoice()
    }

    if ('speechSynthesis' in window && typeof window.localStorage?.getItem === 'function') {
      const savedTTS = window.localStorage.getItem('ai_tts_enabled')
      const enableTTS = savedTTS === 'true' || savedTTS === null
      if (enableTTS) {
        ttsTimer = window.setTimeout(() => setIsTTSEnabled(true), 0)
        if (savedTTS === null) window.localStorage.setItem('ai_tts_enabled', 'true')
      }
    }

    return () => {
      if (ttsTimer !== null) window.clearTimeout(ttsTimer)
      if (restartTimeoutRef.current) {
        window.clearTimeout(restartTimeoutRef.current)
        restartTimeoutRef.current = null
      }
      userRequestedStopRef.current = true
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // ignore
        }
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel()
    }
  }, []) // stable — callbacks accessed via refs

  const toggleListening = useCallback(async () => {
    if (!recognitionRef.current) {
      setSpeechError('Spracherkennung nicht verfügbar')
      return
    }

    if (isListening) {
      userRequestedStopRef.current = true
      if (restartTimeoutRef.current) {
        window.clearTimeout(restartTimeoutRef.current)
        restartTimeoutRef.current = null
      }
      try {
        recognitionRef.current.stop()
      } catch (error) {
        logger.error('[Speech] Error stopping recognition', { component: 'useAISpeech' }, error as Error)
      }
      setIsListening(false)
      setInterimTranscript('')
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
        setSpeechError(null)
      } catch (error: unknown) {
        logger.error('[Speech] Error starting recognition', { component: 'useAISpeech' }, error as Error)
        setIsListening(false)
        const err = error as { name?: string; message?: string }
        if (err.name === 'NotAllowedError' || err.message?.includes('not-allowed')) {
          setSpeechError(
            'Mikrofon-Zugriff verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.'
          )
        } else {
          setSpeechError(
            `Fehler beim Starten: ${err.message || 'Unbekannter Fehler'}. Nutze Chrome/Edge für beste Unterstützung.`
          )
        }
        setTimeout(() => setSpeechError(null), 5000)
      }
    }
  }, [isListening])

  const speakText = useCallback(
    (text: string) => {
      if (!isTTSEnabled || !('speechSynthesis' in window)) return

      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'de-DE'
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.volume = 0.8
      if (preferredVoiceRef.current) {
        utterance.voice = preferredVoiceRef.current
      }

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => {
        setIsSpeaking(false)
        speechSynthesisRef.current = null
      }
      utterance.onerror = error => {
        logger.error('Speech synthesis error', { component: 'useAISpeech' }, error as unknown as Error)
        setIsSpeaking(false)
        speechSynthesisRef.current = null
      }

      speechSynthesisRef.current = utterance
      window.speechSynthesis.speak(utterance)
    },
    [isTTSEnabled]
  )

  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      speechSynthesisRef.current = null
    }
  }, [])

  const toggleTTS = useCallback(() => {
    const newState = !isTTSEnabled
    setIsTTSEnabled(newState)
    if (typeof window.localStorage?.setItem === 'function') {
      window.localStorage.setItem('ai_tts_enabled', newState.toString())
    }

    if (!newState) {
      stopSpeaking()
    }
  }, [isTTSEnabled, stopSpeaking])

  return {
    // State
    isListening,
    isSpeechSupported,
    isTTSEnabled,
    isSpeaking,
    speechError,
    interimTranscript,
    // Actions
    toggleListening,
    speakText,
    stopSpeaking,
    toggleTTS,
  }
}
