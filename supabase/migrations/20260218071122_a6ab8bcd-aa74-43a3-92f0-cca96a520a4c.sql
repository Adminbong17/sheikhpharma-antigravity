ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS uddoktapay_base_url text DEFAULT 'https://sandbox.uddoktapay.com',
ADD COLUMN IF NOT EXISTS uddoktapay_api_key text DEFAULT NULL;