ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS cod_delivery_charge numeric NOT NULL DEFAULT 0;