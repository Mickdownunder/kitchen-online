import { supabase } from '../client'
import { Customer } from '@/types'
import { getCurrentUser } from './auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CustomerRow = Record<string, any>

export async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(mapCustomerFromDB)
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).single()

  if (error) throw error
  return data ? mapCustomerFromDB(data) : null
}

export async function createCustomer(
  customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Customer> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from('customers')
    .insert({
      user_id: user.id,
      salutation: customer.salutation,
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
      payment_terms: customer.paymentTerms || 14,
      notes: customer.notes,
    } as any)
    .select()
    .single()

  if (error) throw error
  return mapCustomerFromDB(data)
}

export async function updateCustomer(id: string, customer: Partial<Customer>): Promise<Customer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from('customers')
    .update({
      salutation: customer.salutation,
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
    } as any)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return mapCustomerFromDB(data)
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from('customers').delete().eq('id', id)

  if (error) throw error
}

function mapCustomerFromDB(dbCustomer: CustomerRow): Customer {
  return {
    id: dbCustomer.id,
    userId: dbCustomer.user_id,
    firstName: dbCustomer.first_name,
    lastName: dbCustomer.last_name,
    companyName: dbCustomer.company_name,
    salutation: dbCustomer.salutation,
    address: {
      street: dbCustomer.street,
      houseNumber: dbCustomer.house_number,
      postalCode: dbCustomer.postal_code,
      city: dbCustomer.city,
      country: dbCustomer.country,
    },
    contact: {
      phone: dbCustomer.phone,
      mobile: dbCustomer.mobile,
      email: dbCustomer.email,
      alternativeEmail: dbCustomer.alternative_email,
    },
    taxId: dbCustomer.tax_id,
    paymentTerms: dbCustomer.payment_terms,
    notes: dbCustomer.notes,
    createdAt: dbCustomer.created_at,
    updatedAt: dbCustomer.updated_at,
  }
}
