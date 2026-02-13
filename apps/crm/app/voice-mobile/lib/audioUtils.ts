/** Convert Float32 PCM samples to Base64-encoded Int16 PCM for Gemini Live. */
export function createPcmBlob(
  float32Data: Float32Array,
  sampleRate: number,
): { mimeType: string; data: string } {
  const pcm16 = new Int16Array(float32Data.length)
  for (let i = 0; i < float32Data.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Data[i]))
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }

  const bytes = new Uint8Array(pcm16.buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }

  return {
    mimeType: `audio/pcm;rate=${sampleRate}`,
    data: window.btoa(binary),
  }
}

/** Decode Base64 PCM16 audio from Gemini Live into Float32 samples. */
export function decodeAudioChunk(base64Audio: string): Float32Array {
  const binaryString = window.atob(base64Audio)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  const int16Array = new Int16Array(bytes.buffer)
  const float32Array = new Float32Array(int16Array.length)
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768.0
  }
  return float32Array
}
