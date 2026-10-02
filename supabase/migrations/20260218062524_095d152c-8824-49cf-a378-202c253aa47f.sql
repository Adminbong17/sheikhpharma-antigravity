
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cod',
ADD COLUMN IF NOT EXISTS transaction_id text;
