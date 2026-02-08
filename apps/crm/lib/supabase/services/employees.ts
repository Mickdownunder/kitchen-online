/**
 * Employee CRUD operations.
 */

import { supabase } from '../client'
import { Employee } from '@/types'
import { getCompanySettings } from './company'
import { audit, logAudit } from '@/lib/utils/auditLogger'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEmployeeFromDB(db: Record<string, any>): Employee {
  return {
    id: db.id,
    companyId: db.company_id,
    firstName: db.first_name,
    lastName: db.last_name,
    email: db.email,
    phone: db.phone,
    role: db.role,
    department: db.department,
    isActive: db.is_active,
    commissionRate: db.commission_rate ? parseFloat(db.commission_rate) : undefined,
    notes: db.notes,
    userId: db.user_id,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}

export async function getEmployees(companyId?: string): Promise<Employee[]> {
  // If companyId is provided, use it directly
  if (companyId) {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('company_id', companyId)
      .order('last_name')

    if (error) throw error
    return (data || []).map(mapEmployeeFromDB)
  }

  // Otherwise, get employees for the current user's company
  const settings = await getCompanySettings()
  if (!settings?.id) {
    return []
  }

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('company_id', settings.id)
    .order('last_name')

  if (error) throw error
  return (data || []).map(mapEmployeeFromDB)
}

export async function saveEmployee(employee: Partial<Employee>): Promise<Employee> {
  const dbData = {
    company_id: employee.companyId,
    first_name: employee.firstName,
    last_name: employee.lastName,
    email: employee.email,
    phone: employee.phone,
    role: employee.role,
    department: employee.department,
    is_active: employee.isActive,
    commission_rate: employee.commissionRate,
    notes: employee.notes,
    user_id: employee.userId,
    updated_at: new Date().toISOString(),
  }

  if (employee.id) {
    const { data, error } = await supabase
      .from('employees')
      .update(dbData)
      .eq('id', employee.id)
      .select()
      .single()
    if (error) throw error

    const savedEmployee = mapEmployeeFromDB(data)

    // Audit logging for employee update
    audit.userRoleChanged(employee.id, {}, {
      name: `${savedEmployee.firstName} ${savedEmployee.lastName}`,
      role: savedEmployee.role,
      isActive: savedEmployee.isActive,
    })

    return savedEmployee
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.from('employees').insert(dbData as any).select().single()
    if (error) throw error

    const savedEmployee = mapEmployeeFromDB(data)

    // Audit logging for new employee
    logAudit({
      action: 'employee.created',
      entityType: 'employee',
      entityId: savedEmployee.id,
      changes: {
        after: {
          name: `${savedEmployee.firstName} ${savedEmployee.lastName}`,
          role: savedEmployee.role,
          email: savedEmployee.email,
        },
      },
    })

    return savedEmployee
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from('employees').delete().eq('id', id)
  if (error) throw error
}
