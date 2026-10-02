
-- Add specification and delivery_time columns to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS specification text DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS delivery_time text DEFAULT NULL;
