import type { ServerHandler } from '../serverHandlers'
import { findProject, appendProjectNote } from '../serverHandlers'

export const handleCreateComplaint: ServerHandler = async (args, supabase, userId) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  const { data: complaint, error } = await supabase
    .from('complaints')
    .insert({
      user_id: userId,
      project_id: project.id,
      description: args.description as string,
      status: 'reported',
      priority: (args.priority as string) || 'medium',
      reported_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) return { result: `❌ Fehler: ${error.message}` }

  await appendProjectNote(supabase, project.id, `Reklamation erfasst: ${args.description}`)
  return { result: `✅ Reklamation erfasst (ID: ${complaint.id}).`, updatedProjectIds: [project.id] }
}

export const handleUpdateComplaintStatus: ServerHandler = async (args, supabase) => {
  const statusMap: Record<string, string> = {
    Open: 'reported',
    InProgress: 'ab_confirmed',
    Resolved: 'resolved',
  }

  const statusArg = args.status as string
  const newStatus = statusMap[statusArg] || statusArg

  const { error } = await supabase
    .from('complaints')
    .update({ status: newStatus })
    .eq('id', args.complaintId as string)

  if (error) return { result: `❌ Fehler: ${error.message}` }

  const project = await findProject(supabase, args.projectId as string)
  if (project) {
    await appendProjectNote(supabase, project.id, `Reklamationsstatus auf "${newStatus}" gesetzt.`)
  }

  return { result: `✅ Reklamationsstatus auf "${newStatus}" gesetzt.`, updatedProjectIds: project ? [project.id] : [] }
}

export const handleCreateArticle: ServerHandler = async (args, supabase, userId) => {
  const name = args.name as string
  if (!name?.trim()) return { result: '❌ Artikelname fehlt.' }

  const insert: Record<string, unknown> = {
    user_id: userId,
    name,
    sku: (args.articleNumber as string) || `ART-${Date.now().toString().slice(-6)}`,
    description: (args.description as string) || null,
    category: (args.category as string) || 'Other',
    unit: (args.unit as string) || 'Stk',
    default_purchase_price: (args.purchasePrice as number) || 0,
    default_sale_price: (args.sellingPrice as number) || 0,
    tax_rate: (args.taxRate as number) || 20,
    manufacturer: (args.supplier as string) || null,
    is_active: true,
  }
  const supplierId = args.supplierId as string | undefined
  if (supplierId) insert.supplier_id = supplierId

  const { data: article, error } = await supabase
    .from('articles')
    .insert(insert)
    .select('id, sku')
    .single()

  if (error) return { result: `❌ Fehler: ${error.message}` }
  return { result: `✅ Artikel "${name}" angelegt (SKU: ${article.sku}, ID: ${article.id}).` }
}

export const handleUpdateArticle: ServerHandler = async (args, supabase) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}
  if (args.name) updates.name = args.name
  if (args.articleNumber) updates.sku = args.articleNumber
  if (args.description) updates.description = args.description
  if (args.purchasePrice !== undefined) updates.default_purchase_price = args.purchasePrice
  if (args.sellingPrice !== undefined) updates.default_sale_price = args.sellingPrice
  if (args.taxRate !== undefined) updates.tax_rate = args.taxRate
  if (args.supplier) updates.manufacturer = args.supplier
  if (args.supplierId !== undefined) updates.supplier_id = args.supplierId || null
  if (args.isActive !== undefined) updates.is_active = args.isActive

  const { error } = await supabase.from('articles').update(updates).eq('id', args.articleId as string)
  if (error) return { result: `❌ Fehler: ${error.message}` }
  return { result: `✅ Artikel aktualisiert.` }
}

export const handleCreateCustomer: ServerHandler = async (args, supabase, userId) => {
  const firstName = args.firstName as string
  const lastName = args.lastName as string
  if (!firstName || !lastName) return { result: '❌ Vorname und Nachname sind erforderlich.' }

  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', userId)
    .ilike('first_name', firstName)
    .ilike('last_name', lastName)
    .maybeSingle()

  if (existing) {
    return { result: `⚠️ Kunde "${firstName} ${lastName}" existiert bereits (ID: ${existing.id}).` }
  }

  const address = {
    street: (args.street as string) || '',
    houseNumber: (args.houseNumber as string) || '',
    postalCode: (args.postalCode as string) || '',
    city: (args.city as string) || '',
    country: 'Österreich',
  }
  const contact = {
    phone: (args.phone as string) || '',
    email: (args.email as string) || '',
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .insert({
      user_id: userId,
      first_name: firstName,
      last_name: lastName,
      company_name: (args.companyName as string) || null,
      address,
      contact,
      notes: (args.notes as string) || null,
    })
    .select('id')
    .single()

  if (error) return { result: `❌ Fehler: ${error.message}` }
  return { result: `✅ Kunde "${firstName} ${lastName}" angelegt (ID: ${customer.id}).` }
}

export const handleUpdateCustomer: ServerHandler = async (args, supabase) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}
  if (args.firstName) updates.first_name = args.firstName
  if (args.lastName) updates.last_name = args.lastName
  if (args.companyName) updates.company_name = args.companyName
  if (args.notes) updates.notes = args.notes

  if (args.street || args.houseNumber || args.postalCode || args.city) {
    updates.address = {
      street: (args.street as string) || '',
      houseNumber: (args.houseNumber as string) || '',
      postalCode: (args.postalCode as string) || '',
      city: (args.city as string) || '',
    }
  }
  if (args.phone || args.email) {
    updates.contact = { phone: (args.phone as string) || '', email: (args.email as string) || '' }
  }

  const { error } = await supabase.from('customers').update(updates).eq('id', args.customerId as string)
  if (error) return { result: `❌ Fehler: ${error.message}` }
  return { result: `✅ Kunde aktualisiert.` }
}

export const handleCreateEmployee: ServerHandler = async (args, supabase, userId) => {
  const { data: settings } = await supabase
    .from('company_settings')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!settings) return { result: '❌ Bitte zuerst Firmenstammdaten anlegen.' }

  const firstName = args.firstName as string
  const lastName = args.lastName as string

  const { error } = await supabase.from('employees').insert({
    company_id: settings.id,
    first_name: firstName,
    last_name: lastName,
    email: (args.email as string) || null,
    phone: (args.phone as string) || null,
    role: (args.role as string) || 'other',
    commission_rate: (args.commissionRate as number) || 0,
    is_active: true,
  })

  if (error) return { result: `❌ Fehler: ${error.message}` }
  return { result: `✅ Mitarbeiter "${firstName} ${lastName}" angelegt.` }
}

export const handleUpdateEmployee: ServerHandler = async (args, supabase) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}
  if (args.firstName) updates.first_name = args.firstName
  if (args.lastName) updates.last_name = args.lastName
  if (args.email) updates.email = args.email
  if (args.phone) updates.phone = args.phone
  if (args.role) updates.role = args.role
  if (args.commissionRate !== undefined) updates.commission_rate = args.commissionRate
  if (args.isActive !== undefined) updates.is_active = args.isActive

  const { error } = await supabase.from('employees').update(updates).eq('id', args.employeeId as string)
  if (error) return { result: `❌ Fehler: ${error.message}` }
  return { result: `✅ Mitarbeiter aktualisiert.` }
}

export const handleCreateSupplier: ServerHandler = async (args, supabase, userId) => {
  const { data: settings } = await supabase
    .from('company_settings')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!settings) return { result: '❌ Bitte zuerst Firmenstammdaten anlegen.' }

  const name = (args.name as string)?.trim()
  if (!name) return { result: '❌ Lieferantenname fehlt.' }

  const { data: supplier, error } = await supabase
    .from('suppliers')
    .insert({
      company_id: settings.id,
      name,
      email: (args.email as string) || null,
      order_email: (args.orderEmail as string) || null,
      phone: (args.phone as string) || null,
      contact_person: (args.contactPerson as string) || null,
      address: (args.address as string) || null,
      notes: (args.notes as string) || null,
    })
    .select('id, name')
    .single()

  if (error) return { result: `❌ Fehler: ${error.message}` }
  return { result: `✅ Lieferant "${supplier.name}" angelegt (ID: ${supplier.id}).` }
}

export const handleListSuppliers: ServerHandler = async (args, supabase, userId) => {
  const { data: settings } = await supabase
    .from('company_settings')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!settings) return { result: '❌ Bitte zuerst Firmenstammdaten anlegen. Keine Lieferanten vorhanden.' }

  const { data: rows, error } = await supabase
    .from('suppliers')
    .select('id, name, order_email, email')
    .eq('company_id', settings.id)
    .order('name', { ascending: true })

  if (error) return { result: `❌ Fehler: ${error.message}` }
  if (!rows?.length) return { result: 'Keine Lieferanten angelegt. Nutze createSupplier um einen anzulegen.' }

  const list = rows
    .map((r, i) => `${i + 1}. ${r.name} (ID: ${r.id})${r.order_email || r.email ? ` – ${r.order_email || r.email}` : ''}`)
    .join('\n')
  return { result: `Lieferanten:\n${list}` }
}

export const handleUpdateCompanySettings: ServerHandler = async (args, supabase, userId) => {
  const { data: current } = await supabase
    .from('company_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}
  if (args.companyName) updates.company_name = args.companyName
  if (args.legalForm) updates.legal_form = args.legalForm
  if (args.street) updates.street = args.street
  if (args.houseNumber) updates.house_number = args.houseNumber
  if (args.postalCode) updates.postal_code = args.postalCode
  if (args.city) updates.city = args.city
  if (args.phone) updates.phone = args.phone
  if (args.email) updates.email = args.email
  if (args.website) updates.website = args.website
  if (args.uid) updates.uid = args.uid
  if (args.companyRegisterNumber) updates.company_register_number = args.companyRegisterNumber
  if (args.defaultPaymentTerms) updates.default_payment_terms = args.defaultPaymentTerms

  if (current) {
    const { error } = await supabase.from('company_settings').update(updates).eq('id', current.id)
    if (error) return { result: `❌ Fehler: ${error.message}` }
  }

  return { result: `✅ Firmenstammdaten aktualisiert.` }
}
