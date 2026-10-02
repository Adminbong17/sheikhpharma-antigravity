ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS carrybee_client_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS carrybee_client_secret text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS carrybee_client_context text DEFAULT NULL;