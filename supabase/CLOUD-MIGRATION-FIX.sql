-- Cloud development migration bundle.
-- Source migrations: 20261028000010_family_encryption_pgcrypto.sql,
--                    20261028000011_family_encryption_real.sql
-- Run only against the intended Cloud development project.
BEGIN;

-- Source: 20261028000010_family_encryption_pgcrypto.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ADD COLUMN IF NOT EXISTS leaves an existing column unchanged. If
-- encrypted_content already exists with a non-BYTEA type, stop for manual
-- intervention; do not auto-cast or rewrite existing data.
ALTER TABLE public.records
  ADD COLUMN IF NOT EXISTS encrypted_content BYTEA;

COMMENT ON COLUMN public.records.encrypted_content IS
  'Reserved for sensitive content encrypted at rest; the application layer must decrypt it. This column does not encrypt data or manage keys by itself.';

-- Source: 20261028000011_family_encryption_real.sql
CREATE OR REPLACE FUNCTION public.encrypt_private_content(
  p_plaintext text,
  p_passphrase text
)
RETURNS bytea
LANGUAGE sql
STRICT
VOLATILE
SECURITY INVOKER
SET search_path = pg_catalog, extensions, public
AS $$
  SELECT pgp_sym_encrypt(p_plaintext, p_passphrase, 'cipher-algo=aes256');
$$;

CREATE OR REPLACE FUNCTION public.decrypt_private_content(
  p_ciphertext bytea,
  p_passphrase text
)
RETURNS text
LANGUAGE sql
STRICT
VOLATILE
SECURITY INVOKER
SET search_path = pg_catalog, extensions, public
AS $$
  SELECT pgp_sym_decrypt(p_ciphertext, p_passphrase);
$$;

REVOKE ALL ON FUNCTION public.encrypt_private_content(text, text)
  FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.decrypt_private_content(bytea, text)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.encrypt_private_content(text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_private_content(bytea, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_private_record_plaintext()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF current_user = 'authenticated'
    AND NEW.visibility = 'private'
    AND NEW.content IS NOT NULL THEN
    RAISE EXCEPTION 'Private record content must be encrypted before storage'
      USING ERRCODE = '23514';
  END IF;

  IF current_user = 'authenticated'
    AND NEW.visibility <> 'private'
    AND NEW.encrypted_content IS NOT NULL THEN
    RAISE EXCEPTION 'Encrypted content is only allowed for private records'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_records_guard_private_plaintext ON public.records;
CREATE TRIGGER trg_records_guard_private_plaintext
  BEFORE INSERT OR UPDATE OF content, visibility, encrypted_content
  ON public.records
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_private_record_plaintext();

COMMENT ON COLUMN public.records.encrypted_content IS
  'pgcrypto PGP-encrypted private record content; the application decrypts it after RLS-authorized reads. Titles and record metadata remain plaintext.';

REVOKE ALL ON FUNCTION public.guard_private_record_plaintext() FROM PUBLIC;

COMMIT;
