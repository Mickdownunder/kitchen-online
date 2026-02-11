export function normalizeConfidence(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(1, Math.max(0, value))
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return Math.min(1, Math.max(0, parsed))
    }
  }

  return Math.min(1, Math.max(0, fallback))
}

export function shouldAutoApplyField(confidence: number, threshold = 0.55): boolean {
  return normalizeConfidence(confidence) >= threshold
}

export function confidenceBand(confidence: number): 'high' | 'medium' | 'low' {
  const normalized = normalizeConfidence(confidence)
  if (normalized >= 0.8) {
    return 'high'
  }
  if (normalized >= 0.55) {
    return 'medium'
  }
  return 'low'
}
