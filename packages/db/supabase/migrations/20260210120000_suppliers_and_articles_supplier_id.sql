-- Lieferantenstamm (Suppliers) + Verknüpfung Artikel -> Lieferant
-- Für KI-Bestellungen: Lieferant anlegen, Artikel einem Lieferanten zuordnen

CREATE TABLE IF NOT EXISTS "public"."suppliers" (
  "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
  "company_id" "uuid" NOT NULL,
  "name" "text" NOT NULL,
  "email" "text",
  "order_email" "text",
  "phone" "text",
  "contact_person" "text",
  "address" "text",
  "notes" "text",
  "created_at" "timestamptz" DEFAULT "now"(),
  "updated_at" "timestamptz" DEFAULT "now"(),
  PRIMARY KEY ("id"),
  CONSTRAINT "suppliers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company_settings"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_suppliers_company_id" ON "public"."suppliers" ("company_id");

ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_manage_consolidated" ON "public"."suppliers"
  TO "authenticated"
  USING (("company_id" IN ( SELECT "public"."get_my_company_ids"() AS "get_my_company_ids")))
  WITH CHECK (("company_id" IN ( SELECT "public"."get_my_company_ids"() AS "get_my_company_ids")));

-- Artikel: optionaler Standard-Lieferant
ALTER TABLE "public"."articles"
  ADD COLUMN IF NOT EXISTS "supplier_id" "uuid" REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_articles_supplier_id" ON "public"."articles" ("supplier_id");

COMMENT ON TABLE "public"."suppliers" IS 'Lieferantenstamm für Bestellungen; company-scoped';
COMMENT ON COLUMN "public"."articles"."supplier_id" IS 'Standard-Lieferant für diesen Artikel (optional)';

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."suppliers" TO "authenticated";
