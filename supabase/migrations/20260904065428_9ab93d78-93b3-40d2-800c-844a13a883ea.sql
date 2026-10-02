ALTER TABLE public.payment_link_otps
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;