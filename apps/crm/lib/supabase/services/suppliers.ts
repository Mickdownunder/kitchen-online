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
  contact_person: string | null
  address: string | null
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
    contactPerson: row.contact_person ?? undefined,
    address: row.address ?? undefined,
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
    contact_person: supplier.contactPerson ?? null,
    address: supplier.address ?? null,
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
