'use client'

import React, { useState, useMemo } from 'react'
import { Mail, Copy, Send, FileText, Package, Building2, Check } from 'lucide-react'
import { Complaint, CustomerProject, InvoiceItem } from '@/types'
import { logger } from '@/lib/utils/logger'

interface ComplaintEmailGeneratorProps {
  complaint: Complaint
  project: CustomerProject | null
  affectedItems: InvoiceItem[]
  onEmailSent: (emailContent: string) => Promise<void>
}

const ComplaintEmailGenerator: React.FC<ComplaintEmailGeneratorProps> = ({
  complaint,
  project,
  affectedItems,
  onEmailSent,
}) => {
  const [emailContent, setEmailContent] = useState(complaint.emailContent || '')
  const [supplierEmail, setSupplierEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)

  // Email-Vorlagen
  const templates = useMemo(
    () => [
      {
        id: 'standard',
        label: 'Standard-Vorlage',
        template: `Sehr geehrte Damen und Herren,

bei der Montage der Küche für ${project?.customerName || 'Kunde'} (Auftragsnummer: ${complaint.originalOrderNumber || project?.orderNumber || 'N/A'}) haben wir folgende Mängel festgestellt:

${
  affectedItems.length > 0
    ? affectedItems
        .map(
          item =>
            `- Position ${item.position}: ${item.description}${item.manufacturer ? ` (${item.manufacturer})` : ''}`
        )
        .join('\n')
    : '- ' + complaint.description
}

${complaint.description}

Bitte senden Sie uns die entsprechenden Ersatzteile zu.

Mit freundlichen Grüßen
[Ihr Name]`,
      },
      {
        id: 'damage',
        label: 'Beschädigung',
        template: `Sehr geehrte Damen und Herren,

bei der Lieferung der Küche für ${project?.customerName || 'Kunde'} (Auftragsnummer: ${complaint.originalOrderNumber || project?.orderNumber || 'N/A'}) wurde folgender Artikel beschädigt:

${
  affectedItems.length > 0
    ? affectedItems
        .map(
          item =>
            `- Position ${item.position}: ${item.description}${item.manufacturer ? ` (${item.manufacturer})` : ''}`
        )
        .join('\n')
    : '- ' + complaint.description
}

Beschreibung des Schadens:
${complaint.description}

Bitte senden Sie uns einen Ersatz zu.

Mit freundlichen Grüßen
[Ihr Name]`,
      },
      {
        id: 'missing',
        label: 'Fehlteil',
        template: `Sehr geehrte Damen und Herren,

bei der Lieferung der Küche für ${project?.customerName || 'Kunde'} (Auftragsnummer: ${complaint.originalOrderNumber || project?.orderNumber || 'N/A'}) fehlt folgender Artikel:

${
  affectedItems.length > 0
    ? affectedItems
        .map(
          item =>
            `- Position ${item.position}: ${item.description}${item.manufacturer ? ` (${item.manufacturer})` : ''} - Menge: ${item.quantity} ${item.unit}`
        )
        .join('\n')
    : '- ' + complaint.description
}

Bitte senden Sie uns die fehlenden Teile nach.

Mit freundlichen Grüßen
[Ihr Name]`,
      },
      {
        id: 'wrong_item',
        label: 'Falscher Artikel',
        template: `Sehr geehrte Damen und Herren,

bei der Lieferung der Küche für ${project?.customerName || 'Kunde'} (Auftragsnummer: ${complaint.originalOrderNumber || project?.orderNumber || 'N/A'}) wurde ein falscher Artikel geliefert:

${
  affectedItems.length > 0
    ? affectedItems
        .map(
          item =>
            `- Position ${item.position}: Erwartet: ${item.description}${item.manufacturer ? ` (${item.manufacturer})` : ''}`
        )
        .join('\n')
    : '- ' + complaint.description
}

${complaint.description}

Bitte senden Sie uns den korrekten Artikel zu.

Mit freundlichen Grüßen
[Ihr Name]`,
      },
    ],
    [complaint, project, affectedItems]
  )

  // Automatisch erste Vorlage generieren wenn noch kein Inhalt vorhanden
  React.useEffect(() => {
    if (!emailContent && templates.length > 0) {
      setEmailContent(templates[0].template)
    }
  }, [emailContent, templates])

  const applyTemplate = (template: string) => {
    setEmailContent(template)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(emailContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSend = async () => {
    if (!emailContent.trim()) {
      alert('Bitte geben Sie einen Email-Text ein.')
      return
    }

    if (!supplierEmail.trim() && complaint.supplierName) {
      alert('Bitte geben Sie eine Empfänger-E-Mail-Adresse ein.')
      return
    }

    setSending(true)
    try {
      // Konvertiere Text zu HTML falls nötig
      const html = emailContent.includes('<') ? emailContent : emailContent.replace(/\n/g, '<br>')

      // Bestimme Empfänger
      const recipientEmail =
        supplierEmail.trim() ||
        (complaint.supplierName ? `${complaint.supplierName}@example.com` : null)

      if (!recipientEmail) {
        alert('Bitte geben Sie eine Empfänger-E-Mail-Adresse ein.')
        setSending(false)
        return
      }

      // Generiere Betreff
      const subject = `Reklamation ${complaint.originalOrderNumber || project?.orderNumber || ''} - ${project?.customerName || 'Kunde'}`

      // Sende Email über API
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: [recipientEmail],
          subject,
          html,
          text: emailContent,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      // Speichere Email-Content und Timestamp
      await onEmailSent(emailContent)

      alert('✅ E-Mail erfolgreich versendet!')
    } catch (error: unknown) {
      logger.error('Fehler beim Versenden der E-Mail', { component: 'ComplaintEmailGenerator' }, error instanceof Error ? error : new Error(String(error)))
      alert(
        `❌ Fehler beim Versenden der E-Mail: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Vorlagen */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h4 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
          <FileText className="h-5 w-5 text-red-500" />
          Email-Vorlagen
        </h4>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {templates.map(template => (
            <button
              key={template.id}
              type="button"
              onClick={() => applyTemplate(template.template)}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition-colors hover:border-red-300 hover:bg-red-50"
            >
              <p className="font-medium text-slate-900">{template.label}</p>
              <p className="mt-1 text-xs text-slate-500">Klicken zum Anwenden</p>
            </button>
          ))}
        </div>
      </div>

      {/* Email-Editor */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Mail className="h-5 w-5 text-red-500" />
            Email-Text
          </h4>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  Kopiert!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Kopieren
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!emailContent || sending}
              className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sending ? 'Wird gesendet...' : 'E-Mail senden'}
            </button>
          </div>
        </div>

        {/* Empfänger (optional) */}
        {complaint.supplierName && (
          <div className="mb-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Empfänger (optional)
            </label>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-400" />
              <input
                type="email"
                placeholder={`${complaint.supplierName}@...`}
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-red-500"
                value={supplierEmail}
                onChange={e => setSupplierEmail(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Email-Text */}
        <textarea
          className="h-96 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-red-500"
          value={emailContent}
          onChange={e => setEmailContent(e.target.value)}
          placeholder="Email-Text wird automatisch generiert..."
        />

        {/* Info-Box */}
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-900">
            <strong>Tipp:</strong> Der Email-Text kann angepasst werden. Verwenden Sie die Vorlagen
            als Ausgangspunkt und passen Sie den Text nach Bedarf an.
          </p>
        </div>
      </div>

      {/* Betroffene Items Info */}
      {affectedItems.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h4 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
            <Package className="h-5 w-5 text-red-500" />
            Betroffene Artikel (werden automatisch in Email eingefügt)
          </h4>
          <div className="space-y-2">
            {affectedItems.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    Pos {item.position}: {item.description}
                  </p>
                  {item.manufacturer && (
                    <p className="text-xs text-slate-500">{item.manufacturer}</p>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {item.quantity} {item.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ComplaintEmailGenerator
