import {
  CUSTOMER_PORTAL_DOCUMENT_TYPES,
  isCustomerPortalDocumentType,
} from '@/lib/portal/documentVisibility'

describe('document visibility', () => {
  it('accepts all customer portal document types', () => {
    CUSTOMER_PORTAL_DOCUMENT_TYPES.forEach((type) => {
      expect(isCustomerPortalDocumentType(type)).toBe(true)
    })
  })

  it('rejects internal or legacy document types', () => {
    expect(isCustomerPortalDocumentType('Order')).toBe(false)
    expect(isCustomerPortalDocumentType('Invoice')).toBe(false)
    expect(isCustomerPortalDocumentType('Other')).toBe(false)
    expect(isCustomerPortalDocumentType(null)).toBe(false)
    expect(isCustomerPortalDocumentType(undefined)).toBe(false)
  })
})
