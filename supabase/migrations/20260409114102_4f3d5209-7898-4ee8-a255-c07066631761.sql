
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS delivery_time text,
  ADD COLUMN IF NOT EXISTS specification text,
  ADD COLUMN IF NOT EXISTS generic_name text,
  ADD COLUMN IF NOT EXISTS requires_prescription boolean DEFAULT false;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_name text;
