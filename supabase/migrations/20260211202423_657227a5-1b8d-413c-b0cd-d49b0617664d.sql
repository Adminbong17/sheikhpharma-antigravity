
-- Add is_active column to products
ALTER TABLE public.products ADD COLUMN is_active boolean NOT NULL DEFAULT true;
