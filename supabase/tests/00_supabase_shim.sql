-- Shim mínimo do ambiente Supabase, para validar as migrações contra um
-- Postgres local sem precisar de provisionar um projecto na cloud.
--
-- Reproduz o que o Supabase fornece: schemas `auth` e `storage`, a função
-- `auth.uid()` que lê a claim do JWT, as roles do PostgREST e os grants por
-- omissão. Não faz parte do schema da aplicação — não aplicar em produção.

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  raw_user_meta_data JSONB DEFAULT '{}'::jsonb
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE TABLE storage.buckets (
  id TEXT PRIMARY KEY, name TEXT, public BOOLEAN DEFAULT false,
  file_size_limit BIGINT, allowed_mime_types TEXT[]
);
CREATE TABLE storage.objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id TEXT REFERENCES storage.buckets(id), name TEXT, owner UUID
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION storage.foldername(name TEXT) RETURNS TEXT[]
LANGUAGE plpgsql AS $$
DECLARE p TEXT[]; BEGIN p := string_to_array(name, '/'); RETURN p[1:array_length(p,1)-1]; END;
$$;

-- O PostgREST concede privilégios de tabela às roles; o RLS é a camada seguinte.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT ALL ON storage.objects, storage.buckets TO anon, authenticated, service_role;
