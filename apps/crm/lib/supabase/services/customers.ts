import { supabase } from '../client'
import { getCurrentUser } from './auth'
import type { Customer } from '@/types'
import type { ServiceResult, Row, Insert, Update } from '@/lib/types/service'
import { ok, fail } from '@/lib/types/service'

type CustomerRow = Row<'customers'>
type CustomerInsert = Insert<'customers'>
type CustomerUpdate = Update<'customers'>

// ─────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────

export async function getCustomers(): Promise<ServiceResult<Customer[]>> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return fail('INTERNAL', error.message, error)
  return ok(data.map(mapCustomerFromDB))
}

export async function getCustomer(id: string): Promise<ServiceResult<Customer>> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return fail('NOT_FOUND', `Customer ${id} not found`, error)
  return ok(mapCustomerFromDB(data))
}

// ─────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────

export async function createCustomer(
  customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<ServiceResult<Customer>> {
  const user = await getCurrentUser()
  if (!user) return fail('UNAUTHORIZED', 'Not authenticated')

  const insert: CustomerInsert = {
    user_id: user.id,
    salutation: customer.salutation as CustomerInsert['salutation'],
    first_name: customer.firstName,
    last_name: customer.lastName,
    company_name: customer.companyName,
    street: customer.address.street,
    house_number: customer.address.houseNumber,
    postal_code: customer.address.postalCode,
    city: customer.address.city,
    country: customer.address.country || 'Österreich',
    phone: customer.contact.phone,
    mobile: customer.contact.mobile,
    email: customer.contact.email,
    alternative_email: customer.contact.alternativeEmail,
    tax_id: customer.taxId,
    payment_terms: customer.paymentTerms ?? 14,
    notes: customer.notes,
  }

  const { data, error } = await supabase
    .from('customers')
    .insert(insert)
    .select()
    .single()

  if (error) return fail('INTERNAL', error.message, error)
  return ok(mapCustomerFromDB(data))
}

export async function updateCustomer(
  id: string,
  customer: Partial<Customer>,
): Promise<ServiceResult<Customer>> {
  const update: CustomerUpdate = {
    salutation: customer.salutation as CustomerUpdate['salutation'],
    first_name: customer.firstName,
    last_name: customer.lastName,
    company_name: customer.companyName,
    street: customer.address?.street,
    house_number: customer.address?.houseNumber,
    postal_code: customer.address?.postalCode,
    city: customer.address?.city,
    country: customer.address?.country,
    phone: customer.contact?.phone,
    mobile: customer.contact?.mobile,
    email: customer.contact?.email,
    alternative_email: customer.contact?.alternativeEmail,
    tax_id: customer.taxId,
    payment_terms: customer.paymentTerms,
    notes: customer.notes,
  }

  const { data, error } = await supabase
    .from('customers')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return fail('INTERNAL', error.message, error)
  return ok(mapCustomerFromDB(data))
}

export async function deleteCustomer(id: string): Promise<ServiceResult<void>> {
  const { error } = await supabase.from('customers').delete().eq('id', id)

  if (error) return fail('INTERNAL', error.message, error)
  return ok(undefined)
}

// ─────────────────────────────────────────────────────
// Mapping
// ─────────────────────────────────────────────────────

function mapCustomerFromDB(row: CustomerRow): Customer {
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    firstName: row.first_name,
    lastName: row.last_name,
    companyName: row.company_name ?? undefined,
    salutation: row.salutation ?? undefined,
    address: {
      street: row.street,
      houseNumber: row.house_number ?? undefined,
      postalCode: row.postal_code,
      city: row.city,
      country: row.country ?? undefined,
    },
    contact: {
      phone: row.phone,
      mobile: row.mobile ?? undefined,
      email: row.email,
      alternativeEmail: row.alternative_email ?? undefined,
    },
    taxId: row.tax_id ?? undefined,
    paymentTerms: row.payment_terms ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  }
}
