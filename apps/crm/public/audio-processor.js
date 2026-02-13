/**
 * AudioWorklet Processor for real-time PCM capture.
 * Implements a noise gate so silence is sent as zeros (prevents Gemini Live timeout).
 * Adapted from nyx-ai-front.
 */
class PcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // iPhone-friendly threshold – low enough for quiet mics
    this.THRESHOLD = 0.004;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const float32Data = input[0];
    const frameSize = float32Data.length;

    // Calculate RMS energy
    let sumSquares = 0;
    for (let i = 0; i < frameSize; i++) {
      sumSquares += float32Data[i] * float32Data[i];
    }
    const rms = Math.sqrt(sumSquares / frameSize);

    if (rms > this.THRESHOLD) {
      // Loud enough: send real audio
      this.port.postMessage(float32Data.slice());
    } else {
      // Send explicit silence (zeros) instead of nothing.
      // Without this, Gemini Live waits ~15s for a timeout before responding.
      this.port.postMessage(new Float32Array(frameSize).fill(0));
    }

    return true;
  }
}

registerProcessor('pcm-processor', PcmProcessor);
