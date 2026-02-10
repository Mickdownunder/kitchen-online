import type { User } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/server'
import type { PortalDocumentType } from './schema'

export type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>

export interface AuthorizationContext {
  user: User
  companyId: string
  serviceClient: ServiceClient
}

export interface RenderedDocument {
  pdfBuffer: Buffer
  fileName: string
  portalType: PortalDocumentType
}
