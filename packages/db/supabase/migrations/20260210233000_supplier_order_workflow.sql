-- Supplier order workflow
-- Zweck: End-to-end Bestellprozess pro Lieferant + Auftrag, inkl. AB, Lieferschein-Zuordnung,
-- Versand-Audit und idempotentem Wareneingang.

CREATE TABLE IF NOT EXISTS "public"."supplier_orders" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "supplier_id" uuid NOT NULL,
  "order_number" text NOT NULL,
  "status" text DEFAULT 'draft'::text NOT NULL,
  "delivery_calendar_week" text,
  "installation_reference_date" date,
  "created_by_type" text DEFAULT 'user'::text NOT NULL,
  "approved_by_user_id" uuid,
  "approved_at" timestamptz,
  "sent_to_email" text,
  "sent_at" timestamptz,
  "booked_at" timestamptz,
  "idempotency_key" text,
  "template_version" text DEFAULT 'v1'::text NOT NULL,
  "template_snapshot" jsonb,
  "ab_number" text,
  "ab_confirmed_delivery_date" date,
  "ab_deviations" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "ab_received_at" timestamptz,
  "supplier_delivery_note_id" uuid,
  "goods_receipt_id" uuid,
  "notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "supplier_orders_created_by_type_check" CHECK (("created_by_type" = ANY (ARRAY['user'::text, 'ai'::text]))),
  CONSTRAINT "supplier_orders_status_check" CHECK (("status" = ANY (ARRAY[
    'draft'::text,
    'pending_approval'::text,
    'sent'::text,
    'ab_received'::text,
    'delivery_note_received'::text,
    'goods_receipt_open'::text,
    'goods_receipt_booked'::text,
    'ready_for_installation'::text,
    'cancelled'::text
  ])))
);

ALTER TABLE "public"."supplier_orders" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."supplier_order_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "supplier_order_id" uuid NOT NULL,
  "invoice_item_id" uuid,
  "article_id" uuid,
  "position_number" integer DEFAULT 1 NOT NULL,
  "description" text NOT NULL,
  "model_number" text,
  "manufacturer" text,
  "quantity" numeric(10,2) NOT NULL,
  "quantity_confirmed" numeric(10,2),
  "unit" text DEFAULT 'Stk'::text NOT NULL,
  "expected_delivery_date" date,
  "notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "supplier_order_items_quantity_check" CHECK (("quantity" > (0)::numeric)),
  CONSTRAINT "supplier_order_items_quantity_confirmed_check" CHECK ((("quantity_confirmed" IS NULL) OR ("quantity_confirmed" >= (0)::numeric)))
);

ALTER TABLE "public"."supplier_order_items" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."supplier_order_dispatch_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "supplier_order_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "sent_by_type" text DEFAULT 'user'::text NOT NULL,
  "to_email" text NOT NULL,
  "cc_emails" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "subject" text NOT NULL,
  "template_version" text DEFAULT 'v1'::text NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "message_id" text,
  "idempotency_key" text,
  "sent_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "supplier_order_dispatch_logs_sent_by_type_check" CHECK (("sent_by_type" = ANY (ARRAY['user'::text, 'ai'::text])))
);

ALTER TABLE "public"."supplier_order_dispatch_logs" OWNER TO "postgres";

ALTER TABLE "public"."goods_receipts"
  ADD COLUMN IF NOT EXISTS "idempotency_key" text,
  ADD COLUMN IF NOT EXISTS "supplier_order_id" uuid;

ALTER TABLE "public"."delivery_notes"
  ADD COLUMN IF NOT EXISTS "supplier_order_id" uuid;

ALTER TABLE ONLY "public"."supplier_orders"
  ADD CONSTRAINT "supplier_orders_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."supplier_order_items"
  ADD CONSTRAINT "supplier_order_items_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."supplier_order_dispatch_logs"
  ADD CONSTRAINT "supplier_order_dispatch_logs_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."supplier_orders"
  ADD CONSTRAINT "supplier_orders_user_project_supplier_key" UNIQUE ("user_id", "project_id", "supplier_id");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_supplier_orders_user_idempotency_key"
  ON "public"."supplier_orders" USING btree ("user_id", "idempotency_key")
  WHERE ("idempotency_key" IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_goods_receipts_user_idempotency_key"
  ON "public"."goods_receipts" USING btree ("user_id", "idempotency_key")
  WHERE ("idempotency_key" IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_supplier_order_dispatch_logs_order_idempotency"
  ON "public"."supplier_order_dispatch_logs" USING btree ("supplier_order_id", "idempotency_key")
  WHERE ("idempotency_key" IS NOT NULL);

CREATE INDEX IF NOT EXISTS "idx_supplier_orders_status" ON "public"."supplier_orders" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_supplier_orders_project" ON "public"."supplier_orders" USING btree ("project_id");
CREATE INDEX IF NOT EXISTS "idx_supplier_orders_supplier" ON "public"."supplier_orders" USING btree ("supplier_id");
CREATE INDEX IF NOT EXISTS "idx_supplier_order_items_order" ON "public"."supplier_order_items" USING btree ("supplier_order_id");
CREATE INDEX IF NOT EXISTS "idx_supplier_order_dispatch_logs_order" ON "public"."supplier_order_dispatch_logs" USING btree ("supplier_order_id");
CREATE INDEX IF NOT EXISTS "idx_goods_receipts_supplier_order_id" ON "public"."goods_receipts" USING btree ("supplier_order_id");
CREATE INDEX IF NOT EXISTS "idx_delivery_notes_supplier_order_id" ON "public"."delivery_notes" USING btree ("supplier_order_id");

ALTER TABLE ONLY "public"."supplier_orders"
  ADD CONSTRAINT "supplier_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."supplier_orders"
  ADD CONSTRAINT "supplier_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."supplier_orders"
  ADD CONSTRAINT "supplier_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."supplier_orders"
  ADD CONSTRAINT "supplier_orders_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."supplier_orders"
  ADD CONSTRAINT "supplier_orders_supplier_delivery_note_id_fkey" FOREIGN KEY ("supplier_delivery_note_id") REFERENCES "public"."delivery_notes"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."supplier_orders"
  ADD CONSTRAINT "supplier_orders_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "public"."goods_receipts"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."supplier_order_items"
  ADD CONSTRAINT "supplier_order_items_supplier_order_id_fkey" FOREIGN KEY ("supplier_order_id") REFERENCES "public"."supplier_orders"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."supplier_order_items"
  ADD CONSTRAINT "supplier_order_items_invoice_item_id_fkey" FOREIGN KEY ("invoice_item_id") REFERENCES "public"."invoice_items"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."supplier_order_items"
  ADD CONSTRAINT "supplier_order_items_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."supplier_order_dispatch_logs"
  ADD CONSTRAINT "supplier_order_dispatch_logs_supplier_order_id_fkey" FOREIGN KEY ("supplier_order_id") REFERENCES "public"."supplier_orders"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."supplier_order_dispatch_logs"
  ADD CONSTRAINT "supplier_order_dispatch_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."goods_receipts"
  ADD CONSTRAINT "goods_receipts_supplier_order_id_fkey" FOREIGN KEY ("supplier_order_id") REFERENCES "public"."supplier_orders"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."delivery_notes"
  ADD CONSTRAINT "delivery_notes_supplier_order_id_fkey" FOREIGN KEY ("supplier_order_id") REFERENCES "public"."supplier_orders"("id") ON DELETE SET NULL;

CREATE OR REPLACE TRIGGER "update_supplier_orders_updated_at"
  BEFORE UPDATE ON "public"."supplier_orders"
  FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_supplier_order_items_updated_at"
  BEFORE UPDATE ON "public"."supplier_order_items"
  FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

ALTER TABLE "public"."supplier_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."supplier_order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."supplier_order_dispatch_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_orders_select_own"
  ON "public"."supplier_orders"
  FOR SELECT TO "authenticated"
  USING (("user_id" = (SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "supplier_orders_insert_own"
  ON "public"."supplier_orders"
  FOR INSERT TO "authenticated"
  WITH CHECK (("user_id" = (SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "supplier_orders_update_own"
  ON "public"."supplier_orders"
  FOR UPDATE TO "authenticated"
  USING (("user_id" = (SELECT "auth"."uid"() AS "uid")))
  WITH CHECK (("user_id" = (SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "supplier_orders_delete_own"
  ON "public"."supplier_orders"
  FOR DELETE TO "authenticated"
  USING (("user_id" = (SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "supplier_order_items_select_own"
  ON "public"."supplier_order_items"
  FOR SELECT TO "authenticated"
  USING ((EXISTS (
    SELECT 1
    FROM "public"."supplier_orders" so
    WHERE so."id" = "supplier_order_items"."supplier_order_id"
      AND so."user_id" = (SELECT "auth"."uid"() AS "uid")
  )));

CREATE POLICY "supplier_order_items_insert_own"
  ON "public"."supplier_order_items"
  FOR INSERT TO "authenticated"
  WITH CHECK ((EXISTS (
    SELECT 1
    FROM "public"."supplier_orders" so
    WHERE so."id" = "supplier_order_items"."supplier_order_id"
      AND so."user_id" = (SELECT "auth"."uid"() AS "uid")
  )));

CREATE POLICY "supplier_order_items_update_own"
  ON "public"."supplier_order_items"
  FOR UPDATE TO "authenticated"
  USING ((EXISTS (
    SELECT 1
    FROM "public"."supplier_orders" so
    WHERE so."id" = "supplier_order_items"."supplier_order_id"
      AND so."user_id" = (SELECT "auth"."uid"() AS "uid")
  )))
  WITH CHECK ((EXISTS (
    SELECT 1
    FROM "public"."supplier_orders" so
    WHERE so."id" = "supplier_order_items"."supplier_order_id"
      AND so."user_id" = (SELECT "auth"."uid"() AS "uid")
  )));

CREATE POLICY "supplier_order_items_delete_own"
  ON "public"."supplier_order_items"
  FOR DELETE TO "authenticated"
  USING ((EXISTS (
    SELECT 1
    FROM "public"."supplier_orders" so
    WHERE so."id" = "supplier_order_items"."supplier_order_id"
      AND so."user_id" = (SELECT "auth"."uid"() AS "uid")
  )));

CREATE POLICY "supplier_order_dispatch_logs_select_own"
  ON "public"."supplier_order_dispatch_logs"
  FOR SELECT TO "authenticated"
  USING (("user_id" = (SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "supplier_order_dispatch_logs_insert_own"
  ON "public"."supplier_order_dispatch_logs"
  FOR INSERT TO "authenticated"
  WITH CHECK (("user_id" = (SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "supplier_order_dispatch_logs_update_own"
  ON "public"."supplier_order_dispatch_logs"
  FOR UPDATE TO "authenticated"
  USING (("user_id" = (SELECT "auth"."uid"() AS "uid")))
  WITH CHECK (("user_id" = (SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "supplier_order_dispatch_logs_delete_own"
  ON "public"."supplier_order_dispatch_logs"
  FOR DELETE TO "authenticated"
  USING (("user_id" = (SELECT "auth"."uid"() AS "uid")));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."supplier_orders" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."supplier_order_items" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."supplier_order_dispatch_logs" TO "authenticated";

COMMENT ON TABLE "public"."supplier_orders" IS 'Lieferanten-Bestellungen pro Auftrag+Lieferant mit AB/Lieferschein/WE-Workflow und Audit';
COMMENT ON TABLE "public"."supplier_order_items" IS 'Aggregierte Bestellpositionen pro Lieferanten-Bestellung';
COMMENT ON TABLE "public"."supplier_order_dispatch_logs" IS 'Versandprotokoll für Lieferanten-Bestellungen inkl. Template-Version und Payload';
COMMENT ON COLUMN "public"."supplier_orders"."ab_deviations" IS 'Strukturierte Abweichungen aus AB (z.B. Position/Menge/Termin)';
COMMENT ON COLUMN "public"."goods_receipts"."idempotency_key" IS 'Idempotenzschlüssel für retry-sichere WE-Buchung';
COMMENT ON COLUMN "public"."goods_receipts"."supplier_order_id" IS 'Optionale Zuordnung zu Lieferanten-Bestellung';
COMMENT ON COLUMN "public"."delivery_notes"."supplier_order_id" IS 'Optionale Zuordnung zu Lieferanten-Bestellung';
