-- Lieferanten: Innendienst/Außendienst Ansprechpartner (Name, Telefon, E-Mail) + Adresse als Einzelfelder

ALTER TABLE "public"."suppliers"
  ADD COLUMN IF NOT EXISTS "contact_person_internal" text,
  ADD COLUMN IF NOT EXISTS "contact_person_internal_phone" text,
  ADD COLUMN IF NOT EXISTS "contact_person_internal_email" text,
  ADD COLUMN IF NOT EXISTS "contact_person_external" text,
  ADD COLUMN IF NOT EXISTS "contact_person_external_phone" text,
  ADD COLUMN IF NOT EXISTS "contact_person_external_email" text,
  ADD COLUMN IF NOT EXISTS "street" text,
  ADD COLUMN IF NOT EXISTS "house_number" text,
  ADD COLUMN IF NOT EXISTS "postal_code" text,
  ADD COLUMN IF NOT EXISTS "city" text,
  ADD COLUMN IF NOT EXISTS "country" text;

COMMENT ON COLUMN "public"."suppliers"."contact_person_internal" IS 'Innendienst Ansprechpartner (Name)';
COMMENT ON COLUMN "public"."suppliers"."contact_person_external" IS 'Außendienst Ansprechpartner (Name)';
