import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database.types'
import type { CustomerProject, InvoiceItem, ProjectDocument } from '@/types'
import type { Insert, Row, Update } from '@/lib/types/service'

export type ProjectClient = SupabaseClient<Database>

export type ProjectRow = Row<'projects'> & {
  invoice_items?: Row<'invoice_items'>[]
}

export type ProjectInsert = Insert<'projects'>
export type ProjectUpdate = Update<'projects'>

export type ItemInsert = Insert<'invoice_items'>
export type ItemUpdate = Update<'invoice_items'>

export type CreateProjectInput = Omit<CustomerProject, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateProjectInput = Partial<CustomerProject>

export interface BuildProjectInsertInput {
  userId: string
  project: CreateProjectInput
  accessCode: string
  orderNumber: string
  documents: ProjectDocument[]
}

export type JsonValue = Json

export interface ServiceErrorLike {
  message?: string
  code?: string
  details?: string
  hint?: string
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface ItemBuildContext {
  item: InvoiceItem
  projectId: string
  position: number
}
