
CREATE POLICY "Admins can insert vendor follows"
ON public.vendor_follows
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
