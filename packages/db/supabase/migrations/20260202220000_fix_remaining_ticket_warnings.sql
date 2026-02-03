-- Fix last 6 Advisor warnings: ticket_messages_*_scoped and tickets_*_scoped
-- 1. auth_rls_initplan: these _scoped policies use auth.uid()/auth.jwt() per row
-- 2. multiple_permissive: _scoped duplicates tickets_employee_all and employee_*_ticket_messages
-- Solution: drop _scoped (tickets_employee_all and employee_insert/employee_read already cover access)

-- ticket_messages: drop _scoped and _member/_rules (keep employee_insert_ticket_messages, employee_read_ticket_messages + customer_*)
DROP POLICY IF EXISTS "ticket_messages_delete_scoped" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_insert_scoped" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_select_scoped" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_update_scoped" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_delete_member" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_insert_rules" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_select_member" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_update_member" ON public.ticket_messages;

-- tickets: drop _scoped (keep tickets_employee_all + customer_read_tickets, customer_insert_tickets)
DROP POLICY IF EXISTS "tickets_delete_scoped" ON public.tickets;
DROP POLICY IF EXISTS "tickets_insert_scoped" ON public.tickets;
DROP POLICY IF EXISTS "tickets_select_scoped" ON public.tickets;
DROP POLICY IF EXISTS "tickets_update_scoped" ON public.tickets;
