ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS pathao_client_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pathao_client_secret text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pathao_username text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pathao_password text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pathao_store_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pathao_base_url text DEFAULT 'https://api-hermes.pathao.com';