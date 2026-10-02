
CREATE POLICY "Vendors can view order items for their products"
ON public.order_items FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'vendor'::app_role)
  AND product_id IN (
    SELECT p.id FROM products p
    JOIN vendors v ON v.id = p.vendor_id
    WHERE v.user_id = auth.uid()
  )
);
