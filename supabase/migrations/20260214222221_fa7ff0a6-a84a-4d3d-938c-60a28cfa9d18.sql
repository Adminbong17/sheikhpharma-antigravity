
-- Create product_variants table
CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,  -- e.g. "Size", "Color"
  variant_value TEXT NOT NULL, -- e.g. "XL", "Red"
  price_adjustment NUMERIC NOT NULL DEFAULT 0, -- +/- from base price
  stock INTEGER NOT NULL DEFAULT 0,
  sku TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Anyone can view variants
CREATE POLICY "Anyone can view product variants"
ON public.product_variants FOR SELECT
USING (true);

-- Admins can manage variants
CREATE POLICY "Admins can insert product variants"
ON public.product_variants FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update product variants"
ON public.product_variants FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete product variants"
ON public.product_variants FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Vendors can manage variants for their own products
CREATE POLICY "Vendors can insert own product variants"
ON public.product_variants FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'vendor'::app_role) AND 
  product_id IN (
    SELECT p.id FROM products p
    JOIN vendors v ON v.id = p.vendor_id
    WHERE v.user_id = auth.uid()
  )
);

CREATE POLICY "Vendors can update own product variants"
ON public.product_variants FOR UPDATE
USING (
  has_role(auth.uid(), 'vendor'::app_role) AND 
  product_id IN (
    SELECT p.id FROM products p
    JOIN vendors v ON v.id = p.vendor_id
    WHERE v.user_id = auth.uid()
  )
);

CREATE POLICY "Vendors can delete own product variants"
ON public.product_variants FOR DELETE
USING (
  has_role(auth.uid(), 'vendor'::app_role) AND 
  product_id IN (
    SELECT p.id FROM products p
    JOIN vendors v ON v.id = p.vendor_id
    WHERE v.user_id = auth.uid()
  )
);

-- Index for faster queries
CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);
