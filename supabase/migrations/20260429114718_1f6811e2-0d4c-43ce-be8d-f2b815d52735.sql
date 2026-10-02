-- Create login_otps table
CREATE TABLE IF NOT EXISTS public.login_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  otp TEXT NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast phone lookups
CREATE INDEX IF NOT EXISTS idx_login_otps_phone ON public.login_otps(phone);
CREATE INDEX IF NOT EXISTS idx_login_otps_phone_otp ON public.login_otps(phone, otp, used);

-- Enable RLS (no policies = only service_role can access)
ALTER TABLE public.login_otps ENABLE ROW LEVEL SECURITY;