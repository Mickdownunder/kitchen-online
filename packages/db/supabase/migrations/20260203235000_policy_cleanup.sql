-- 1. ALLES ALTEN REGELN LÖSCHEN (Hausputz)
-- Wir entfernen alle Policies von den wichtigen Tabellen, um Konflikte zu vermeiden.
DROP POLICY IF EXISTS "Admin darf alles" ON public.projects;
DROP POLICY IF EXISTS "Admin darf alles Tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admin darf alles Customers" ON public.customers;
DROP POLICY IF EXISTS "Kunden sehen eigene Tickets" ON public.tickets;
DROP POLICY IF EXISTS "Kunden sehen Ticket Nachrichten" ON public.ticket_messages;
-- (Falls noch andere alte Policies da sind, werden sie hiermit unwirksam gemacht, 
-- indem wir RLS kurz aus- und wieder einschalten)

ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- 2. ADMIN REGEL (Für dich und dein Team)
-- Damit du im Dashboard immer alles siehst.
-- Wir nutzen hier eine einfache Prüfung: Wenn du eingeloggt bist UND die richtige Email hast.
-- (Ersetze 'deine@email.com' später mit deiner echten Admin-Email oder wir nutzen UUIDs)

CREATE POLICY "Admins dürfen alles sehen" ON public.projects
FOR ALL TO authenticated
USING (auth.jwt() ->> 'email' IN ('michaellabitzke@googlemail.com', 'admin@kitchen-online.at')); 
-- Habe deine Email hier als Beispiel eingefügt, passe sie an falls nötig!

CREATE POLICY "Admins dürfen Tickets sehen" ON public.tickets
FOR ALL TO authenticated
USING (auth.jwt() ->> 'email' IN ('michaellabitzke@googlemail.com', 'admin@kitchen-online.at'));

CREATE POLICY "Admins dürfen Customers sehen" ON public.customers
FOR ALL TO authenticated
USING (auth.jwt() ->> 'email' IN ('michaellabitzke@googlemail.com', 'admin@kitchen-online.at'));


-- 3. KUNDEN REGELN (Das, was kaputt war)
-- Ein Kunde darf nur SEINE Tickets sehen.

CREATE POLICY "Kunde sieht eigene Tickets" ON public.tickets
FOR SELECT TO authenticated
USING (
    customer_id = auth.uid() 
);

CREATE POLICY "Kunde darf Tickets erstellen" ON public.tickets
FOR INSERT TO authenticated
WITH CHECK (
    customer_id = auth.uid()
);

-- Damit Kunden Nachrichten sehen können, die zu ihren Tickets gehören
CREATE POLICY "Kunde sieht Nachrichten zu eigenen Tickets" ON public.ticket_messages
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.tickets
        WHERE tickets.id = ticket_messages.ticket_id
        AND tickets.customer_id = auth.uid()
    )
);