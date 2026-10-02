ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS steadfast_api_key text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS steadfast_secret_key text DEFAULT NULL;