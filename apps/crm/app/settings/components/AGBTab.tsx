'use client'

import { FileText } from 'lucide-react'
import type { CompanySettings } from '@/types'

/** Standard-AGB (Michael Labitzke e.U., Stand Mai 2025) – für Button „Standard-AGB übernehmen“. */
export const DEFAULT_AGB_TEXT = `Allgemeine Geschäftsbedingungen (AGB)

Michael Labitzke e.U.
UID: ATU 69962114
Stand: Mai 2025

1. Geltungsbereich & Begriffsbestimmungen
1.1 Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für sämtliche Verträge zwischen der Michael Labitzke e.U. (im Folgenden „wir“ oder „uns“) und ihren Kunden (im Folgenden „Kunde“). Diese Fassung richtet sich ausschließlich an Verbraucher im Sinne des § 1 Konsumentenschutzgesetzes (KSchG).
1.2 Abweichende Bedingungen des Kunden werden nicht Vertragsinhalt, es sei denn, wir stimmen ihnen ausdrücklich schriftlich zu.

2. Vertragsschluss
2.1 Unsere Online‑Planungs‑ und Produktdarstellungen sind unverbindlich.
2.2 Ein verbindlicher Vertrag kommt zustande, wenn (a) der Kunde im shareHUB‑Portal auf „Annehmen“ klickt oder (b) der Kunde den Kaufvertrag vor Ort oder elektronisch qualifiziert unterzeichnet.
2.3 Nach Vertragsschluss erhält der Kunde unverzüglich eine Auftragsbestätigung per E‑Mail und im shareHUB‑Portal.

3. Widerrufsrecht (FAGG)
3.1 Widerruf nur bei Fern‑ und Auswärtsgeschäften: Das nach dem Fern‑ und Auswärtsgeschäfte‑Gesetz (FAGG) vorgesehene 14‑tägige Widerrufsrecht gilt ausschließlich für Verträge, die a) über unsere Website, per Telefon oder per E‑Mail geschlossen werden oder b) außerhalb unserer Geschäftsräume angebahnt wurden.
3.2 Kein Widerrufsrecht bei Unterschrift im Studio: Wird der Kaufvertrag in einer unserer Filialen vor Ort unterzeichnet, besteht kein gesetzliches Widerrufsrecht (§ 3 KSchG).
3.3 Ausnahme bei Maßanfertigungen (§ 18 Abs 1 Z 3 FAGG): Bei Küchen, die nach Kundenspezifikation angefertigt werden, erlischt ein etwaiges Widerrufsrecht vorzeitig, sobald der Kunde ausdrücklich zugestimmt hat, dass wir vor Ablauf der Widerrufsfrist mit der Fertigung beginnen.
3.4 Das Muster‑Widerrufsformular für Fern‑ und Auswärtsgeschäfte finden Sie hier.

4. Preise & Zahlungsbedingungen
4.1 Alle Preise verstehen sich in Euro inkl. gesetzlicher USt, jedoch exkl. Lieferung, Montage und Anschlüsse, sofern nicht ausdrücklich anders vereinbart.
4.2 Zahlplan: 40 % Anzahlung binnen 7 Tagen nach Vertragsabschluss, 40 % weitere Teilzahlung 14 Tage vor Liefertermin, 20 % Restbetrag bei Abnahme/Montage.
4.3 Rechnungen können wahlweise (a) per SEPA‑Überweisung oder (b) bar in unserem Studio bzw. unmittelbar bei Lieferung/Montage beglichen werden.
4.4 Bei Zahlungsverzug gelten die gesetzlichen Verzugszinsen (§ 1000 ABGB) sowie pauschale Mahnspesen von 10 € je Mahnung, sofern nicht höhere tatsächliche Inkassokosten anfallen.

5. Lieferung, Aufmaß & Montage
5.1 Lieferfristen gelten vorbehaltlich rechtzeitiger Selbstbelieferung; höhere Gewalt verlängert die Frist angemessen.
5.2 Fehlt dem Kunden ein belastbarer Grundriss, bieten wir einen kostenpflichtigen Aufmaßdienst (200 €; bei Auftragserteilung gutgeschrieben) an.
5.3 Liefer‑ und Montagetermine werden im Beratungsgespräch fixiert und schriftlich bestätigt.
5.4 Eigentums‑ und Gefahrübergang erfolgen mit Ablieferung. Bei Selbstabholung trägt der Kunde die Transportgefahr.

6. Eigentumsvorbehalt
Die Ware bleibt bis zur vollständigen Bezahlung sämtlicher Forderungen aus dem Vertrag unser Eigentum.

7. Gewährleistung & Haftung
7.1 Es gelten die gesetzlichen Gewährleistungsbestimmungen (24 Monate).
7.2 Bei Personenschäden haften wir auch bei leichter Fahrlässigkeit; bei Sachschäden nur bei grober Fahrlässigkeit.
7.3 Holz ist ein Naturprodukt; geringfügige Abweichungen in Maserung, Farbe oder Astbildung stellen keinen Mangel dar.

8. Storno
8.1 Storniert der Kunde vor Fertigungsbeginn, sind 30 % der Auftragssumme als pauschaler Schadenersatz (Stornogebühr gem. § 1168 ABGB) fällig, sofern nicht ein höherer Schaden nachgewiesen wird.
8.2 Nach Fertigungsbeginn ist ein Storno ausgeschlossen; der offene Auftragswert wird sofort fällig.

9. Datenschutz
Unsere Datenschutzerklärung finden Sie unter https://www.baleah.at/datenschutz. Der Kunde erklärt sich damit einverstanden, dass Vertragsdokumente ausschließlich elektronisch bereitgestellt werden.

10. Online‑Streitbeilegung & ADR
Die Europäische Kommission stellt eine Plattform zur Online‑Streitbeilegung bereit: https://ec.europa.eu/consumers/odr. Wir sind zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle bereit.

11. Schlussbestimmungen
11.1 Es gilt österreichisches Recht unter Ausschluss des UN‑Kaufrechts.
11.2 Für Klagen gegen Verbraucher, die ihren Wohnsitz oder gewöhnlichen Aufenthalt im Inland haben oder im Inland beschäftigt sind, gilt der Gerichtsstand des Wohnsitzes, des gewöhnlichen Aufenthaltes oder des Ortes der Beschäftigung des Verbrauchers (§ 14 KSchG). Andere Gerichtsstände werden hiermit ausgeschlossen.
11.3 Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt der Vertrag im Übrigen wirksam; anstelle der unwirksamen Bestimmung gilt die gesetzliche Regelung.

Michael Labitzke e.U. · Selzthalerstraße 2, 8940 Liezen · UID ATU69962114`

export function AGBTab({
  companySettings,
  setCompanySettings,
  saving,
  onSave,
}: {
  companySettings: Partial<CompanySettings>
  setCompanySettings: React.Dispatch<React.SetStateAction<Partial<CompanySettings>>>
  saving: boolean
  onSave: () => void
}) {
  return (
    <div className="space-y-8">
      <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
        <FileText className="h-5 w-5 text-teal-600" />
        Allgemeine Geschäftsbedingungen (AGB)
      </h3>

      <p className="text-sm text-slate-500">
        Dieser Text wird optional als letzte Seite an das Auftrags-PDF angehängt.
      </p>

      <div>
        <div className="mb-3 flex items-center justify-between gap-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
            AGB-Text
          </label>
          <button
            type="button"
            onClick={() => setCompanySettings(prev => ({ ...prev, agbText: DEFAULT_AGB_TEXT }))}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Standard-AGB übernehmen
          </button>
        </div>
        <textarea
          value={companySettings.agbText ?? ''}
          onChange={e => setCompanySettings(prev => ({ ...prev, agbText: e.target.value }))}
          rows={16}
          className="w-full rounded-xl bg-slate-50 px-4 py-3 font-mono text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-teal-500"
          placeholder="AGB-Text hier einfügen oder über „Standard-AGB übernehmen“ laden …"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-xl bg-teal-600 px-6 py-3 font-bold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? 'Speichern …' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}
