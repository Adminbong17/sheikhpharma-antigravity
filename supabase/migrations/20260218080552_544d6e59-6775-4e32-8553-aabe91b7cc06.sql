
-- Add vendor reply column to product_reviews
ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS vendor_reply text,
  ADD COLUMN IF NOT EXISTS vendor_replied_at timestamp with time zone;

-- Policy: Vendors can update (reply to) reviews on their own products
CREATE POLICY "Vendors can reply to reviews on own products"
  ON public.product_reviews FOR UPDATE
  USING (
    has_role(auth.uid(), 'vendor'::app_role) AND
    product_id IN (
      SELECT p.id FROM products p
      JOIN vendors v ON v.id = p.vendor_id
      WHERE v.user_id = auth.uid()
    )
  );

-- Admins can also update reviews
CREATE POLICY "Admins can update reviews"
  ON public.product_reviews FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
