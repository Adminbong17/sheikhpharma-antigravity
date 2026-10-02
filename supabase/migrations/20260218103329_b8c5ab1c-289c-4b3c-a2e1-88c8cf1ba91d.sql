
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS customer_address text,
  ADD COLUMN IF NOT EXISTS customer_division text,
  ADD COLUMN IF NOT EXISTS customer_zilla text,
  ADD COLUMN IF NOT EXISTS customer_upazilla text,
  ADD COLUMN IF NOT EXISTS order_notes text;
