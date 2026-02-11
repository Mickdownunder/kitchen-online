import {
  confidenceBand,
  normalizeConfidence,
  shouldAutoApplyField,
} from '@/lib/orders/documentAnalysisConfidence'

describe('documentAnalysisConfidence', () => {
  it('normalizes values into 0..1 range', () => {
    expect(normalizeConfidence(0.7)).toBe(0.7)
    expect(normalizeConfidence(5)).toBe(1)
    expect(normalizeConfidence(-1)).toBe(0)
    expect(normalizeConfidence('0.42')).toBe(0.42)
    expect(normalizeConfidence('not-a-number', 0.3)).toBe(0.3)
  })

  it('applies threshold for auto-fill', () => {
    expect(shouldAutoApplyField(0.8)).toBe(true)
    expect(shouldAutoApplyField(0.54)).toBe(false)
    expect(shouldAutoApplyField(0.54, 0.5)).toBe(true)
  })

  it('maps confidence into quality bands', () => {
    expect(confidenceBand(0.9)).toBe('high')
    expect(confidenceBand(0.6)).toBe('medium')
    expect(confidenceBand(0.2)).toBe('low')
  })
})
