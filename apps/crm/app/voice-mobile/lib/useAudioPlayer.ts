'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { decodeAudioChunk } from './audioUtils'

const GEMINI_OUTPUT_RATE = 24000

/**
 * Audio playback hook for Gemini Live output.
 * Queues PCM chunks and plays them seamlessly with jitter buffering.
 * Adapted from nyx-ai-front/hooks/useAudioPlayer.ts.
 */
export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0)

  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const queueRef = useRef<Float32Array[]>([])
  const nextStartTimeRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)

  const initializeAudio = useCallback(async () => {
    if (!audioContextRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioContextRef.current = new AC()

      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      analyserRef.current.smoothingTimeConstant = 0.5

      gainNodeRef.current = audioContextRef.current.createGain()
      gainNodeRef.current.gain.value = 1.0
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
    }
  }, [])

  const visualize = useCallback(() => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      analyserRef.current.getByteFrequencyData(dataArray)
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
      const avg = sum / dataArray.length
      setVolume(Math.min(avg / 40, 1))

      if (audioContextRef.current && nextStartTimeRef.current > audioContextRef.current.currentTime) {
        animationFrameRef.current = requestAnimationFrame(visualize)
      } else {
        setVolume(0)
        animationFrameRef.current = null
      }
    }
  }, [])

  const processQueue = useCallback(() => {
    if (queueRef.current.length === 0 || !audioContextRef.current) {
      setIsPlaying(false)
      return
    }

    setIsPlaying(true)
    const audioData = queueRef.current.shift()
    if (!audioData) return

    const buffer = audioContextRef.current.createBuffer(1, audioData.length, GEMINI_OUTPUT_RATE)
    buffer.copyToChannel(new Float32Array(audioData.buffer.slice(0)) as Float32Array<ArrayBuffer>, 0)

    const source = audioContextRef.current.createBufferSource()
    source.buffer = buffer

    if (analyserRef.current && gainNodeRef.current) {
      source.connect(analyserRef.current)
      analyserRef.current.connect(gainNodeRef.current)
      gainNodeRef.current.connect(audioContextRef.current.destination)
    } else {
      source.connect(audioContextRef.current.destination)
    }

    const currentTime = audioContextRef.current.currentTime

    // Jitter buffer: reset start time if we've fallen behind
    if (nextStartTimeRef.current < currentTime) {
      nextStartTimeRef.current = currentTime + 0.05
    }

    source.start(nextStartTimeRef.current)
    nextStartTimeRef.current += buffer.duration

    if (!animationFrameRef.current) {
      visualize()
    }
  }, [visualize])

  const playAudioChunk = useCallback(
    async (base64Audio: string) => {
      if (!audioContextRef.current) await initializeAudio()
      const float32 = decodeAudioChunk(base64Audio)
      queueRef.current.push(float32)
      while (queueRef.current.length > 0) {
        processQueue()
      }
    },
    [initializeAudio, processQueue],
  )

  const stopAudio = useCallback(() => {
    queueRef.current = []
    nextStartTimeRef.current = 0
    setIsPlaying(false)
    setVolume(0)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
    }
  }, [])

  return { initializeAudio, playAudioChunk, stopAudio, isPlaying, volume }
}
