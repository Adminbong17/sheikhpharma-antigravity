DROP POLICY "Vendors can insert brand requests" ON public.brand_requests;

CREATE POLICY "Vendors can insert brand requests"
ON public.brand_requests
FOR INSERT
WITH CHECK (
  (vendor_id IN (
    SELECT vendors.id FROM vendors
    WHERE vendors.user_id = auth.uid() AND vendors.status = 'approved'::text
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
);