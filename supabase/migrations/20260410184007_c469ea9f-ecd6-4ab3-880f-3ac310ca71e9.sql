ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS uddoktapay_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS bkash_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS bkash_base_url text DEFAULT 'https://tokenized.sandbox.bka.sh/v2',
ADD COLUMN IF NOT EXISTS bkash_app_key text,
ADD COLUMN IF NOT EXISTS bkash_app_secret text,
ADD COLUMN IF NOT EXISTS bkash_username text,
ADD COLUMN IF NOT EXISTS bkash_password text;