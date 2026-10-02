
-- Add order_number sequence column to orders
CREATE SEQUENCE IF NOT EXISTS orders_order_number_seq START 1;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number bigint DEFAULT nextval('orders_order_number_seq');

-- Backfill existing orders with sequential numbers
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM public.orders
  WHERE order_number IS NULL
)
UPDATE public.orders o
SET order_number = r.rn
FROM ranked r
WHERE o.id = r.id;

-- Make it NOT NULL and unique going forward
ALTER TABLE public.orders ALTER COLUMN order_number SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN order_number SET DEFAULT nextval('orders_order_number_seq');
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_idx ON public.orders(order_number);
