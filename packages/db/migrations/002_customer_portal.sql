-- ============================================
-- Customer Portal Schema Additions
-- ============================================
-- Adds access_code, document uploaded_by and ticket tables.

-- 1) projects.access_code (for customer login)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS access_code text;

CREATE UNIQUE INDEX IF NOT EXISTS projects_access_code_key
  ON projects(access_code);

-- Optional backfill for existing projects (run manually if needed)
-- UPDATE projects
-- SET access_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
-- WHERE access_code IS NULL;

-- 2) documents.uploaded_by (customer uploads)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS uploaded_by uuid;

-- Backfill uploaded_by from user_id where possible
UPDATE documents
SET uploaded_by = user_id
WHERE uploaded_by IS NULL AND user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS documents_uploaded_by_idx
  ON documents(uploaded_by);

-- 3) tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'OFFEN',
  type text NOT NULL DEFAULT 'KUNDENANFRAGE',
  created_by uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tickets_project_id_idx
  ON tickets(project_id);

CREATE INDEX IF NOT EXISTS tickets_created_by_idx
  ON tickets(created_by);

-- 4) ticket_messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  message text NOT NULL,
  file_url text,
  is_customer boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_messages_ticket_id_idx
  ON ticket_messages(ticket_id);

CREATE INDEX IF NOT EXISTS ticket_messages_author_id_idx
  ON ticket_messages(author_id);
