import Image from 'next/image'
import { Download, X } from 'lucide-react'
import { CustomerProject } from '@/types'
import type { SignatureAudit } from '../projectDocuments.types'

interface SignatureProofModalProps {
  project: CustomerProject
  signatureAudit: SignatureAudit | null
  onClose: () => void
}

export function SignatureProofModal({
  project,
  signatureAudit,
  onClose,
}: SignatureProofModalProps) {
  if (!project.customerSignature) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Schließen"
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="mb-4 pr-8 text-lg font-bold text-slate-900">Unterschrift – Nachweis</h3>
        <p className="mb-4 text-sm text-slate-600">Auftrag {project.orderNumber} · Online unterschrieben</p>
        <div className="mb-4 rounded-xl border-2 border-slate-200 bg-slate-50 p-4">
          <Image
            src={project.customerSignature}
            alt="Unterschrift des Kunden"
            width={800}
            height={256}
            unoptimized
            className="mx-auto max-h-32 w-full object-contain"
          />
        </div>
        <div className="space-y-2 rounded-xl bg-emerald-50 p-4 text-sm">
          <p>
            <span className="font-bold text-slate-700">Unterzeichner:</span>{' '}
            {project.orderContractSignedBy || '–'}
          </p>
          <p>
            <span className="font-bold text-slate-700">Unterzeichnet am:</span>{' '}
            {project.orderContractSignedAt
              ? new Date(project.orderContractSignedAt).toLocaleString('de-DE')
              : '–'}
          </p>
          <p>
            <span className="font-bold text-slate-700">Widerrufsverzicht:</span>{' '}
            {project.withdrawalWaivedAt
              ? `${new Date(project.withdrawalWaivedAt).toLocaleString('de-DE')} (§ 18 FAGG Maßanfertigung)`
              : '–'}
          </p>
        </div>

        {signatureAudit && (signatureAudit.ip_address || signatureAudit.user_agent || signatureAudit.geodata) && (
          <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="font-bold text-slate-700">Audit-Unterlagen</p>
            {signatureAudit.ip_address && (
              <p>
                <span className="text-slate-600">IP-Adresse:</span> {signatureAudit.ip_address}
              </p>
            )}
            {signatureAudit.user_agent && (
              <p>
                <span className="text-slate-600">User-Agent:</span>{' '}
                <span className="break-all text-xs">{signatureAudit.user_agent}</span>
              </p>
            )}
            {signatureAudit.geodata && (signatureAudit.geodata.lat || signatureAudit.geodata.city) && (
              <p>
                <span className="text-slate-600">Standort:</span>{' '}
                {[
                  signatureAudit.geodata.city,
                  signatureAudit.geodata.country,
                  signatureAudit.geodata.lat != null && signatureAudit.geodata.lon != null
                    ? `(${signatureAudit.geodata.lat.toFixed(4)}, ${signatureAudit.geodata.lon.toFixed(4)})`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' ') || '–'}
              </p>
            )}
          </div>
        )}

        <p className="mt-4 text-xs text-slate-500">
          Dieses Dokument dient als Nachweis der Online-Unterschrift des Auftrags.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              const link = document.createElement('a')
              link.href = project.customerSignature!
              link.download = `Unterschrift_Auftrag_${project.orderNumber || project.id}.png`
              link.click()
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Als Bild speichern
          </button>
          <button
            onClick={onClose}
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  )
}
