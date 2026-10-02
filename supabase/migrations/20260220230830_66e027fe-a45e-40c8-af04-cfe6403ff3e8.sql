
-- Allow vendors to insert their own invoices
CREATE POLICY "Vendors can insert own invoices"
ON public.invoices
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'vendor'::app_role)
  AND vendor_id IN (
    SELECT id FROM vendors WHERE user_id = auth.uid()
  )
);

-- Allow vendors to delete their own invoices
CREATE POLICY "Vendors can delete own invoices"
ON public.invoices
FOR DELETE
USING (
  has_role(auth.uid(), 'vendor'::app_role)
  AND vendor_id IN (
    SELECT id FROM vendors WHERE user_id = auth.uid()
  )
);
