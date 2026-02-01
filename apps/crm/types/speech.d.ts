/**
 * Web Speech API Type Definitions
 *
 * These types provide TypeScript support for the Web Speech API,
 * which is not fully typed in the standard TypeScript library.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
 */

/** Speech recognition error types */
type SpeechRecognitionErrorCode =
  | 'aborted'
  | 'audio-capture'
  | 'bad-grammar'
  | 'language-not-supported'
  | 'network'
  | 'no-speech'
  | 'not-allowed'
  | 'service-not-allowed'

/** Speech recognition error event */
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: SpeechRecognitionErrorCode
  readonly message?: string
}

/** A single speech recognition alternative */
interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}

/** A single speech recognition result */
interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

/** List of speech recognition results */
interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

/** Speech recognition result event */
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

/** Speech recognition interface */
interface SpeechRecognition extends EventTarget {
  // Properties
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number

  // Methods
  start(): void
  stop(): void
  abort(): void

  // Event handlers
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null
  onend: ((this: SpeechRecognition, ev: Event) => void) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onspeechstart: ((this: SpeechRecognition, ev: Event) => void) | null
  onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null
  onaudiostart: ((this: SpeechRecognition, ev: Event) => void) | null
  onaudioend: ((this: SpeechRecognition, ev: Event) => void) | null
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onsoundstart: ((this: SpeechRecognition, ev: Event) => void) | null
  onsoundend: ((this: SpeechRecognition, ev: Event) => void) | null
}

/** Speech recognition constructor */
interface SpeechRecognitionConstructor {
  new (): SpeechRecognition
  prototype: SpeechRecognition
}

/** Extend the Window interface with Speech Recognition */
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

export type {
  SpeechRecognition,
  SpeechRecognitionConstructor,
  SpeechRecognitionErrorCode,
  SpeechRecognitionErrorEvent,
  SpeechRecognitionEvent,
  SpeechRecognitionResult,
  SpeechRecognitionResultList,
  SpeechRecognitionAlternative,
}
