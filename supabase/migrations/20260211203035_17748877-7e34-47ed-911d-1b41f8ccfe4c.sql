
CREATE POLICY "Admins can insert vendors"
ON public.vendors
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
