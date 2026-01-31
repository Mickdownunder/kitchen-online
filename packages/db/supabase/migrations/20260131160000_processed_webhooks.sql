-- Migration: Create processed_webhooks table for Cal.com webhook deduplication
-- This prevents duplicate processing when Cal.com sends the same webhook multiple times

CREATE TABLE IF NOT EXISTS public.processed_webhooks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id text NOT NULL UNIQUE,
    processed_at timestamp with time zone DEFAULT now() NOT NULL,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_processed_webhooks_event_id ON public.processed_webhooks(event_id);

-- Auto-cleanup: Remove entries older than 30 days (optional, can be run via cron)
COMMENT ON TABLE public.processed_webhooks IS 'Stores processed Cal.com webhook event IDs to prevent duplicate processing';

-- RLS: Only service role can access this table (webhooks use service role key)
ALTER TABLE public.processed_webhooks ENABLE ROW LEVEL SECURITY;

-- No RLS policies = only service role can access (which is what we want for webhooks)
