/**
 * Einheitliche Design-Tokens für Auftrags-, Rechnungs- und Lieferschein-PDFs.
 * Gleiche Typo, Abstände und Struktur für ein konsistentes, modernes Erscheinungsbild.
 */
export const PDF_DESIGN = {
  colors: {
    text: '#1e293b',
    secondary: '#64748b',
    muted: '#94a3b8',
    border: '#e2e8f0',
    borderDark: '#cbd5e1',
    headerBg: '#1e293b',
    headerText: '#ffffff',
  },
  fontSize: {
    title: 22,
    body: 10,
    small: 9,
    caption: 8,
    micro: 7,
  },
  spacing: {
    pagePadding: 40,
    sectionGap: 30,
    sectionGapSmall: 20,
    headerPaddingBottom: 20,
    titlePaddingBottom: 15,
  },
  /** Akzentfarbe pro Dokumenttyp – einheitliche Palette */
  accent: {
    order: '#0d9488',   // Teal (Aufträge)
    invoice: '#eab308', // Gelb/Amber (Rechnungen)
    delivery: '#3b82f6',
  },
} as const
