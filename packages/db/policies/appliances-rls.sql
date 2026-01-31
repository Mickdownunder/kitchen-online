-- ============================================
-- Project Appliances RLS Policies
-- ============================================
-- Customers can view their project's appliances
-- Employees can manage appliances in their company

-- ============================================
-- CUSTOMER ACCESS (Read-Only)
-- ============================================

-- Customer can view appliances for their project
CREATE POLICY "customer_read_appliances" ON project_appliances
FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'customer'
  AND project_id = (auth.jwt() -> 'app_metadata' ->> 'project_id')::uuid
);

-- ============================================
-- EMPLOYEE ACCESS (Full CRUD)
-- ============================================

-- Employee can view all appliances in their company
CREATE POLICY "employee_read_appliances" ON project_appliances
FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'customer'
  AND company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Employee can insert appliances for projects in their company
CREATE POLICY "employee_insert_appliances" ON project_appliances
FOR INSERT TO authenticated
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'customer'
  AND company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Employee can update appliances in their company
CREATE POLICY "employee_update_appliances" ON project_appliances
FOR UPDATE TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'customer'
  AND company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'customer'
  AND company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Employee can delete appliances in their company
CREATE POLICY "employee_delete_appliances" ON project_appliances
FOR DELETE TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'customer'
  AND company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);
