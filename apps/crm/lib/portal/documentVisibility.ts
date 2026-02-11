export const CUSTOMER_PORTAL_DOCUMENT_TYPES = [
  'PLANE',
  'INSTALLATIONSPLANE',
  'KAUFVERTRAG',
  'RECHNUNGEN',
  'LIEFERSCHEINE',
  'AUSMESSBERICHT',
  'KUNDEN_DOKUMENT',
] as const

export type CustomerPortalDocumentType = (typeof CUSTOMER_PORTAL_DOCUMENT_TYPES)[number]

const CUSTOMER_PORTAL_DOCUMENT_TYPE_SET = new Set<string>(CUSTOMER_PORTAL_DOCUMENT_TYPES)

export function isCustomerPortalDocumentType(
  value: string | null | undefined,
): value is CustomerPortalDocumentType {
  if (!value) {
    return false
  }

  return CUSTOMER_PORTAL_DOCUMENT_TYPE_SET.has(value)
}
