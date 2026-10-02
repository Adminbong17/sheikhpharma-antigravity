CREATE TABLE IF NOT EXISTS public.signup_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  otp text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);

ALTER TABLE public.signup_otps ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_signup_otps_phone ON public.signup_otps(phone, used);