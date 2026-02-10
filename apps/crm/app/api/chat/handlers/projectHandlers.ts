import type { ServerHandler } from '../serverHandlers'
import { findProject, appendProjectNote, timestamp } from '../serverHandlers'
import { roundTo2Decimals } from '@/lib/utils/priceCalculations'

export const handleUpdateProjectDetails: ServerHandler = async (args, supabase) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}
  if (args.newStatus) updates.status = args.newStatus
  if (args.deliveryDate) updates.delivery_date = args.deliveryDate
  if (args.installationDate) updates.installation_date = args.installationDate
  if (args.salespersonName) updates.salesperson_name = args.salespersonName
  if (args.notes !== undefined) {
    updates.notes = `${project.notes || ''}\n${timestamp()}: ${args.notes}`
  }

  const { error } = await supabase.from('projects').update(updates).eq('id', project.id)
  if (error) return { result: `❌ Fehler: ${error.message}` }

  return { result: `✅ Projekt ${project.order_number} aktualisiert.`, updatedProjectIds: [project.id] }
}

export const handleUpdateCustomerInfo: ServerHandler = async (args, supabase) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}
  if (args.customerName) updates.customer_name = args.customerName
  if (args.address) updates.address = args.address
  if (args.phone) updates.phone = args.phone
  if (args.email) updates.email = args.email

  const { error } = await supabase.from('projects').update(updates).eq('id', project.id)
  if (error) return { result: `❌ Fehler: ${error.message}` }

  return { result: `✅ Kundendaten aktualisiert.`, updatedProjectIds: [project.id] }
}

export const handleUpdateWorkflowStatus: ServerHandler = async (args, supabase) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}
  if (args.isMeasured !== undefined) updates.is_measured = args.isMeasured
  if (args.measurementDate) updates.measurement_date = args.measurementDate
  if (args.isOrdered !== undefined) updates.is_ordered = args.isOrdered
  if (args.orderDate) updates.order_date = args.orderDate
  if (args.isInstallationAssigned !== undefined) updates.is_installation_assigned = args.isInstallationAssigned
  if (args.installationDate) updates.installation_date = args.installationDate

  const { error } = await supabase.from('projects').update(updates).eq('id', project.id)
  if (error) return { result: `❌ Fehler: ${error.message}` }

  return { result: `✅ Workflow-Status aktualisiert.`, updatedProjectIds: [project.id] }
}

export const handleAddProjectNote: ServerHandler = async (args, supabase) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  await appendProjectNote(supabase, project.id, args.note as string)
  return { result: `✅ Notiz hinzugefügt.`, updatedProjectIds: [project.id] }
}

export const handleCreateProject: ServerHandler = async (args, supabase, userId) => {
  const customerName = args.customerName as string
  if (!customerName) return { result: '❌ Kundenname fehlt.' }

  const { data: settings } = await supabase
    .from('company_settings')
    .select('id, order_prefix, next_order_number')
    .eq('user_id', userId)
    .maybeSingle()

  let orderNumber = (args.orderNumber as string) || ''
  if (!orderNumber && settings) {
    const prefix = (settings.order_prefix as string) || 'AUF'
    const nextNum = (settings.next_order_number as number) || 1
    const year = new Date().getFullYear()
    orderNumber = `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`
    await supabase
      .from('company_settings')
      .update({ next_order_number: nextNum + 1 })
      .eq('id', settings.id)
  }

  const totalAmount = roundTo2Decimals((args.totalAmount as number) || 0)
  const net = roundTo2Decimals(totalAmount / 1.2)
  const tax = roundTo2Decimals(totalAmount - net)

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      customer_name: customerName,
      address: (args.address as string) || null,
      phone: (args.phone as string) || null,
      email: (args.email as string) || null,
      order_number: orderNumber,
      total_amount: totalAmount,
      net_amount: net,
      tax_amount: tax,
      deposit_amount: 0,
      status: 'Planung',
      salesperson_name: (args.salespersonName as string) || null,
      notes: (args.notes as string) || `${timestamp()}: Projekt angelegt.`,
    })
    .select('id, order_number')
    .single()

  if (error) return { result: `❌ Fehler: ${error.message}` }
  return {
    result: `✅ Projekt "${customerName}" angelegt (${project.order_number}, ID: ${project.id}).`,
    updatedProjectIds: [project.id],
  }
}

export const handleFindProjectsByCriteria: ServerHandler = async (args, supabase) => {
  let query = supabase.from('projects').select('id, customer_name, order_number, status, installation_date')

  if (args.status) query = query.eq('status', args.status)
  if (args.installationDateFrom) query = query.gte('installation_date', args.installationDateFrom)
  if (args.installationDateTo) query = query.lte('installation_date', args.installationDateTo)
  if (args.customerName) query = query.ilike('customer_name', `%${args.customerName}%`)

  const { data: projects, error } = await query
  if (error) return { result: `❌ Fehler: ${error.message}` }

  const list = (projects || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => `${p.customer_name} (${p.order_number})`)
    .join(', ')

  return { result: `✅ ${projects?.length || 0} Projekt(e) gefunden: ${list || 'keine'}` }
}

export const handleExecuteWorkflow: ServerHandler = async (args) => {
  const workflowType = args.workflowType as string
  return {
    result: `⚠️ Workflow "${workflowType}" bitte in einzelne Schritte aufteilen: Zuerst findProjectsByCriteria, dann einzelne Aktionen für jedes Projekt.`,
  }
}
