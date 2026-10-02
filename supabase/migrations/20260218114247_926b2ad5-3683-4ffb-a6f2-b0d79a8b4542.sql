ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS steadfast_consignment_id bigint,
  ADD COLUMN IF NOT EXISTS steadfast_tracking_code text,
  ADD COLUMN IF NOT EXISTS steadfast_status text;