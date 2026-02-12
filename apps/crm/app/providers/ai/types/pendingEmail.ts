/**
 * Human-in-the-loop: Pending E-Mail-Aktion, die Nutzerbestätigung erfordert.
 */
export interface PendingEmailAction {
  type: 'pendingEmail'
  functionName: 'sendEmail' | 'sendReminder' | 'sendSupplierOrderEmail'
  to: string
  subject: string
  bodyPreview: string
  /** API-Pfad (z.B. /api/email/send oder /api/supplier-orders/[id]/send) */
  api: string
  /** Request-Body für den API-Aufruf */
  payload: Record<string, unknown>
  /** Original Function-Call für Follow-up */
  functionCallId: string
  /** Zusätzliche Args für Projekt-Update nach Versand (sendEmail) */
  projectId?: string
  /** Für sendReminder: Projekt-Infos */
  reminderType?: string
}

export function isPendingEmailAction(
  result: unknown
): result is PendingEmailAction {
  return (
    typeof result === 'object' &&
    result !== null &&
    (result as PendingEmailAction).type === 'pendingEmail'
  )
}
