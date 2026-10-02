
ALTER TABLE public.products ADD COLUMN is_preorder boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN preorder_count integer NOT NULL DEFAULT 0;
