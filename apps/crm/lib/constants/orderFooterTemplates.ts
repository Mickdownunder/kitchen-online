/** Standard-Vorlagen für den Auftrag-Fußtext (unter den Positionen, über der Unterschrift). */
export const DEFAULT_ORDER_FOOTER_TEMPLATES: { name: string; body: string }[] = [
  {
    name: 'Zahlungsmodalitäten',
    body: `Bitte beachten Sie die vereinbarten Zahlungsmodalitäten:
• Anzahlung fällig binnen 7 Tagen nach Auftragserteilung
• Restbetrag fällig bei Abnahme bzw. nach Montage
Zahlung wahlweise per SEPA-Überweisung oder bar bei Abholung/Übergabe.`,
  },
  {
    name: 'Reklamationen',
    body: `Beanstandungen bitte unverzüglich nach Erhalt der Ware schriftlich oder per E-Mail mitteilen. Bei sichtbaren Mängeln ist eine unverzügliche Rüge erforderlich. Die Gewährleistungsfrist beträgt 24 Monate ab Ablieferung.`,
  },
  {
    name: 'Unterschrift Kunde',
    body: `Unterschrift Auftraggeber / Kunde _________________________`,
  },
  {
    name: 'Schlusstext',
    body: `Wir freuen uns über Ihren Auftrag und bedanken uns für das entgegengebrachte Vertrauen. Bei Rückfragen stehen wir Ihnen gerne zur Verfügung.`,
  },
  {
    name: 'Eigentumsvorbehalt',
    body: `Die Ware bleibt bis zur vollständigen Bezahlung unser Eigentum.`,
  },
  {
    name: 'Montagehinweis',
    body: `Liefer- und Montagetermin werden gesondert vereinbart und schriftlich bestätigt. Bitte stellen Sie einen ungehinderten Zugang sowie Strom- und Wasseranschlüsse in Montagenähe bereit.`,
  },
  {
    name: 'Lieferhinweis',
    body: `Die Lieferung erfolgt frei Bordsteinkante. Weitertransport und Verladung ins Gebäude sind vom Auftraggeber zu veranlassen bzw. zu tragen, sofern nicht anders vereinbart.`,
  },
]
