'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { GoogleGenAI, Modality, type LiveServerMessage, type FunctionDeclaration, Type } from '@google/genai'
import { createPcmBlob } from './audioUtils'
import { useAudioPlayer } from './useAudioPlayer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

interface SessionConfig {
  apiKey: string
  userId: string
  companyId: string
  config: {
    systemInstruction: string
    tools: Array<{ name: string; description?: string; parameters?: unknown }>
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025'

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGeminiLive(voiceToken: string | null) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [inputVolume, setInputVolume] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const { initializeAudio, playAudioChunk, stopAudio, isPlaying, volume: outputVolume } = useAudioPlayer()

  // Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null)
  const inputAnalyserRef = useRef<AnalyserNode | null>(null)
  const inputAnimRef = useRef<number | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionPromiseRef = useRef<Promise<any> | null>(null)
  const isConnectingRef = useRef(false)
  const isConnectedRef = useRef(false)

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  const cleanup = useCallback(() => {
    isConnectedRef.current = false
    stopAudio()
    if (inputAnimRef.current) {
      cancelAnimationFrame(inputAnimRef.current)
      inputAnimRef.current = null
    }
    setInputVolume(0)
    try {
      if (audioWorkletNodeRef.current) {
        audioWorkletNodeRef.current.port.onmessage = null
        audioWorkletNodeRef.current.disconnect()
        audioWorkletNodeRef.current = null
      }
      if (inputAnalyserRef.current) { inputAnalyserRef.current.disconnect(); inputAnalyserRef.current = null }
      if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null }
      if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null }
      if (inputAudioContextRef.current) { inputAudioContextRef.current.close(); inputAudioContextRef.current = null }
    } catch { /* ignore cleanup errors */ }
  }, [stopAudio])

  // -----------------------------------------------------------------------
  // Execute CRM function call (non-blocking)
  // -----------------------------------------------------------------------

  const executeFunctionCall = useCallback(
    async (fcId: string, fcName: string, fcArgs: Record<string, unknown>) => {
      if (!voiceToken) return { result: 'No token' }
      try {
        const res = await fetch(`/api/voice/function?token=${encodeURIComponent(voiceToken)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ functionName: fcName, args: fcArgs }),
        })
        const data = await res.json() as { ok?: boolean; result?: string }
        return { result: data.result || 'Ausgeführt.' }
      } catch (e) {
        return { result: `Fehler: ${e instanceof Error ? e.message : 'Unbekannt'}` }
      }
    },
    [voiceToken],
  )

  // -----------------------------------------------------------------------
  // Connect
  // -----------------------------------------------------------------------

  const connect = useCallback(async () => {
    if (connectionState === 'connected' || isConnectingRef.current || !voiceToken) return

    try {
      isConnectingRef.current = true
      setConnectionState('connecting')
      setError(null)
      cleanup()

      // #region agent log
      console.log('[DBG] connect-start', { token: voiceToken?.slice(0, 8) })
      // #endregion

      // 1. Get session config from server (system prompt + tools + API key)
      const sessionRes = await fetch(`/api/voice/session?token=${encodeURIComponent(voiceToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      // #region agent log
      console.log('[DBG] session-response', { ok: sessionRes.ok, status: sessionRes.status })
      // #endregion
      if (!sessionRes.ok) {
        const errData = await sessionRes.json().catch(() => ({})) as { error?: string }
        throw new Error(errData.error || `Session-Fehler ${sessionRes.status}`)
      }
      const sessionConfig = (await sessionRes.json()) as SessionConfig
      // #region agent log
      console.log('[DBG] session-parsed', { hasApiKey: !!sessionConfig.apiKey, toolCount: sessionConfig.config?.tools?.length, sysInstrLen: sessionConfig.config?.systemInstruction?.length })
      // #endregion

      // 2. Initialize audio output
      await initializeAudio()
      // #region agent log
      console.log('[DBG] audio-init done')
      // #endregion

      // 3. Setup audio input (AudioWorklet)
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      inputAudioContextRef.current = new AC()
      const inputRate = inputAudioContextRef.current.sampleRate
      await inputAudioContextRef.current.audioWorklet.addModule(`/audio-processor.js?t=${Date.now()}`)
      // #region agent log
      console.log('[DBG] worklet-loaded', { inputRate })
      // #endregion

      // 4. Build function declarations from server config
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const functionDeclarations = sessionConfig.config.tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })) as FunctionDeclaration[]

      // 5. Connect to Gemini Live
      // #region agent log
      console.log('[DBG] gemini-connect-start', { model: LIVE_MODEL, toolCount: functionDeclarations.length })
      // #endregion
      const ai = new GoogleGenAI({ apiKey: sessionConfig.apiKey })
      const sessionPromise = ai.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: sessionConfig.config.systemInstruction,
          tools: [{ functionDeclarations }],
        } as Parameters<typeof ai.live.connect>[0]['config'],
        callbacks: {
          onopen: async () => {
            // #region agent log
            console.log('[DBG] gemini-onopen fired')
            // #endregion
            isConnectedRef.current = true
            try {
              if (inputAudioContextRef.current?.state === 'suspended') {
                await inputAudioContextRef.current.resume()
              }
              streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
              if (!isConnectedRef.current) return

              if (inputAudioContextRef.current && streamRef.current) {
                const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current)
                const workletNode = new AudioWorkletNode(inputAudioContextRef.current, 'pcm-processor')
                const analyser = inputAudioContextRef.current.createAnalyser()
                inputAnalyserRef.current = analyser
                source.connect(analyser)
                analyser.connect(workletNode)

                workletNode.port.onmessage = (event) => {
                  if (!isConnectedRef.current) return
                  const audioData = event.data as Float32Array
                  sessionPromiseRef.current?.then((session) => {
                    if (isConnectedRef.current) {
                      const payload = createPcmBlob(audioData, inputRate)
                      session.sendRealtimeInput({ media: payload })
                    }
                  })
                }

                workletNode.connect(inputAudioContextRef.current.destination)
                sourceRef.current = source
                audioWorkletNodeRef.current = workletNode

                // Input volume visualization
                const updateInputVolume = () => {
                  if (inputAnalyserRef.current && isConnectedRef.current) {
                    const dataArray = new Uint8Array(inputAnalyserRef.current.frequencyBinCount)
                    inputAnalyserRef.current.getByteFrequencyData(dataArray)
                    let sum = 0
                    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
                    const avg = sum / dataArray.length
                    const newVol = Math.min(avg / 40.0, 1.0)
                    setInputVolume((prev) => (Math.abs(prev - newVol) > 0.05 ? newVol : prev))
                  }
                  inputAnimRef.current = requestAnimationFrame(updateInputVolume)
                }
                updateInputVolume()
                setConnectionState('connected')
              }
            } catch {
              cleanup()
              setConnectionState('error')
            }
            isConnectingRef.current = false
          },

          onmessage: async (message: LiveServerMessage) => {
            // Audio output
            const audioData = (
              message as unknown as {
                serverContent?: { modelTurn?: { parts?: Array<{ inlineData?: { data?: string } }> } }
              }
            ).serverContent?.modelTurn?.parts?.[0]?.inlineData?.data
            if (audioData) {
              playAudioChunk(audioData)
            }

            // Function calls — execute non-blocking, send result back
            const toolCall = (message as unknown as {
              toolCall?: { functionCalls: Array<{ id: string; name: string; args: Record<string, unknown> }> }
            }).toolCall
            if (toolCall?.functionCalls) {
              for (const fc of toolCall.functionCalls) {
                // Fire-and-forget: execute CRM action, send result back to Gemini
                ;(async () => {
                  const result = await executeFunctionCall(fc.id, fc.name, fc.args || {})
                  if (sessionPromiseRef.current) {
                    const session = await sessionPromiseRef.current
                    await session.sendToolResponse({
                      functionResponses: [{
                        id: fc.id,
                        name: fc.name,
                        response: { result: result.result },
                      }],
                    })
                  }
                })()
              }
            }
          },

          onclose: () => {
            // #region agent log
            console.log('[DBG] gemini-onclose fired')
            // #endregion
            cleanup()
            setConnectionState('disconnected')
            isConnectingRef.current = false
          },
          onerror: (e: unknown) => {
            // #region agent log
            console.error('[DBG] gemini-onerror', { error: String(e), msg: e instanceof Error ? e.message : 'unknown' })
            // #endregion
            console.error('Gemini Live error:', e)
            cleanup()
            setConnectionState('error')
            setError(`[onerror] ${e instanceof Error ? e.message : String(e)}`)
            isConnectingRef.current = false
          },
        },
      })
      sessionPromiseRef.current = sessionPromise
    } catch (e) {
      // #region agent log
      console.error('[DBG] connect-catch', { error: String(e), msg: e instanceof Error ? e.message : 'unknown', stack: e instanceof Error ? e.stack?.slice(0, 300) : 'none' })
      // #endregion
      cleanup()
      setConnectionState('error')
      setError(`[catch] ${e instanceof Error ? e.message : String(e)}`)
      isConnectingRef.current = false
    }
  }, [connectionState, voiceToken, cleanup, initializeAudio, playAudioChunk, executeFunctionCall])

  // -----------------------------------------------------------------------
  // Disconnect
  // -----------------------------------------------------------------------

  const disconnect = useCallback(() => {
    cleanup()
    sessionPromiseRef.current?.then((s) => s.close())
    sessionPromiseRef.current = null
    setConnectionState('disconnected')
  }, [cleanup])

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup])

  return {
    connect,
    disconnect,
    connectionState,
    inputVolume,
    outputVolume,
    isPlaying,
    error,
  }
}
