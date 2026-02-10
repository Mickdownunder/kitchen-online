import { normalizeDocumentNameForDedup } from '@/app/api/portal/publish-document/helpers'

describe('publish-document dedup helpers', () => {
  it('normalizes case and trims the .pdf suffix', () => {
    expect(normalizeDocumentNameForDedup(' Schlussrechnung_R-2026-0012.PDF ')).toBe(
      'schlussrechnung_r-2026-0012',
    )
  })

  it('removes legacy timestamp suffixes from file names', () => {
    expect(normalizeDocumentNameForDedup('Auftrag_K-2026-0001_1737900000123.pdf')).toBe(
      'auftrag_k-2026-0001',
    )
  })

  it('keeps different invoice numbers distinct (no prefix collision)', () => {
    const current = normalizeDocumentNameForDedup('Teilrechnung_R-2026-0012.pdf')
    const other = normalizeDocumentNameForDedup('Teilrechnung_R-2026-00123.pdf')

    expect(current).not.toBe(other)
  })
})
