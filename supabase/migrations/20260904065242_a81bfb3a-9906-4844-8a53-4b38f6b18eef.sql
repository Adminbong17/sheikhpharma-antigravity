ALTER TABLE public.payment_links
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS require_otp boolean NOT NULL DEFAULT false;

ALTER TABLE public.payment_link_payments
  ADD COLUMN IF NOT EXISTS custom_data jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.payment_link_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL,
  phone text NOT NULL,
  otp text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  attempts int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.payment_link_otps TO service_role;

ALTER TABLE public.payment_link_otps ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS payment_link_otps_lookup_idx
  ON public.payment_link_otps (phone, token, used);