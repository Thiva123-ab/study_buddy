ALTER TABLE public.papers ALTER COLUMN document_id DROP NOT NULL;
ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS source_document_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];