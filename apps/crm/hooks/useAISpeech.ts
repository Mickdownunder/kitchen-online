'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { logger } from '@/lib/utils/logger'

interface UseAISpeechOptions {
  onTranscript?: (text: string) => void
  onInterimTranscript?: (text: string) => void
}

export function useAISpeech(options: UseAISpeechOptions = {}) {
  const { onTranscript, onInterimTranscript } = options

  const [isListening, setIsListening] = useState(false)
  const [isSpeechSupported, setIsSpeechSupported] = useState(false)
  const [isTTSEnabled, setIsTTSEnabled] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [interimTranscript, setInterimTranscript] = useState('')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setIsSpeechSupported(!!SpeechRecognition)

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
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
          onInterimTranscript?.(interim)
        }

        if (final) {
          onTranscript?.(final.trim())
          setInterimTranscript('')
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        console.error('[Speech] Recognition error:', event.error)
        setIsListening(false)
        setInterimTranscript('')

        let errorMessage = 'Spracherkennungsfehler'
        switch (event.error) {
          case 'not-allowed':
            errorMessage =
              'Mikrofon-Zugriff wurde verweigert. Bitte erlauben Sie den Zugriff in den Browser-Einstellungen.'
            break
          case 'no-speech':
            errorMessage =
              'Keine Sprache erkannt. Bitte sprechen Sie lauter oder näher zum Mikrofon.'
            break
          case 'audio-capture':
            errorMessage = 'Mikrofon nicht verfügbar. Bitte prüfen Sie Ihre Geräteeinstellungen.'
            break
          case 'network':
            errorMessage = 'Netzwerkfehler bei der Spracherkennung.'
            break
          case 'aborted':
            return
          default:
            errorMessage = `Spracherkennungsfehler: ${event.error}`
        }

        setSpeechError(errorMessage)
        setTimeout(() => setSpeechError(null), 5000)
      }

      recognition.onend = () => {
        logger.debug('[Speech] Recognition ended', { component: 'useAISpeech' })
        setIsListening(false)
        setInterimTranscript('')
      }

      recognitionRef.current = recognition
    } else {
      console.warn('[Speech] Speech Recognition nicht unterstützt')
      setIsSpeechSupported(false)
    }

    // Check TTS support and load preference
    if ('speechSynthesis' in window) {
      const savedTTS = localStorage.getItem('ai_tts_enabled')
      if (savedTTS === 'true') {
        setIsTTSEnabled(true)
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // Ignore errors when stopping
        }
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [onTranscript, onInterimTranscript])

  const toggleListening = useCallback(async () => {
    if (!recognitionRef.current) {
      setSpeechError('Spracherkennung nicht verfügbar')
      return
    }

    if (isListening) {
      try {
        recognitionRef.current.stop()
        setIsListening(false)
        setInterimTranscript('')
      } catch (error) {
        console.error('[Speech] Error stopping recognition:', error)
        setIsListening(false)
      }
    } else {
      try {
        if (navigator.permissions) {
          const permissionStatus = await navigator.permissions.query({
            name: 'microphone' as PermissionName,
          })
          if (permissionStatus.state === 'denied') {
            setSpeechError(
              'Mikrofon-Zugriff wurde verweigert. Bitte erlauben Sie den Zugriff in den Browser-Einstellungen.'
            )
            setTimeout(() => setSpeechError(null), 5000)
            return
          }
        }

        recognitionRef.current.start()
        setIsListening(true)
        setSpeechError(null)
      } catch (error: unknown) {
        console.error('[Speech] Error starting recognition:', error)
        setIsListening(false)
        const err = error as { name?: string; message?: string }

        if (err.name === 'NotAllowedError' || err.message?.includes('not-allowed')) {
          setSpeechError(
            'Mikrofon-Zugriff wurde verweigert. Bitte erlauben Sie den Zugriff in den Browser-Einstellungen.'
          )
        } else {
          setSpeechError(
            `Fehler beim Starten der Spracherkennung: ${err.message || 'Unbekannter Fehler'}`
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

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => {
        setIsSpeaking(false)
        speechSynthesisRef.current = null
      }
      utterance.onerror = error => {
        console.error('Speech synthesis error:', error)
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
    localStorage.setItem('ai_tts_enabled', newState.toString())

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
