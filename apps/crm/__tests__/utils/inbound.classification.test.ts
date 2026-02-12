import { extractHeuristicSignals } from '@/lib/inbound/classification'

describe('extractHeuristicSignals', () => {
  it('detects AB signals', () => {
    const result = extractHeuristicSignals({
      fileName: 'AB_12345.pdf',
      subject: 'Auftragsbestaetigung zu 2026-LAB',
      bodyText: 'AB-Nr AB-7788, Liefertermin 2026-03-10',
    })

    expect(result.kind).toBe('ab')
    expect(result.abNumber).toBe('AB-7788')
    expect(result.orderNumbers).toContain('2026-LAB')
    expect(result.confirmedDeliveryDate).toBe('2026-03-10')
  })

  it('detects supplier invoice signals', () => {
    const result = extractHeuristicSignals({
      fileName: 'rechnung-551.pdf',
      subject: 'Lieferantenrechnung RE-551',
      bodyText: 'Rechnungsdatum 2026-02-05 Faelligkeit 2026-02-20',
    })

    expect(result.kind).toBe('supplier_invoice')
    expect(result.invoiceNumber).toBe('551')
    expect(result.invoiceDate).toBe('2026-02-05')
    expect(result.dueDate).toBe('2026-02-20')
  })
})
