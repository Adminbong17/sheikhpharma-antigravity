
-- Make order_id and order_item_id nullable for fake/admin reviews
ALTER TABLE public.product_reviews
  ALTER COLUMN order_id DROP NOT NULL,
  ALTER COLUMN order_item_id DROP NOT NULL;
