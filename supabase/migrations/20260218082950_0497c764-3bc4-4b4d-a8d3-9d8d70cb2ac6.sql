
-- Allow admins to insert reviews directly (for fake/boost reviews)
CREATE POLICY "Admins can insert reviews"
  ON public.product_reviews FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
