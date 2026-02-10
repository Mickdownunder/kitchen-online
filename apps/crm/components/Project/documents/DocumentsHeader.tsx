import { KeyRound, Loader2, Mail } from 'lucide-react'

interface DocumentsHeaderProps {
  sendingPortalAccess: boolean
  portalAccessError: string | null
  onSendPortalAccess: () => void
}

export function DocumentsHeader({
  sendingPortalAccess,
  portalAccessError,
  onSendPortalAccess,
}: DocumentsHeaderProps) {
  return (
    <>
      <div>
        <h4 className="text-xl font-black tracking-tight text-slate-900">Auftragsunterlagen</h4>
        <p className="text-sm text-slate-500">
          Auftrag, Rechnungen und Kunden-Lieferscheine für dieses Projekt
        </p>
      </div>

      <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-600 p-2.5 text-white">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Kundenportal-Zugang</p>
              <p className="text-sm text-slate-600">
                Projektcode und Link per E-Mail an den Kunden senden (z. B. bei Verkauf im Geschäft).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSendPortalAccess}
            disabled={sendingPortalAccess}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {sendingPortalAccess ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Wird gesendet…
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Portal-Zugang senden
              </>
            )}
          </button>
        </div>
        {portalAccessError && (
          <p className="mt-3 text-sm font-medium text-red-600">{portalAccessError}</p>
        )}
      </div>
    </>
  )
}
