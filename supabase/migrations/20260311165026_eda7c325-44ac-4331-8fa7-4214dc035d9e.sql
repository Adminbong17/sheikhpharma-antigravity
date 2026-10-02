ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS office_phone text DEFAULT NULL;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS office_email text DEFAULT NULL;