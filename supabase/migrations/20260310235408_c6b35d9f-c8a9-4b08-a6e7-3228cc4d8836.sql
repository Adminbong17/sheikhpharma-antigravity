
CREATE TABLE public.password_reset_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  otp TEXT NOT NULL,
  user_id UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes'),
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Only service role should access this
CREATE POLICY "No direct client access to OTPs" ON public.password_reset_otps
  FOR ALL USING (false);

-- Auto-cleanup old OTPs
CREATE INDEX idx_password_reset_otps_phone ON public.password_reset_otps(phone, used, expires_at);
