ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS carrybee_consignment_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS carrybee_status text DEFAULT NULL;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS carrybee_store_id text DEFAULT NULL;