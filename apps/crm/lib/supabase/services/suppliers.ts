/**
 * Lieferantenstamm (Suppliers) – CRUD pro Firma.
 * Für Bestellungen: Lieferant anlegen, Artikel zuordnen.
 */

import { supabase } from '../client'
import type { Supplier } from '@/types'

interface SupplierRow {
  id: string
  company_id: string
  name: string
  email: string | null
  order_email: string | null
  phone: string | null
  contact_person?: string | null
  contact_person_internal?: string | null
  contact_person_internal_phone?: string | null
  contact_person_internal_email?: string | null
  contact_person_external?: string | null
  contact_person_external_phone?: string | null
  contact_person_external_email?: string | null
  address?: string | null
  street?: string | null
  house_number?: string | null
  postal_code?: string | null
  city?: string | null
  country?: string | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
}

function mapSupplierFromRow(row: SupplierRow): Supplier {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    email: row.email ?? undefined,
    orderEmail: row.order_email ?? undefined,
    phone: row.phone ?? undefined,
    contactPersonInternal: row.contact_person_internal ?? undefined,
    contactPersonInternalPhone: row.contact_person_internal_phone ?? undefined,
    contactPersonInternalEmail: row.contact_person_internal_email ?? undefined,
    contactPersonExternal: row.contact_person_external ?? undefined,
    contactPersonExternalPhone: row.contact_person_external_phone ?? undefined,
    contactPersonExternalEmail: row.contact_person_external_email ?? undefined,
    street: row.street ?? undefined,
    houseNumber: row.house_number ?? undefined,
    postalCode: row.postal_code ?? undefined,
    city: row.city ?? undefined,
    country: row.country ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  }
}

export async function getSuppliers(companyId: string): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('company_id', companyId)
    .order('name', { ascending: true })

  if (error) throw error
  return (data || []).map(mapSupplierFromRow)
}

export async function getSupplier(id: string): Promise<Supplier | null> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data ? mapSupplierFromRow(data as SupplierRow) : null
}

export async function saveSupplier(supplier: Partial<Supplier>): Promise<Supplier> {
  const dbData = {
    company_id: supplier.companyId ?? '',
    name: supplier.name ?? '',
    email: supplier.email ?? null,
    order_email: supplier.orderEmail ?? null,
    phone: supplier.phone ?? null,
    contact_person_internal: supplier.contactPersonInternal ?? null,
    contact_person_internal_phone: supplier.contactPersonInternalPhone ?? null,
    contact_person_internal_email: supplier.contactPersonInternalEmail ?? null,
    contact_person_external: supplier.contactPersonExternal ?? null,
    contact_person_external_phone: supplier.contactPersonExternalPhone ?? null,
    contact_person_external_email: supplier.contactPersonExternalEmail ?? null,
    street: supplier.street ?? null,
    house_number: supplier.houseNumber ?? null,
    postal_code: supplier.postalCode ?? null,
    city: supplier.city ?? null,
    country: supplier.country ?? null,
    notes: supplier.notes ?? null,
    updated_at: new Date().toISOString(),
  }

  if (supplier.id) {
    const { data, error } = await supabase
      .from('suppliers')
      .update(dbData)
      .eq('id', supplier.id)
      .select()
      .single()
    if (error) throw error
    return mapSupplierFromRow(data as SupplierRow)
  }

  const { data, error } = await supabase.from('suppliers').insert(dbData).select().single()
  if (error) throw error
  return mapSupplierFromRow(data as SupplierRow)
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from('suppliers').delete().eq('id', id)
  if (error) throw error
}
