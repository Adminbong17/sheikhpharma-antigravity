
-- Add Pathao credentials to site_settings
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS pathao_client_id text,
  ADD COLUMN IF NOT EXISTS pathao_client_secret text,
  ADD COLUMN IF NOT EXISTS pathao_username text,
  ADD COLUMN IF NOT EXISTS pathao_password text,
  ADD COLUMN IF NOT EXISTS pathao_store_id text,
  ADD COLUMN IF NOT EXISTS pathao_base_url text DEFAULT 'https://api-hermes.pathao.com';

-- Add Pathao tracking fields to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pathao_consignment_id text,
  ADD COLUMN IF NOT EXISTS pathao_status text;
