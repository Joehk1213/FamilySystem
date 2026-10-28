CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.records
  ADD COLUMN IF NOT EXISTS encrypted_content BYTEA;

COMMENT ON COLUMN public.records.encrypted_content IS
  'Reserved for sensitive content encrypted at rest; the application layer must decrypt it. This column does not encrypt data or manage keys by itself.';
